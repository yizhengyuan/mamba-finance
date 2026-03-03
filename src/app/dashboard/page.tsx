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

function planStatusLabel(status: DashboardPlanItem["status"]): string {
  return status === "overdue" ? "逾期" : "待收";
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
          throw new Error(summaryBody.message ?? "加载看板失败");
        }
        if (!chartResponse.ok) {
          throw new Error(chartBody.message ?? "加载图表失败");
        }
        if (!briefResponse.ok) {
          throw new Error(briefBody.message ?? "加载每日简报失败");
        }

        if (!cancelled) {
          setSummary(summaryBody.data ?? null);
          setCharts(chartBody.data ?? null);
          setBrief(briefBody.data ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载看板失败");
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
        <h2 className="text-xl font-semibold">经营看板</h2>
        <p className="mt-1 text-sm text-slate-300">
          今日到期/逾期快照与核心经营指标汇总。
        </p>
      </header>

      {loading ? <p className="text-sm text-slate-300">看板加载中...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {!loading && !error && summary ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="总资产" value={money(summary.metrics.totalAssets)} />
            <MetricCard
              label="待回本金"
              value={money(summary.metrics.outstandingPrincipal)}
            />
            <MetricCard
              label="本月预计利息"
              value={money(summary.metrics.monthlyExpectedInterest)}
            />
            <MetricCard
              label="今日到期笔数"
              value={`${summary.metrics.todayDueCount}`}
              sub={money(summary.metrics.todayDueAmount)}
            />
            <MetricCard
              label="逾期笔数"
              value={`${summary.metrics.overdueCount}`}
              sub={money(summary.metrics.overdueAmount)}
            />
            <MetricCard
              label="健康状态"
              value={summary.metrics.overdueCount > 0 ? "需关注" : "正常"}
              sub={summary.metrics.overdueCount > 0 ? "请尽快处理逾期项" : "暂无逾期订单"}
            />
          </div>

          {charts ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <LineChart
                title="资产趋势（30天）"
                points={charts.assetTrend.map((point) => ({
                  label: point.date,
                  value: point.totalAssets,
                }))}
                valueFormatter={money}
              />
              <DonutChart
                title="资产构成"
                items={charts.assetComposition.map((point) => ({
                  label: point.name,
                  value: point.currentBalance,
                }))}
                valueFormatter={money}
              />
              <div className="xl:col-span-2">
                <BarChart
                  title="未来7天到期结构"
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
            <PlanPanel title="今日到期" items={summary.todayDuePlans} emptyText="今日暂无到期项。" />
            <PlanPanel title="逾期项" items={summary.overduePlans} emptyText="暂无逾期项。" />
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
                <span className="uppercase tracking-wide">{planStatusLabel(plan.status)}</span>
              </div>
              <div className="mt-2">
                <Link
                  href={`/orders/${plan.order.id}`}
                  className="text-xs text-cyan-200 underline underline-offset-2"
                >
                  查看订单
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
