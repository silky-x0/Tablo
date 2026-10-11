import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { actions, inr, totalOf, useStore } from "@/lib/store";

export const Route = createFileRoute("/table/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Table ${params.id} — Tablo` },
      { name: "description", content: `Take and settle the order for table ${params.id}.` },
      { property: "og:title", content: `Table ${params.id} — Tablo` },
      { property: "og:description", content: `Take and settle the order for table ${params.id}.` },
    ],
  }),
  component: TablePage,
});

function TablePage() {
  const table = Number(Route.useParams().id);
  const nav = useNavigate();
  const tableCount = useStore((s) => s.tableCount);
  const alias = useStore((s) => s.tableAliases[table]);
  const products = useStore((s) => s.products);
  const order = useStore((s) => s.orders[table]);

  const [editingAlias, setEditingAlias] = useState(false);
  const [aliasDraft, setAliasDraft] = useState("");

  const [cat, setCat] = useState("All");
  const cats = useMemo(() => ["All", ...new Set(products.map((p) => p.category))], [products]);
  // Category can vanish while selected (product edit); fall back instead of empty grid.
  const safeCat = cats.includes(cat) ? cat : "All";
  const shown = safeCat === "All" ? products : products.filter((p) => p.category === safeCat);
  const items = order?.items ?? [];
  const total = totalOf(items);

  if (!Number.isInteger(table) || table < 1) {
    return (
      <AppShell title="Table">
        <p className="py-10 text-center text-sm text-muted-foreground">
          Invalid table.{" "}
          <Link to="/" className="font-medium text-primary">
            Back to tables
          </Link>
        </p>
      </AppShell>
    );
  }
  if (Number.isFinite(tableCount) && table > tableCount) {
    return (
      <AppShell title={`Table ${table}`}>
        <p className="py-10 text-center text-sm text-muted-foreground">
          Table {table} is outside the current table count ({tableCount}).{" "}
          <Link to="/" className="font-medium text-primary">
            Back to tables
          </Link>
        </p>
      </AppShell>
    );
  }

  const title = alias ? `Table ${table} · ${alias}` : `Table ${table}`;

  return (
    <AppShell
      title={title}
      action={
        <button
          type="button"
          onClick={() => {
            setAliasDraft(alias ?? "");
            setEditingAlias(true);
          }}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
          <span>{alias ? "Edit alias" : "Add alias"}</span>
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                aria-pressed={safeCat === c}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${safeCat === c ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((p) => {
              const q = items.find((i) => i.productId === p.id)?.qty ?? 0;
              return (
                <button
                  key={p.id}
                  onClick={() => actions.addItem(table, p)}
                  className="relative overflow-hidden rounded-2xl border border-border bg-card text-left active:scale-95"
                >
                  <div className="aspect-[4/3] bg-muted">
                    {p.photo ? (
                      <img src={p.photo} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center font-display text-3xl text-muted-foreground">
                        {p.name[0]}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="text-sm text-primary">{inr(p.price)}</div>
                  </div>
                  {q > 0 && (
                    <span className="absolute right-2 top-2 grid h-7 min-w-7 place-items-center rounded-full bg-primary px-2 text-sm font-bold text-primary-foreground">
                      {q}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="h-fit rounded-2xl border border-border bg-card p-4 md:sticky md:top-24">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl">Order</h2>
            {alias && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                {alias}
              </span>
            )}
          </div>
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Tap items to add them.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((i) => {
                const p = products.find((x) => x.id === i.productId) ?? {
                  id: i.productId,
                  name: i.name,
                  price: i.price,
                  category: "",
                };
                return (
                  <li key={i.productId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{i.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {inr(i.price)} × {i.qty} = {inr(i.price * i.qty)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        aria-label="Less"
                        onClick={() => actions.addItem(table, p, -1)}
                        className="rounded-full bg-muted p-2"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm">{i.qty}</span>
                      <button
                        aria-label="More"
                        onClick={() => actions.addItem(table, p, 1)}
                        className="rounded-full bg-muted p-2"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-muted-foreground">Total</span>
            <span className="font-display text-3xl">{inr(total)}</span>
          </div>
          <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
            <button
              disabled={!items.length}
              aria-label="Clear order"
              onClick={() => confirm("Clear this table's order?") && actions.clearTable(table)}
              className="rounded-xl border border-border p-3 text-destructive disabled:opacity-40"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              disabled={!items.length}
              onClick={() => {
                const label = alias ? `Table ${table} (${alias})` : `table ${table}`;
                if (confirm(`Settle bill of ${inr(total)} for ${label}?`)) {
                  actions.settle(table);
                  nav({ to: "/" });
                }
              }}
              className="rounded-xl bg-primary p-3 font-semibold text-primary-foreground disabled:opacity-40"
            >
              Settle bill
            </button>
          </div>
        </aside>
      </div>

      {/* Table Alias Editor Modal */}
      {editingAlias && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-foreground/40 sm:items-center"
          onClick={() => setEditingAlias(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              actions.setTableAlias(table, aliasDraft);
              setEditingAlias(false);
            }}
            className="w-full space-y-4 rounded-t-3xl bg-card p-5 sm:max-w-sm sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl">Table {table}</h2>
                <p className="text-xs text-muted-foreground">
                  Set alias (e.g. Rahul, Sharma Ji, Window Booth)
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setEditingAlias(false)}
                className="rounded-full p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              autoFocus
              className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Rahul, VIP Booth, Sharma Ji"
              value={aliasDraft}
              onChange={(e) => setAliasDraft(e.target.value)}
            />

            <div className="flex gap-2">
              {aliasDraft.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    actions.setTableAlias(table, "");
                    setEditingAlias(false);
                  }}
                  className="flex-1 rounded-xl border border-border p-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Clear alias
                </button>
              )}
              <button
                type="submit"
                className="flex-1 rounded-xl bg-primary p-3 text-sm font-semibold text-primary-foreground"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
