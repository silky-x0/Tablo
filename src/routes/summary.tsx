import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar,
  Layers,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  inr,
  useDaySummary,
  useMonthComparison,
  type ItemComparison,
} from "@/lib/store";

export const Route = createFileRoute("/summary")({
  head: () => ({
    meta: [
      { title: "Sales Summary & Reports — Goa Choice Cafe" },
      {
        name: "description",
        content: "Daily and monthly sales reports, revenue trends, and month-over-month comparison.",
      },
      { property: "og:title", content: "Sales Summary & Reports — Goa Choice Cafe" },
      {
        property: "og:description",
        content: "Daily and monthly sales reports, revenue trends, and month-over-month comparison.",
      },
    ],
  }),
  component: Summary,
});

function Summary() {
  const [viewMode, setViewMode] = useState<"day" | "month">("month");
  const [dayOffset, setDayOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  // Calendar-day anchor (up to 180 days / ~6 months back)
  const day = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - dayOffset);
    return d;
  }, [dayOffset]);

  // Calendar-month anchor (up to 5 months back, giving 6 months comparison window)
  const monthDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - monthOffset);
    return d;
  }, [monthOffset]);

  const dailyData = useDaySummary(day) ?? { revenue: 0, orders: 0, bills: [], items: [] };
  const monthComp = useMonthComparison(monthDate);

  const dayLabel =
    dayOffset === 0
      ? "Today"
      : dayOffset === 1
        ? "Yesterday"
        : day.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

  const currentMonthLabel = monthDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const prevMonthDate = useMemo(() => {
    const d = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1);
    return d;
  }, [monthDate]);

  const prevMonthLabel = prevMonthDate.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    <AppShell
      title="Sales & Reports"
      action={
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
          {viewMode === "day" ? (
            <>
              <button
                aria-label="Previous day"
                disabled={dayOffset >= 180}
                onClick={() => setDayOffset(dayOffset + 1)}
                className="rounded-full p-2 transition-colors hover:bg-muted disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-28 text-center text-xs font-semibold sm:text-sm">{dayLabel}</span>
              <button
                aria-label="Next day"
                disabled={dayOffset === 0}
                onClick={() => setDayOffset(dayOffset - 1)}
                className="rounded-full p-2 transition-colors hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                aria-label="Previous month"
                disabled={monthOffset >= 5}
                onClick={() => setMonthOffset(monthOffset + 1)}
                className="rounded-full p-2 transition-colors hover:bg-muted disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-28 text-center text-xs font-semibold sm:text-sm">
                {monthOffset === 0 ? "This Month" : currentMonthLabel}
              </span>
              <button
                aria-label="Next month"
                disabled={monthOffset === 0}
                onClick={() => setMonthOffset(monthOffset - 1)}
                className="rounded-full p-2 transition-colors hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      }
    >
      {/* View Mode Switcher */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-border bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setViewMode("month")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              viewMode === "month"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Monthly Comparison
          </button>
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
              viewMode === "day"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Daily Summary
          </button>
        </div>

        {viewMode === "month" && (
          <span className="hidden text-xs text-muted-foreground sm:inline-block">
            Comparing <strong className="text-foreground">{currentMonthLabel}</strong> with{" "}
            <strong className="text-foreground">{prevMonthLabel}</strong>
          </span>
        )}
      </div>

      {viewMode === "day" ? (
        <DailyView data={dailyData} />
      ) : (
        <MonthlyComparisonView
          comp={monthComp}
          currentMonthLabel={currentMonthLabel}
          prevMonthLabel={prevMonthLabel}
        />
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Data from the last 6 months (180 days) is stored and available on this device.
      </p>
    </AppShell>
  );
}

function DailyView({
  data: s,
}: {
  data: {
    revenue: number;
    orders: number;
    bills: { id: string; tableId: number; tableAlias?: string | undefined; total: number; settledAt: number }[];
    items: { productId: string; name: string; qty: number; revenue: number }[];
  };
}) {
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Revenue" value={inr(s.revenue)} accent />
        <Stat label="Orders" value={String(s.orders)} />
        <Stat label="Avg. bill" value={inr(s.orders ? Math.round(s.revenue / s.orders) : 0)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-2 font-display text-xl">Items sold</h2>
          {s.items.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No sales on this day.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {s.items.map((i) => (
                  <tr key={i.productId} className="border-t border-border">
                    <td className="py-2">{i.name}</td>
                    <td className="py-2 text-right text-muted-foreground">×{i.qty}</td>
                    <td className="py-2 text-right font-medium">{inr(i.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-2 font-display text-xl">Settled bills</h2>
          {s.bills.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No bills yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {s.bills.map((b) => (
                <li key={b.id} className="flex justify-between py-2">
                  <span>
                    Table {b.tableId}
                    {b.tableAlias ? (
                      <span className="font-semibold text-foreground"> ({b.tableAlias})</span>
                    ) : null}{" "}
                    ·{" "}
                    <span className="text-muted-foreground">
                      {new Date(b.settledAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <span className="font-medium">{inr(b.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function MonthlyComparisonView({
  comp,
  currentMonthLabel,
  prevMonthLabel,
}: {
  comp: ReturnType<typeof useMonthComparison>;
  currentMonthLabel: string;
  prevMonthLabel: string;
}) {
  if (!comp) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Calculating monthly metrics…
      </div>
    );
  }

  const {
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
  } = comp;

  return (
    <div className="space-y-6">
      {/* Comparison Headline Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Revenue Card */}
        <div className="rounded-2xl bg-primary p-4 text-primary-foreground shadow-sm">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-80">
            <span>Monthly Revenue</span>
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-primary-foreground/15">
              {currentMonthLabel}
            </span>
          </div>
          <div className="mt-2 font-display text-3xl font-bold">{inr(current.revenue)}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <ComparisonPill
              diff={revenueDiff}
              percent={revenuePercentChange}
              formatter={inr}
              isDarkAccent
            />
            <span className="opacity-80">vs {inr(previous.revenue)} ({prevMonthLabel})</span>
          </div>
        </div>

        {/* Orders Card */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span>Total Orders</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
              {currentMonthLabel}
            </span>
          </div>
          <div className="mt-2 font-display text-3xl">{current.orders}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <ComparisonPill
              diff={ordersDiff}
              percent={ordersPercentChange}
              formatter={(n) => `${Math.abs(n)} orders`}
            />
            <span>vs {previous.orders} in {prevMonthLabel}</span>
          </div>
        </div>

        {/* Average Bill Card */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
            <span>Average Ticket</span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
              {currentMonthLabel}
            </span>
          </div>
          <div className="mt-2 font-display text-3xl">{inr(avgBillCurrent)}</div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <ComparisonPill
              diff={avgBillDiff}
              percent={
                avgBillPrevious > 0
                  ? Math.round(((avgBillCurrent - avgBillPrevious) / avgBillPrevious) * 1000) / 10
                  : null
              }
              formatter={inr}
            />
            <span>vs {inr(avgBillPrevious)} in {prevMonthLabel}</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Month Performance Summary */}
      <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
        <h2 className="font-display text-lg">Performance Overview</h2>
        <p className="text-xs text-muted-foreground">
          Snapshot comparison between {currentMonthLabel} and {prevMonthLabel}
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Current Month Box */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-sm">{currentMonthLabel}</span>
              <span className="text-xs text-primary font-medium">Selected</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Revenue:</span>
              <span className="font-semibold text-foreground">{inr(current.revenue)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Orders:</span>
              <span className="font-medium text-foreground">{current.orders}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Avg. Bill:</span>
              <span className="font-medium text-foreground">{inr(avgBillCurrent)}</span>
            </div>
          </div>

          {/* Previous Month Box */}
          <div className="rounded-xl border border-border bg-muted/30 p-3.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-sm">{prevMonthLabel}</span>
              <span className="text-xs text-muted-foreground">Baseline</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Revenue:</span>
              <span className="font-semibold text-foreground">{inr(previous.revenue)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Orders:</span>
              <span className="font-medium text-foreground">{previous.orders}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Avg. Bill:</span>
              <span className="font-medium text-foreground">{inr(avgBillPrevious)}</span>
            </div>
          </div>
        </div>

        {/* Growth Commentary */}
        <div className="mt-4 rounded-xl border border-border/80 bg-background/50 p-3 text-xs leading-relaxed text-foreground">
          {previous.revenue === 0 && current.revenue === 0 ? (
            <p>No sales recorded yet for {currentMonthLabel} or {prevMonthLabel}.</p>
          ) : previous.revenue === 0 ? (
            <p>
              Sales began in {currentMonthLabel} with {inr(current.revenue)} over {current.orders} orders.
            </p>
          ) : revenueDiff > 0 ? (
            <p className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span>
                Sales are <strong>up by {inr(revenueDiff)}</strong> ({revenuePercentChange}%) compared to {prevMonthLabel}.
              </span>
            </p>
          ) : revenueDiff < 0 ? (
            <p className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <TrendingDown className="h-4 w-4 shrink-0" />
              <span>
                Sales are <strong>down by {inr(Math.abs(revenueDiff))}</strong> ({Math.abs(revenuePercentChange ?? 0)}%) compared to {prevMonthLabel}.
              </span>
            </p>
          ) : (
            <p className="flex items-center gap-1.5 text-muted-foreground font-medium">
              <Minus className="h-4 w-4 shrink-0" />
              <span>Revenue is exactly matched with {prevMonthLabel}.</span>
            </p>
          )}
        </div>
      </section>

      {/* Product-by-Product Sales Comparison */}
      <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg">Item Performance Comparison</h2>
            <p className="text-xs text-muted-foreground">
              Quantity and revenue changes per menu item
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No items sold during this period.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="py-2.5 font-medium">Product</th>
                  <th className="py-2.5 text-right font-medium">{currentMonthLabel}</th>
                  <th className="py-2.5 text-right font-medium">{prevMonthLabel}</th>
                  <th className="py-2.5 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((i) => (
                  <ItemComparisonRow key={i.productId} item={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ItemComparisonRow({ item }: { item: ItemComparison }) {
  const isUp = item.revenueDiff > 0;
  const isDown = item.revenueDiff < 0;

  return (
    <tr className="hover:bg-muted/20">
      <td className="py-3 pr-2">
        <div className="font-medium text-foreground">{item.name}</div>
        <div className="text-xs text-muted-foreground">
          {item.currentQty > 0 ? `×${item.currentQty} sold` : "0 sold"}
        </div>
      </td>

      <td className="py-3 text-right">
        <div className="font-semibold text-foreground">{inr(item.currentRevenue)}</div>
        <div className="text-xs text-muted-foreground">×{item.currentQty}</div>
      </td>

      <td className="py-3 text-right">
        <div className="text-muted-foreground">{inr(item.prevRevenue)}</div>
        <div className="text-xs text-muted-foreground">×{item.prevQty}</div>
      </td>

      <td className="py-3 text-right">
        {item.prevRevenue === 0 && item.currentRevenue === 0 ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : item.prevRevenue === 0 ? (
          <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            New ({inr(item.currentRevenue)})
          </span>
        ) : (
          <div className="flex flex-col items-end">
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                isUp
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isDown
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-muted-foreground"
              }`}
            >
              {isUp ? (
                <TrendingUp className="h-3 w-3" />
              ) : isDown ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              {isUp ? "+" : ""}
              {inr(item.revenueDiff)}
            </span>
            {item.revenuePercentChange !== null && (
              <span className="text-[10px] text-muted-foreground">
                {item.revenuePercentChange > 0 ? "+" : ""}
                {item.revenuePercentChange}%
              </span>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

function ComparisonPill({
  diff,
  percent,
  formatter,
  isDarkAccent,
}: {
  diff: number;
  percent: number | null;
  formatter: (n: number) => string;
  isDarkAccent?: boolean;
}) {
  if (percent === null) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${
          isDarkAccent ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        Baseline
      </span>
    );
  }

  const isUp = diff > 0;
  const isDown = diff < 0;

  if (!isUp && !isDown) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium ${
          isDarkAccent ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  }

  if (isDarkAccent) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
          isUp
            ? "bg-emerald-400/25 text-emerald-100"
            : "bg-rose-400/25 text-rose-100"
        }`}
      >
        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isUp ? "+" : ""}
        {formatter(diff)} ({isUp ? "+" : ""}
        {percent}%)
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
        isUp
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
      }`}
    >
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? "+" : ""}
      {formatter(diff)} ({isUp ? "+" : ""}
      {percent}%)
    </span>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl p-4 ${accent ? "col-span-2 bg-primary text-primary-foreground lg:col-span-1" : "border border-border bg-card"}`}
    >
      <div className="text-xs uppercase tracking-widest opacity-75">{label}</div>
      <div className="mt-1 font-display text-3xl">{value}</div>
    </div>
  );
}

