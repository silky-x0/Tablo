import { useEffect, useState, useSyncExternalStore } from "react";
import { query, retentionStmt, tx, RETENTION_MS } from "./db";

export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  photo?: string | undefined;
};
export type OrderItem = { productId: string; name: string; price: number; qty: number };
export type ActiveOrder = { items: OrderItem[]; openedAt: number };
export type Bill = {
  id: string;
  tableId: number;
  tableAlias?: string | undefined;
  items: OrderItem[];
  total: number;
  settledAt: number;
};
// Live UI state is held in memory and written through to SQLite.
// Settled bills are not kept in memory; reports query SQLite directly.
export type State = {
  ready: boolean;
  error?: string | undefined;
  tableCount: number;
  tableAliases: Record<number, string>;
  products: Product[];
  orders: Record<number, ActiveOrder>;
};

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const seedProducts: Product[] = [
  { id: "p1", name: "Masala Chai", price: 40, category: "Beverages" },
  { id: "p2", name: "Cold Coffee", price: 120, category: "Beverages" },
  { id: "p3", name: "Fresh Lime Soda", price: 80, category: "Beverages" },
  { id: "p4", name: "Prawn Rava Fry", price: 320, category: "Mains" },
  { id: "p5", name: "Fish Curry Rice", price: 280, category: "Mains" },
  { id: "p6", name: "Chicken Cafreal", price: 300, category: "Mains" },
  { id: "p7", name: "Bebinca", price: 150, category: "Desserts" },
  { id: "p8", name: "Poi Bhaji", price: 90, category: "Snacks" },
];

const initial: State = { ready: false, tableCount: 8, tableAliases: {}, products: [], orders: {} };

export function pruneOld(bills: Bill[], now = Date.now()) {
  return bills.filter((b) => now - b.settledAt < RETENTION_MS);
}

let state: State = initial;
let started = false;
let version = 0;
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  version++;
  listeners.forEach((l) => l());
}

function persist(stmts: { statement: string; values?: unknown[] }[]) {
  tx(stmts).then(
    () => {
      // Clear a transient write error once a later write lands.
      if (state.error?.startsWith("Could not save")) emit({ ...state, error: undefined });
    },
    (e) => {
      console.error(e);
      // No alert(): blocking dialogs lose taps on a busy counter.
      // Surface via state so UI can toast, and keep in-memory truth;
      // next successful write converges SQLite.
      emit({ ...state, error: "Could not save to device storage: " + (e?.message ?? String(e)) });
    },
  );
}

async function boot() {
  try {
    const seeded = await query<{ value: string }>("SELECT value FROM settings WHERE key='seeded'");
    if (!seeded.length) {
      await tx([
        ...seedProducts.map((p, i) => ({
          statement:
            "INSERT OR IGNORE INTO products (id,name,price,category,sort) VALUES (?,?,?,?,?)",
          values: [p.id, p.name, p.price, p.category, i],
        })),
        {
          statement:
            "INSERT OR REPLACE INTO settings (key,value) VALUES ('seeded','1'),('tableCount','8')",
        },
      ]);
    }
    await tx([retentionStmt()]);
    // Sequential: single SQLite connection, no concurrent query() interleave.
    const products = await query<{
      id: string;
      name: string;
      price: number;
      category: string;
      photo: string | null;
    }>("SELECT id,name,price,category,photo FROM products ORDER BY category, sort, name");
    const items = await query<{
      table_id: number;
      product_id: string;
      name: string;
      price: number;
      qty: number;
      opened_at: number;
    }>(
      "SELECT table_id,product_id,name,price,qty,opened_at FROM active_items ORDER BY table_id, rowid",
    );
    const tc = await query<{ value: string }>("SELECT value FROM settings WHERE key='tableCount'");
    const parsed = Number(tc[0]?.value ?? 8);
    const tableCount = Number.isFinite(parsed) ? Math.max(1, Math.min(60, Math.round(parsed))) : 8;
    const aliasesRows = await query<{ table_id: number; alias: string }>(
      "SELECT table_id, alias FROM table_aliases ORDER BY table_id",
    );
    const tableAliases: Record<number, string> = {};
    for (const a of aliasesRows) {
      if (a.table_id >= 1 && a.table_id <= tableCount && a.alias?.trim()) {
        tableAliases[a.table_id] = a.alias.trim();
      }
    }
    const orders: Record<number, ActiveOrder> = {};
    for (const r of items) {
      // Drop rows for tables hidden by a shrink (old installs pre-prune).
      if (r.table_id < 1 || r.table_id > tableCount) continue;
      const o = (orders[r.table_id] ??= { items: [], openedAt: r.opened_at });
      o.items.push({ productId: r.product_id, name: r.name, price: r.price, qty: r.qty });
    }
    if (items.some((r) => r.table_id < 1 || r.table_id > tableCount)) {
      await tx([{ statement: "DELETE FROM active_items WHERE table_id < 1 OR table_id > ?", values: [tableCount] }]);
    }
    emit({
      ready: true,
      tableCount,
      tableAliases,
      products: products.map((p) => ({ ...p, photo: p.photo ?? undefined })),
      orders,
    });
  } catch (e: any) {
    console.error(e);
    emit({ ...state, ready: true, error: e?.message ?? String(e) });
  }
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  if (!started && typeof window !== "undefined") {
    started = true;
    void boot();
  }
  return () => listeners.delete(l);
};

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => sel(state),
    () => sel(initial),
  );
}

