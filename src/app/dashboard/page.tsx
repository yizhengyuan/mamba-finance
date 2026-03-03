"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BarChart } from "@/components/charts/bar-chart";
import { DonutChart } from "@/components/charts/donut-chart";
import { LineChart } from "@/components/charts/line-chart";

interface DashboardPlanItem {
  id: string;
  dueDate: string;
  totalDue: string;
  status: "pending" | "overdue";
  order: {
    id: string;
    orderNo: string;
    borrowerName: string;
  };
}

interface DashboardSummary {
  metrics: {
    totalAssets: number;
    outstandingPrincipal: number;
    monthlyExpectedInterest: number;
    todayDueCount: number;
    todayDueAmount: number;
    overdueCount: number;
    overdueAmount: number;
  };
  todayDuePlans: DashboardPlanItem[];
  overduePlans: DashboardPlanItem[];
}

interface DashboardCharts {
  range: "30d";
  assetTrend: Array<{
    date: string;
    totalAssets: number;
  }>;
  assetComposition: Array<{
    accountId: string;
    name: string;
    currentBalance: number;
  }>;
  dueStructure: Array<{
    date: string;
    dueCount: number;
    dueAmount: number;
  }>;
}

interface DailyBrief {
  generatedAt: string;
  headline: string;
  bullets: string[];
}

function money(value: number): string {
  return `¥${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setLoading(true);
      setError(null);

      try {
        const [summaryResponse, chartResponse, briefResponse] = await Promise.all([
          fetch("/api/dashboard/summary", { cache: "no-store" }),
          fetch("/api/dashboard/charts?range=30d", { cache: "no-store" }),
          fetch("/api/ai/daily-brief", { cache: "no-store" }),
        ]);
        const summaryBody = (await summaryResponse.json()) as {
          data?: DashboardSummary;
          message?: string;
        };
        const chartBody = (await chartResponse.json()) as {
          data?: DashboardCharts;
          message?: string;
        };
        const briefBody = (await briefResponse.json()) as {
          data?: DailyBrief;
          message?: string;
        };

        if (!summaryResponse.ok) {
          throw new Error(summaryBody.message ?? "Failed to load dashboard");
        }
        if (!chartResponse.ok) {
          throw new Error(chartBody.message ?? "Failed to load dashboard charts");
        }
        if (!briefResponse.ok) {
          throw new Error(briefBody.message ?? "Failed to load daily brief");
        }

        if (!cancelled) {
          setSummary(summaryBody.data ?? null);
          setCharts(chartBody.data ?? null);
          setBrief(briefBody.data ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
          setSummary(null);
          setCharts(null);
          setBrief(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-300">
          Today due/overdue snapshot and financial KPI summary.
        </p>
      </header>

      {loading ? <p className="text-sm text-slate-300">Loading dashboard...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {!loading && !error && summary ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Total Assets" value={money(summary.metrics.totalAssets)} />
            <MetricCard
              label="Outstanding Principal"
              value={money(summary.metrics.outstandingPrincipal)}
            />
            <MetricCard
              label="Monthly Expected Interest"
              value={money(summary.metrics.monthlyExpectedInterest)}
            />
            <MetricCard
              label="Today Due Count"
              value={`${summary.metrics.todayDueCount}`}
              sub={money(summary.metrics.todayDueAmount)}
            />
            <MetricCard
              label="Overdue Count"
              value={`${summary.metrics.overdueCount}`}
              sub={money(summary.metrics.overdueAmount)}
            />
            <MetricCard
              label="Health"
              value={summary.metrics.overdueCount > 0 ? "ATTENTION" : "NORMAL"}
              sub={summary.metrics.overdueCount > 0 ? "Check overdue list" : "No overdue loans"}
            />
          </div>

          {charts ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <LineChart
                title="Asset Trend (30d)"
                points={charts.assetTrend.map((point) => ({
                  label: point.date,
                  value: point.totalAssets,
                }))}
                valueFormatter={money}
              />
              <DonutChart
                title="Asset Composition"
                items={charts.assetComposition.map((point) => ({
                  label: point.name,
                  value: point.currentBalance,
                }))}
                valueFormatter={money}
              />
              <div className="xl:col-span-2">
                <BarChart
                  title="Due Structure (Next 7d)"
                  items={charts.dueStructure.map((point) => ({
                    label: point.date,
                    value: point.dueAmount,
                    subValue: point.dueCount,
                  }))}
                  valueFormatter={money}
                />
              </div>
            </div>
          ) : null}

          {brief ? (
            <section className="rounded-2xl border border-cyan-300/20 bg-cyan-500/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-cyan-100">{brief.headline}</h3>
                <span className="text-[11px] text-cyan-200/80">{fmtDate(brief.generatedAt)}</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                {brief.bullets.map((line, index) => (
                  <li key={`${line}-${index}`}>- {line}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <PlanPanel title="Today Due" items={summary.todayDuePlans} emptyText="No due items today." />
            <PlanPanel title="Overdue" items={summary.overduePlans} emptyText="No overdue items." />
          </div>
        </>
      ) : null}
    </section>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
      {sub ? <p className="mt-1 text-xs text-cyan-200">{sub}</p> : null}
    </article>
  );
}

function PlanPanel({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: DashboardPlanItem[];
  emptyText: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur">
      <h3 className="mb-3 text-base font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-300">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {items.map((plan) => (
            <div key={plan.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-100">{plan.order.borrowerName}</p>
                  <p className="text-xs font-mono text-slate-400">{plan.order.orderNo}</p>
                </div>
                <p className="text-sm text-cyan-200">{money(Number(plan.totalDue))}</p>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>{fmtDate(plan.dueDate)}</span>
                <span className="uppercase tracking-wide">{plan.status}</span>
              </div>
              <div className="mt-2">
                <Link
                  href={`/orders/${plan.order.id}`}
                  className="text-xs text-cyan-200 underline underline-offset-2"
                >
                  Open order
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
