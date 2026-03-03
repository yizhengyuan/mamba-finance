"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface CalendarPlan {
  id: string;
  periodIndex: number;
  dueDate: string;
  totalDue: number;
  status: "pending" | "paid" | "overdue";
  order: {
    id: string;
    orderNo: string;
    borrowerName: string;
  };
}

interface CalendarDay {
  date: string;
  dueCount: number;
  dueAmount: number;
  overdueCount: number;
  plans: CalendarPlan[];
}

interface CalendarPayload {
  month: string;
  summary: {
    dueCount: number;
    dueAmount: number;
    overdueCount: number;
    overdueAmount: number;
  };
  days: CalendarDay[];
}

function money(value: number): string {
  return `¥${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function toMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNum = Number(monthText);
  const next = new Date(Date.UTC(year, monthNum - 1 + delta, 1));
  return toMonthKey(next);
}

function weekdayOffset(month: string): number {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNum = Number(monthText);
  const date = new Date(Date.UTC(year, monthNum - 1, 1));
  return date.getUTCDay();
}

function monthTitle(month: string): string {
  const [yearText, monthText] = month.split("-");
  return `${yearText}-${monthText}`;
}

function dayTitle(dateText: string): string {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function RepaymentCalendarPage() {
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [data, setData] = useState<CalendarPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/calendar/repayments?month=${encodeURIComponent(month)}`,
          { cache: "no-store" },
        );
        const body = (await response.json()) as {
          data?: CalendarPayload;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(body.message ?? "Failed to load calendar");
        }

        if (!cancelled) {
          setData(body.data ?? null);
          setSelectedDate(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load calendar");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [month]);

  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const day of data?.days ?? []) {
      map.set(day.date, day);
    }
    return map;
  }, [data]);

  const gridCells = useMemo(() => {
    const offset = weekdayOffset(month);
    const cells: Array<CalendarDay | null> = Array.from({ length: offset }, () => null);
    for (const day of data?.days ?? []) {
      cells.push(day);
    }
    return cells;
  }, [data, month]);

  const selectedDay = selectedDate ? dayMap.get(selectedDate) : null;

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
        <h2 className="text-xl font-semibold">Repayment Calendar</h2>
        <p className="mt-1 text-sm text-slate-300">
          Monthly due distribution and same-day repayment task list.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth((current) => shiftMonth(current, -1))}
              className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-slate-100 transition hover:bg-white/10"
            >
              Prev
            </button>
            <p className="text-base font-semibold">{monthTitle(month)}</p>
            <button
              type="button"
              onClick={() => setMonth((current) => shiftMonth(current, 1))}
              className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-slate-100 transition hover:bg-white/10"
            >
              Next
            </button>
          </div>

          <div className="mb-3 grid grid-cols-7 gap-2">
            {WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-center text-xs text-slate-400"
              >
                {weekday}
              </div>
            ))}
          </div>

          {loading ? <p className="text-sm text-slate-300">Loading calendar...</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          {!loading && !error ? (
            <div className="grid grid-cols-7 gap-2">
              {gridCells.map((cell, index) =>
                cell ? (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => setSelectedDate(cell.date)}
                    className={`min-h-[88px] rounded-lg border p-2 text-left transition ${
                      selectedDate === cell.date
                        ? "border-cyan-400/70 bg-cyan-500/15"
                        : "border-white/10 bg-black/20 hover:bg-white/10"
                    }`}
                  >
                    <p className="text-xs text-slate-300">{cell.date.slice(-2)}</p>
                    <p className="mt-1 text-[11px] text-slate-200">Due {cell.dueCount}</p>
                    <p className="text-[11px] text-cyan-200">{money(cell.dueAmount)}</p>
                    {cell.overdueCount > 0 ? (
                      <p className="mt-1 text-[11px] text-rose-300">
                        Overdue {cell.overdueCount}
                      </p>
                    ) : null}
                  </button>
                ) : (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[88px] rounded-lg border border-transparent bg-transparent"
                  />
                ),
              )}
            </div>
          ) : null}
        </section>

        <aside className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur">
          <h3 className="text-base font-semibold">Day Task Drawer</h3>
          <p className="mt-1 text-xs text-slate-400">
            {selectedDay ? dayTitle(selectedDay.date) : "Select a date in the calendar"}
          </p>

          {!selectedDay ? (
            <p className="mt-4 text-sm text-slate-300">
              No day selected. Click any date cell to view repayment plans.
            </p>
          ) : selectedDay.plans.length === 0 ? (
            <p className="mt-4 text-sm text-slate-300">No plans on this day.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {selectedDay.plans.map((plan) => (
                <div key={plan.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-100">{plan.order.borrowerName}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{plan.status}</p>
                  </div>
                  <p className="mt-1 text-xs font-mono text-slate-400">{plan.order.orderNo}</p>
                  <p className="mt-2 text-sm text-cyan-200">{money(plan.totalDue)}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Period {plan.periodIndex}</span>
                    <Link
                      href={`/orders/${plan.order.id}`}
                      className="text-cyan-200 underline underline-offset-2"
                    >
                      Open order
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
              <p>
                Month Due: <span className="text-slate-100">{data.summary.dueCount}</span> (
                {money(data.summary.dueAmount)})
              </p>
              <p className="mt-1">
                Month Overdue:{" "}
                <span className="text-rose-300">{data.summary.overdueCount}</span> (
                {money(data.summary.overdueAmount)})
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