/** Store version, bumps on every change — lets report queries refresh. */
export const useVersion = () =>
  useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );

export const totalOf = (items: OrderItem[]) =>
  Math.round(items.reduce((t, i) => t + i.price * i.qty, 0) * 100) / 100;
export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export const actions = {
  setTableCount: (n: number) => {
    const v = Math.max(1, Math.min(60, n));
    // Prune hidden tables or their orders resurrect when count grows again.
    const orders = { ...state.orders };
    const tableAliases = { ...state.tableAliases };
    for (const k of Object.keys(orders)) if (Number(k) > v) delete orders[Number(k)];
    for (const k of Object.keys(tableAliases)) if (Number(k) > v) delete tableAliases[Number(k)];
    emit({ ...state, tableCount: v, orders, tableAliases });
    persist([
      {
        statement: "INSERT OR REPLACE INTO settings (key,value) VALUES ('tableCount',?)",
        values: [String(v)],
      },
      { statement: "DELETE FROM active_items WHERE table_id > ?", values: [v] },
      { statement: "DELETE FROM table_aliases WHERE table_id > ?", values: [v] },
    ]);
  },
  setTableAlias: (table: number, alias: string) => {
    const trimmed = alias.trim();
    const tableAliases = { ...state.tableAliases };
    if (trimmed) {
      tableAliases[table] = trimmed;
    } else {
      delete tableAliases[table];
    }
    emit({ ...state, tableAliases });
    persist([
      trimmed
        ? {
            statement:
              "INSERT INTO table_aliases (table_id, alias) VALUES (?, ?) " +
              "ON CONFLICT(table_id) DO UPDATE SET alias=excluded.alias",
            values: [table, trimmed],
          }
        : {
            statement: "DELETE FROM table_aliases WHERE table_id = ?",
            values: [table],
          },
    ]);
  },
  saveProduct: (p: Omit<Product, "id"> & { id?: string | undefined }) => {
    const id = p.id ?? uid();
    const prod: Product = {
      id,
      name: p.name,
      price: p.price,
      category: p.category,
      photo: p.photo,
    };
    const orders = { ...state.orders };
    if (p.id) {
      for (const [t, o] of Object.entries(orders)) {
        if (!o.items.some((i) => i.productId === id)) continue;
        orders[Number(t)] = {
          ...o,
          items: o.items.map((i) =>
            i.productId === id ? { ...i, name: prod.name, price: prod.price } : i,
          ),
        };
      }
    }
    emit({
      ...state,
      orders,
      products: p.id
        ? state.products.map((x) => (x.id === id ? prod : x))
        : [...state.products, prod],
    });
    persist([
      {
        statement:
          "INSERT INTO products (id,name,price,category,photo,sort) VALUES (?,?,?,?,?,(SELECT COALESCE(MAX(sort),0)+1 FROM products)) " +
          "ON CONFLICT(id) DO UPDATE SET name=excluded.name, price=excluded.price, category=excluded.category, photo=excluded.photo",
        values: [id, prod.name, prod.price, prod.category, prod.photo ?? null],
      },
      // Keep live orders on the latest name/price instead of a stale snapshot.
      ...(p.id
        ? [
            {
              statement: "UPDATE active_items SET name=?, price=? WHERE product_id=?",
              values: [prod.name, prod.price, id],
            },
          ]
        : []),
    ]);
  },
  deleteProduct: (id: string) => {
    const orders = { ...state.orders };
    for (const [t, o] of Object.entries(orders)) {
      const items = o.items.filter((i) => i.productId !== id);
      if (items.length) orders[Number(t)] = { ...o, items };
      else delete orders[Number(t)];
    }
    emit({ ...state, products: state.products.filter((p) => p.id !== id), orders });
    persist([
      { statement: "DELETE FROM products WHERE id=?", values: [id] },
      { statement: "DELETE FROM active_items WHERE product_id=?", values: [id] },
    ]);
  },
  addItem: (table: number, p: Product, delta = 1) => {
    const cur = state.orders[table] ?? { items: [], openedAt: Date.now() };
    const ex = cur.items.find((i) => i.productId === p.id);
    if (!ex && delta <= 0) return;
    const qty = (ex?.qty ?? 0) + delta;
    // Always write the latest name/price so post-edit taps don't freeze stale values.
    const items = (
      ex
        ? cur.items.map((i) =>
            i.productId === p.id ? { ...i, name: p.name, price: p.price, qty } : i,
          )
        : [...cur.items, { productId: p.id, name: p.name, price: p.price, qty }]
    ).filter((i) => i.qty > 0);
    const orders = { ...state.orders };
    if (items.length) orders[table] = { ...cur, items };
    else delete orders[table];
    emit({ ...state, orders });
    persist([
      qty > 0
        ? {
            statement:
              "INSERT INTO active_items (table_id,product_id,name,price,qty,opened_at) VALUES (?,?,?,?,?,?) " +
              "ON CONFLICT(table_id,product_id) DO UPDATE SET qty=excluded.qty, name=excluded.name, price=excluded.price",
            values: [table, p.id, p.name, p.price, qty, cur.openedAt],
          }
        : {
            statement: "DELETE FROM active_items WHERE table_id=? AND product_id=?",
            values: [table, p.id],
          },
    ]);
  },
  clearTable: (table: number) => {
    const orders = { ...state.orders };
    delete orders[table];
    emit({ ...state, orders });
    persist([{ statement: "DELETE FROM active_items WHERE table_id=?", values: [table] }]);
  },
  settle: (table: number) => {
    const o = state.orders[table];
    if (!o) return;
    const orders = { ...state.orders };
    delete orders[table];
    const id = uid();
    const now = Date.now();
    const tableAlias = state.tableAliases[table] ?? null;
    emit({ ...state, orders });
    persist([
      {
        statement: "INSERT INTO bills (id,table_id,table_alias,total,settled_at) VALUES (?,?,?,?,?)",
        values: [id, table, tableAlias, totalOf(o.items), now],
      },
      ...o.items.map((i) => ({
        statement: "INSERT INTO bill_items (bill_id,product_id,name,price,qty) VALUES (?,?,?,?,?)",
        values: [id, i.productId, i.name, i.price, i.qty],
      })),
      { statement: "DELETE FROM active_items WHERE table_id=?", values: [table] },
      retentionStmt(now),
    ]);
  },
};

