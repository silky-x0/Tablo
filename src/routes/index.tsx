import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Pencil, Plus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { actions, inr, totalOf, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tables — Goa Choice Cafe" },
      { name: "description", content: "Live table status and active orders at Goa Choice cafe." },
      { property: "og:title", content: "Tables — Goa Choice Cafe" },
      { property: "og:description", content: "Live table status and active orders at Goa Choice cafe." },
    ],
  }),
  component: Tables,
});

function Tables() {
  const count = useStore((s) => s.tableCount);
  const orders = useStore((s) => s.orders);
  const aliases = useStore((s) => s.tableAliases);
  const busy = Object.keys(orders).length;

  const [editingTable, setEditingTable] = useState<{ table: number; alias: string } | null>(null);

  return (
    <AppShell
      title="Tables"
      action={
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button
            aria-label="Remove table"
            onClick={() => actions.setTableCount(count - 1)}
            className="rounded-full p-2 hover:bg-muted"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-sm font-semibold">{count}</span>
          <button
            aria-label="Add table"
            onClick={() => actions.setTableCount(count + 1)}
            className="rounded-full p-2 hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">
        {busy} occupied · {Math.max(0, count - busy)} free
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: count }, (_, i) => i + 1).map((t) => {
          const o = orders[t];
          const alias = aliases[t];
          const qty = o ? o.items.reduce((a, i) => a + i.qty, 0) : 0;

          return (
            <Link
              key={t}
              to="/table/$id"
              params={{ id: String(t) }}
              className={`flex aspect-[4/3] flex-col justify-between rounded-2xl border p-4 transition active:scale-95 ${
                o
                  ? "border-primary bg-primary text-primary-foreground shadow-lg"
                  : "border-border bg-card text-card-foreground"
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-3xl">T{t}</span>
                  </div>
                  {alias ? (
                    <div className="truncate text-xs font-semibold opacity-90" title={alias}>
                      {alias}
                    </div>
                  ) : (
                    <div className="text-[11px] opacity-60">Table {t}</div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title={alias ? `Change alias (${alias})` : `Add alias to Table ${t}`}
                    aria-label={`Edit alias for Table ${t}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingTable({ table: t, alias: alias ?? "" });
                    }}
                    className={`rounded-full p-1.5 transition ${
                      o
                        ? "text-primary-foreground/70 hover:bg-primary-foreground/20 hover:text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      o ? "bg-primary-foreground/20" : "bg-accent text-accent-foreground"
                    }`}
                  >
                    {o ? "Occupied" : "Free"}
                  </span>
                </div>
              </div>

              {o ? (
                <div>
                  <div className="text-lg font-semibold">{inr(totalOf(o.items))}</div>
                  <div className="text-xs opacity-80">
                    {qty} items · since{" "}
                    {new Date(o.openedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Tap to start order</div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Table Alias Editor Modal */}
      {editingTable && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-foreground/40 sm:items-center"
          onClick={() => setEditingTable(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              actions.setTableAlias(editingTable.table, editingTable.alias);
              setEditingTable(null);
            }}
            className="w-full space-y-4 rounded-t-3xl bg-card p-5 sm:max-w-sm sm:rounded-3xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl">Table {editingTable.table}</h2>
                <p className="text-xs text-muted-foreground">
                  Set alias (e.g. Rahul, Sharma Ji, Corner Booth)
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setEditingTable(null)}
                className="rounded-full p-2 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              autoFocus
              className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Rahul, VIP Booth, Sharma Ji"
              value={editingTable.alias}
              onChange={(e) => setEditingTable({ ...editingTable, alias: e.target.value })}
            />

            <div className="flex gap-2">
              {editingTable.alias.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    actions.setTableAlias(editingTable.table, "");
                    setEditingTable(null);
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
