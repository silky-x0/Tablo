import { describe, expect, it } from "vitest";
import {
  calcMonthComparison,
  dayRange,
  inr,
  monthRange,
  pruneOld,
  totalOf,
  type Bill,
  type MonthSummary,
} from "./store";

describe("store rules", () => {
  it("keeps only the last 180 days of bills", () => {
    const now = Date.now();
    const day = 86400000;
    const b = (age: number): Bill => ({
      id: String(age),
      tableId: 1,
      items: [],
      total: 0,
      settledAt: now - age * day,
    });
    expect(pruneOld([b(1), b(60), b(179), b(181)], now).map((x) => x.id)).toEqual([
      "1",
      "60",
      "179",
    ]);
  });
  it("totals price × qty", () => {
    expect(
      totalOf([
        { productId: "a", name: "a", price: 40, qty: 3 },
        { productId: "b", name: "b", price: 120, qty: 1 },
      ]),
    ).toBe(240);
  });
  it("rounds float totals to paise (19.99 × 3 = 59.97)", () => {
    expect(totalOf([{ productId: "a", name: "a", price: 19.99, qty: 3 }])).toBe(59.97);
    expect(
      totalOf([
        { productId: "a", name: "a", price: 19.99, qty: 2 },
        { productId: "b", name: "b", price: 120, qty: 1 },
      ]),
    ).toBe(159.98);
  });
  it("dayRange spans calendar midnight to midnight", () => {
    const [start, end] = dayRange(new Date(2026, 2, 10, 15, 30));
    const s = new Date(start);
    const e = new Date(end);
    expect(s.getHours()).toBe(0);
    expect(s.getMinutes()).toBe(0);
    expect(e.getDate()).not.toBe(s.getDate());
    expect(end).toBeGreaterThan(start);
  });
  it("monthRange spans calendar month from 1st to 1st of next month", () => {
    const [start, end] = monthRange(new Date(2026, 9, 11)); // October 2026
    const s = new Date(start);
    const e = new Date(end);
    expect(s.getFullYear()).toBe(2026);
    expect(s.getMonth()).toBe(9);
    expect(s.getDate()).toBe(1);
    expect(e.getFullYear()).toBe(2026);
    expect(e.getMonth()).toBe(10); // November 1st
    expect(e.getDate()).toBe(1);
    expect(end).toBeGreaterThan(start);
  });
  it("calcMonthComparison computes differences and percentage changes", () => {
    const curMonthDate = new Date(2026, 9, 1);
    const prevMonthDate = new Date(2026, 8, 1);
    const current: MonthSummary = {
      year: 2026,
      month: 9,
      revenue: 120000,
      orders: 400,
      items: [
        { productId: "p1", name: "Masala Chai", qty: 200, revenue: 8000 },
        { productId: "p4", name: "Prawn Rava Fry", qty: 50, revenue: 16000 },
      ],
    };
    const previous: MonthSummary = {
      year: 2026,
      month: 8,
      revenue: 100000,
      orders: 350,
      items: [
        { productId: "p1", name: "Masala Chai", qty: 150, revenue: 6000 },
        { productId: "p2", name: "Cold Coffee", qty: 30, revenue: 3600 },
      ],
    };

    const comp = calcMonthComparison(current, previous, curMonthDate, prevMonthDate);
    expect(comp.revenueDiff).toBe(20000);
    expect(comp.revenuePercentChange).toBe(20); // +20%
    expect(comp.ordersDiff).toBe(50);
    expect(comp.ordersPercentChange).toBe(14.3); // (50/350)*100 = 14.2857 -> 14.3%
    expect(comp.avgBillCurrent).toBe(300);
    expect(comp.avgBillPrevious).toBe(286);
    expect(comp.avgBillDiff).toBe(14);

    // Items list merges products from both months
    const chai = comp.items.find((i) => i.productId === "p1");
    expect(chai).toBeDefined();
    expect(chai?.currentQty).toBe(200);
    expect(chai?.prevQty).toBe(150);
    expect(chai?.qtyDiff).toBe(50);
    expect(chai?.revenueDiff).toBe(2000);
    expect(chai?.revenuePercentChange).toBe(33.3);

    const coffee = comp.items.find((i) => i.productId === "p2");
    expect(coffee).toBeDefined();
    expect(coffee?.currentQty).toBe(0);
    expect(coffee?.prevQty).toBe(30);
    expect(coffee?.qtyDiff).toBe(-30);
    expect(coffee?.revenueDiff).toBe(-3600);
    expect(coffee?.revenuePercentChange).toBe(-100);
  });
  it("formats INR", () => {
    expect(inr(240)).toContain("240");
  });
  it("supports optional tableAlias on bills", () => {
    const bill: Bill = {
      id: "b1",
      tableId: 3,
      tableAlias: "Rahul",
      items: [],
      total: 500,
      settledAt: Date.now(),
    };
    expect(bill.tableAlias).toBe("Rahul");
  });
});