export type DaySummary = {
  revenue: number;
  orders: number;
  bills: { id: string; tableId: number; tableAlias?: string | undefined; total: number; settledAt: number }[];
  items: { productId: string; name: string; qty: number; revenue: number }[];
};

export function dayRange(day: Date) {
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  end.setDate(end.getDate() + 1);
  return [start.getTime(), end.getTime()] as const;
}

/** Aggregates computed in SQLite using the settled_at index. */
export async function fetchDaySummary(day: Date): Promise<DaySummary> {
  const [start, end] = dayRange(day);
  // Sequential on the single connection (see db.ts queue).
  const bills = await query<{
    id: string;
    table_id: number;
    table_alias: string | null;
    total: number;
    settled_at: number;
  }>(
    "SELECT id,table_id,table_alias,total,settled_at FROM bills WHERE settled_at >= ? AND settled_at < ? ORDER BY settled_at DESC",
    [start, end],
  );
  // GROUP BY product_id: same name on two products must not merge, renames stay separate per id.
  const items = await query<{
    product_id: string;
    name: string;
    qty: number | string;
    revenue: number | string;
  }>(
    "SELECT bi.product_id AS product_id, MAX(bi.name) AS name, SUM(bi.qty) AS qty, SUM(bi.qty*bi.price) AS revenue FROM bills b " +
      "JOIN bill_items bi ON bi.bill_id=b.id WHERE b.settled_at >= ? AND b.settled_at < ? " +
      "GROUP BY bi.product_id ORDER BY revenue DESC",
    [start, end],
  );
  return {
    revenue: Math.round(bills.reduce((t, b) => t + Number(b.total), 0) * 100) / 100,
    orders: bills.length,
    bills: bills.map((b) => ({
      id: b.id,
      tableId: b.table_id,
      tableAlias: b.table_alias ?? undefined,
      total: Number(b.total),
      settledAt: b.settled_at,
    })),
    items: items.map((i) => ({
      productId: i.product_id,
      name: i.name,
      qty: Number(i.qty),
      revenue: Number(i.revenue),
    })),
  };
}

