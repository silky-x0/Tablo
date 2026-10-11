// SQLite persistence via @capacitor-community/sqlite.
// Native Android: real on-device SQLite. Web preview: the same plugin backed by
// jeep-sqlite (sql.js WASM saved to IndexedDB). Browser-only: call from effects/handlers.
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";

const DB_NAME = "goachoice";
export const RETENTION_DAYS = 180;
export const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, price REAL NOT NULL,
  category TEXT NOT NULL, photo TEXT, sort INTEGER NOT NULL DEFAULT 0);
DROP INDEX IF EXISTS idx_products_category;
CREATE INDEX IF NOT EXISTS idx_products_category_sort ON products(category, sort, name);
CREATE INDEX IF NOT EXISTS idx_products_sort ON products(sort);
CREATE TABLE IF NOT EXISTS active_items (
  table_id INTEGER NOT NULL, product_id TEXT NOT NULL, name TEXT NOT NULL,
  price REAL NOT NULL, qty INTEGER NOT NULL, opened_at INTEGER NOT NULL,
  PRIMARY KEY (table_id, product_id));
CREATE INDEX IF NOT EXISTS idx_active_table ON active_items(table_id);
CREATE TABLE IF NOT EXISTS table_aliases (
  table_id INTEGER PRIMARY KEY NOT NULL, alias TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY NOT NULL, table_id INTEGER NOT NULL, table_alias TEXT, total REAL NOT NULL, settled_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_bills_settled ON bills(settled_at);
CREATE TABLE IF NOT EXISTS bill_items (
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE, product_id TEXT NOT NULL,
  name TEXT NOT NULL, price REAL NOT NULL, qty INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_product ON bill_items(product_id);
`;

let conn: Promise<SQLiteDBConnection> | null = null;
let isWeb = true;

async function open(): Promise<SQLiteDBConnection> {
  const { Capacitor } = await import("@capacitor/core");
  const { CapacitorSQLite, SQLiteConnection } = await import("@capacitor-community/sqlite");
  isWeb = Capacitor.getPlatform() === "web";
  const sqlite = new SQLiteConnection(CapacitorSQLite);
  if (isWeb) {
    const { defineCustomElements } = await import("jeep-sqlite/loader");
    await defineCustomElements(window);
    if (!document.querySelector("jeep-sqlite")) {
      const el = document.createElement("jeep-sqlite");
      el.setAttribute("autoSave", "true");
      document.body.appendChild(el);
    }
    await customElements.whenDefined("jeep-sqlite");
    await sqlite.initWebStore();
  }
  const exists = (await sqlite.isConnection(DB_NAME, false)).result;
  const db = exists
    ? await sqlite.retrieveConnection(DB_NAME, false)
    : await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
  await db.open();
  await db.execute("PRAGMA foreign_keys = ON;", false);
  await db.execute(SCHEMA, true);
  try {
    await db.execute("ALTER TABLE bills ADD COLUMN table_alias TEXT;", false);
  } catch {
    // Column already exists on upgraded databases
  }
  return db;
}

export function getDb() {
  conn ??= open().catch((e) => {
    conn = null;
    throw e;
  });
  return conn;
}

// Serialize every statement on the single connection. Without this,
// fire-and-forget writes (rapid taps) interleave on jeep-sqlite / native
// and last-write-wins lands out of order ("database is locked" / stale qty).
let tail: Promise<void> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = tail.then(fn, fn);
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function query<T>(sql: string, values: unknown[] = []): Promise<T[]> {
  return enqueue(async () => {
    const db = await getDb();
    return ((await db.query(sql, values as any[])).values ?? []) as T[];
  });
}

/** Run several statements atomically, then persist (web store needs explicit save). */
export async function tx(stmts: { statement: string; values?: unknown[] }[]) {
  return enqueue(async () => {
    const db = await getDb();
    // Retry SQL and web-persist independently: a committed-but-unsaved batch
    // must not re-run (duplicate PK on bills / doubled bill_items), while a
    // rolled-back batch is safe to replay. Bounded: <0.5s stall worst case.
    await withRetry(() =>
      db.executeSet(
        stmts.map((s) => ({ statement: s.statement, values: (s.values ?? []) as any[] })),
        true,
      ),
    );
    if (isWeb) {
      const { CapacitorSQLite } = await import("@capacitor-community/sqlite");
      await withRetry(() => CapacitorSQLite.saveToStore({ database: DB_NAME }));
    }
  });
}

/** Transient SQLite/IndexedDB hiccups ("database is locked") usually clear in ms. */
async function withRetry<T>(fn: () => Promise<T>, tries = 3, delaysMs: number[] = [50, 200]): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const wait = delaysMs[attempt];
      if (wait == null) break;
      console.error(`SQLite write attempt ${attempt + 1} failed, retrying in ${wait}ms`, e);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}

/** 180-day (~6 months) retention: one indexed range delete; bill_items cascade. */
export const retentionStmt = (now = Date.now()) => ({
  statement: "DELETE FROM bills WHERE settled_at < ?",
  values: [now - RETENTION_MS],
});