export function useDaySummary(day: Date) {
  const v = useVersion();
  const [data, setData] = useState<DaySummary | null>(null);
  const key = dayRange(day)[0];
  useEffect(() => {
    let live = true;
    fetchDaySummary(new Date(key))
      .then((d) => live && setData(d))
      .catch((e) => console.error(e));
    return () => {
      live = false;
    };
  }, [key, v]);
  return data;
}

export type MonthSummary = {
  year: number;
  month: number;
  revenue: number;
  orders: number;
  items: { productId: string; name: string; qty: number; revenue: number }[];
};

export type ItemComparison = {
  productId: string;
  name: string;
  currentQty: number;
  currentRevenue: number;
  prevQty: number;
  prevRevenue: number;
  qtyDiff: number;
  revenueDiff: number;
  revenuePercentChange: number | null;
};

export type MonthComparison = {
  currentMonth: Date;
  previousMonth: Date;
  current: MonthSummary;
  previous: MonthSummary;
  revenueDiff: number;
  revenuePercentChange: number | null;
  ordersDiff: number;
  ordersPercentChange: number | null;
  avgBillCurrent: number;
  avgBillPrevious: number;
  avgBillDiff: number;
  items: ItemComparison[];
};

export function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
  return [start.getTime(), end.getTime()] as const;
}

export async function fetchMonthSummary(date: Date): Promise<MonthSummary> {
  const [start, end] = monthRange(date);
  const bills = await query<{ total: number }>(
    "SELECT total FROM bills WHERE settled_at >= ? AND settled_at < ?",
    [start, end],
  );
  const items = await query<{
    product_id: string;
    name: string;
    qty: number | string;
    revenue: number | string;
  }>(
    "SELECT bi.product_id AS product_id, MAX(bi.name) AS name, SUM(bi.qty) AS qty, SUM(bi.qty*bi.price) AS revenue FROM bills b " +
      "JOIN bill_items bi ON bi.bill_id=b.id WHERE b.settled_at >= ? AND b.settled_at < ? " +
      "GROUP BY bi.product_id ORDER BY revenue DESC",
    [start, end],
  );
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    revenue: Math.round(bills.reduce((t, b) => t + Number(b.total), 0) * 100) / 100,
    orders: bills.length,
    items: items.map((i) => ({
      productId: i.product_id,
      name: i.name,
      qty: Number(i.qty),
      revenue: Number(i.revenue),
    })),
  };
}

export function calcMonthComparison(
  current: MonthSummary,
  previous: MonthSummary,
  currentMonthDate: Date,
  prevMonthDate: Date,
): MonthComparison {
  const revenueDiff = Math.round((current.revenue - previous.revenue) * 100) / 100;
  const revenuePercentChange =
    previous.revenue > 0
      ? Math.round(((current.revenue - previous.revenue) / previous.revenue) * 1000) / 10
      : null;

  const ordersDiff = current.orders - previous.orders;
  const ordersPercentChange =
    previous.orders > 0
      ? Math.round(((current.orders - previous.orders) / previous.orders) * 1000) / 10
      : null;

  const avgBillCurrent = current.orders ? Math.round(current.revenue / current.orders) : 0;
  const avgBillPrevious = previous.orders ? Math.round(previous.revenue / previous.orders) : 0;
  const avgBillDiff = avgBillCurrent - avgBillPrevious;

  const prevItemsMap = new Map(previous.items.map((i) => [i.productId, i]));
  const allProductIds = new Set([
    ...current.items.map((i) => i.productId),
    ...previous.items.map((i) => i.productId),
  ]);

  const items: ItemComparison[] = [];
  for (const pid of allProductIds) {
    const cur = current.items.find((i) => i.productId === pid);
    const prev = prevItemsMap.get(pid);
    const name = cur?.name ?? prev?.name ?? "Item";
    const curQty = cur?.qty ?? 0;
    const curRev = cur?.revenue ?? 0;
    const prevQty = prev?.qty ?? 0;
    const prevRev = prev?.revenue ?? 0;
    const revDiff = Math.round((curRev - prevRev) * 100) / 100;
    const pctChange =
      prevRev > 0 ? Math.round(((curRev - prevRev) / prevRev) * 1000) / 10 : null;

    items.push({
      productId: pid,
      name,
      currentQty: curQty,
      currentRevenue: curRev,
      prevQty,
      prevRevenue: prevRev,
      qtyDiff: curQty - prevQty,
      revenueDiff: revDiff,
      revenuePercentChange: pctChange,
    });
  }

  items.sort((a, b) => b.currentRevenue - a.currentRevenue || b.prevRevenue - a.prevRevenue);

  return {
    currentMonth: currentMonthDate,
    previousMonth: prevMonthDate,
    current,
    previous,
    revenueDiff,
    revenuePercentChange,
    ordersDiff,
    ordersPercentChange,
    avgBillCurrent,
    avgBillPrevious,
    avgBillDiff,
    items,
  };
}

export async function fetchMonthComparison(date: Date): Promise<MonthComparison> {
  const curMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const prevMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const current = await fetchMonthSummary(curMonth);
  const previous = await fetchMonthSummary(prevMonth);
  return calcMonthComparison(current, previous, curMonth, prevMonth);
}

export function useMonthComparison(date: Date) {
  const v = useVersion();
  const [data, setData] = useState<MonthComparison | null>(null);
  const key = `${date.getFullYear()}-${date.getMonth()}`;
  useEffect(() => {
    let live = true;
    fetchMonthComparison(new Date(date.getFullYear(), date.getMonth(), 1))
      .then((d) => live && setData(d))
      .catch((e) => console.error(e));
    return () => {
      live = false;
    };
  }, [key, v]);
  return data;
}

export async function fileToPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((r, j) => ((img.onload = r), (img.onerror = j), (img.src = url)));
    const max = 320;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    // Round: fractional canvas dims truncate and skew aspect by 1px.
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.75);
  } finally {
    URL.revokeObjectURL(url);
  }
}
