"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { UIButton } from "@/components/ui/button";
import { UIFormField, UIInput, UISelect } from "@/components/ui/form-field";
import { UIStatusBadge } from "@/components/ui/status-badge";

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
  filters?: {
    status?: "pending" | "paid" | "overdue";
    keyword?: string;
  };
  summary: {
    dueCount: number;
    dueAmount: number;
    overdueCount: number;
    overdueAmount: number;
  };
  days: CalendarDay[];
}

interface AccountOption {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

function formatAccountType(type: string): string {
  if (type === "cash") return "现金";
  if (type === "bank_card") return "银行卡";
  if (type === "wechat") return "微信";
  if (type === "alipay") return "支付宝";
  return "其他";
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

function defaultOccurredAtLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export default function RepaymentCalendarPage() {
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [status, setStatus] = useState<"all" | "pending" | "paid" | "overdue">("all");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [data, setData] = useState<CalendarPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [collectPlan, setCollectPlan] = useState<CalendarPlan | null>(null);
  const [accountId, setAccountId] = useState("");
  const [occurredAt, setOccurredAt] = useState(defaultOccurredAtLocal());
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("month", month);
        if (status !== "all") {
          params.set("status", status);
        }
        if (keyword) {
          params.set("keyword", keyword);
        }

        const response = await fetch(
          `/api/calendar/repayments?${params.toString()}`,
          { cache: "no-store" },
        );
        const body = (await response.json()) as {
          data?: CalendarPayload;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(body.message ?? "加载还款日历失败");
        }

        if (!cancelled) {
          setData(body.data ?? null);
          setSelectedDate((previous) => {
            if (!previous) {
              return null;
            }
            return (body.data?.days ?? []).some((day) => day.date === previous)
              ? previous
              : null;
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载还款日历失败");
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
  }, [keyword, month, refreshTick, status]);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      try {
        const response = await fetch("/api/accounts", { cache: "no-store" });
        const body = (await response.json()) as { data?: AccountOption[] };
        if (!response.ok || cancelled) {
          return;
        }

        const activeAccounts = (body.data ?? []).filter((account) => account.isActive);
        setAccounts(activeAccounts);
        if (!accountId && activeAccounts.length > 0) {
          setAccountId(activeAccounts[0].id);
        }
      } catch {
        // Keep collect flow optional; page remains usable without account preload.
      }
    }

    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

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

  async function submitCollect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!collectPlan) {
      return;
    }

    if (!accountId) {
      setCollectError("请选择收款账户");
      return;
    }

    if (!occurredAt) {
      setCollectError("请选择发生时间");
      return;
    }

    setCollecting(true);
    setCollectError(null);

    try {
      const response = await fetch(`/api/repayment-plans/${collectPlan.id}/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          amount: collectPlan.totalDue,
          occurredAt: new Date(occurredAt).toISOString(),
          note: `日历核销 第${collectPlan.periodIndex}期`,
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? "核销回款失败");
      }

      setCollectPlan(null);
      setRefreshTick((tick) => tick + 1);
    } catch (err) {
      setCollectError(err instanceof Error ? err.message : "核销回款失败");
    } finally {
      setCollecting(false);
    }
  }

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
        <h2 className="text-xl font-semibold">还款日历</h2>
        <p className="mt-1 text-sm text-slate-300">
          查看月度到期分布，并在同日任务抽屉中直接核销回款。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-white/10 bg-black/25 p-4 backdrop-blur">
          <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-[160px_1fr_auto]">
            <UIFormField label="状态">
              <UISelect
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as "all" | "pending" | "paid" | "overdue")
                }
                data-testid="calendar-status-filter"
              >
                <option value="all">全部</option>
                <option value="pending">待收</option>
                <option value="paid">已收</option>
                <option value="overdue">逾期</option>
              </UISelect>
            </UIFormField>

            <UIFormField label="借款人关键词">
              <UIInput
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setKeyword(keywordInput.trim());
                  }
                }}
                placeholder="例如：张三"
                data-testid="calendar-keyword-input"
              />
            </UIFormField>

            <div className="flex items-end gap-2">
              <UIButton
                onClick={() => setKeyword(keywordInput.trim())}
                data-testid="calendar-search-button"
                size="sm"
                variant="secondary"
              >
                搜索
              </UIButton>
              <UIButton
                onClick={() => {
                  setStatus("all");
                  setKeyword("");
                  setKeywordInput("");
                }}
                size="sm"
                variant="ghost"
              >
                重置
              </UIButton>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <UIButton
              onClick={() => setMonth((current) => shiftMonth(current, -1))}
              size="sm"
              variant="ghost"
            >
              上月
            </UIButton>
            <p className="text-base font-semibold">{monthTitle(month)}</p>
            <UIButton
              onClick={() => setMonth((current) => shiftMonth(current, 1))}
              size="sm"
              variant="ghost"
            >
              下月
            </UIButton>
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

          {loading ? <p className="text-sm text-slate-300">日历加载中...</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {!loading && !error && data ? (
            <p className="mb-3 text-xs text-slate-400">
              当前筛选：状态=
              <span className="text-slate-200">
                {data.filters?.status === "pending"
                  ? "待收"
                  : data.filters?.status === "paid"
                    ? "已收"
                    : data.filters?.status === "overdue"
                      ? "逾期"
                      : "全部"}
              </span>
              ，关键词=
              <span className="text-slate-200">
                {data.filters?.keyword ?? "-"}
              </span>
            </p>
          ) : null}

          {!loading && !error ? (
            <div className="grid grid-cols-7 gap-2">
              {gridCells.map((cell, index) =>
                cell ? (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => setSelectedDate(cell.date)}
                    data-testid={`calendar-cell-${cell.date}`}
                    className={`min-h-[88px] rounded-lg border p-2 text-left transition ${
                      selectedDate === cell.date
                        ? "border-cyan-400/70 bg-cyan-500/15"
                        : "border-white/10 bg-black/20 hover:bg-white/10"
                    }`}
                  >
                    <p className="text-xs text-slate-300">{cell.date.slice(-2)}</p>
                    <p className="mt-1 text-[11px] text-slate-200">到期 {cell.dueCount}</p>
                    <p className="text-[11px] text-cyan-200">{money(cell.dueAmount)}</p>
                    {cell.overdueCount > 0 ? (
                      <p className="mt-1 text-[11px] text-rose-300">
                        逾期 {cell.overdueCount}
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
          <h3 className="text-base font-semibold">当日任务抽屉</h3>
          <p className="mt-1 text-xs text-slate-400">
            {selectedDay ? dayTitle(selectedDay.date) : "请先在日历中选择一个日期"}
          </p>

          {!selectedDay ? (
            <p className="mt-4 text-sm text-slate-300">
              暂未选择日期，请点击任一日期查看当日计划。
            </p>
          ) : selectedDay.plans.length === 0 ? (
            <p className="mt-4 text-sm text-slate-300">该日暂无计划。</p>
          ) : (
            <div className="mt-4 space-y-2">
              {selectedDay.plans.map((plan) => (
                <div key={plan.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-slate-100">{plan.order.borrowerName}</p>
                    <UIStatusBadge
                      tone={
                        plan.status === "overdue"
                          ? "overdue"
                          : plan.status === "paid"
                            ? "paid"
                            : "active"
                      }
                    >
                      {plan.status === "pending" ? "待收" : plan.status === "paid" ? "已收" : "逾期"}
                    </UIStatusBadge>
                  </div>
                  <p className="mt-1 text-xs font-mono text-slate-400">{plan.order.orderNo}</p>
                  <p className="mt-2 text-sm text-cyan-200">{money(plan.totalDue)}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span>第 {plan.periodIndex} 期</span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/orders/${plan.order.id}`}
                        className="text-cyan-200 underline underline-offset-2"
                      >
                        查看订单
                      </Link>
                      {plan.status !== "paid" ? (
                        <UIButton
                          onClick={() => {
                            setCollectPlan(plan);
                            setCollectError(null);
                            setOccurredAt(defaultOccurredAtLocal());
                          }}
                          data-testid={`calendar-drawer-collect-${plan.id}`}
                          size="sm"
                        >
                          核销
                        </UIButton>
                      ) : (
                        <span className="text-[11px] text-slate-500">已结清</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-slate-300">
              <p>
                本月到期：<span className="text-slate-100">{data.summary.dueCount}</span> (
                {money(data.summary.dueAmount)})
              </p>
              <p className="mt-1">
                本月逾期：{" "}
                <span className="text-rose-300">{data.summary.overdueCount}</span> (
                {money(data.summary.overdueAmount)})
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      {collectPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="关闭核销弹窗"
            onClick={() => !collecting && setCollectPlan(null)}
          />
          <form
            onSubmit={submitCollect}
            className="relative z-10 w-full max-w-md rounded-xl border border-white/15 bg-slate-950 p-5"
          >
            <h4 className="text-base font-semibold">核销回款</h4>
            <p className="mt-1 text-xs text-slate-300">
              {collectPlan.order.borrowerName} · 第 {collectPlan.periodIndex} 期
            </p>
            <p className="text-xs text-cyan-200">{money(collectPlan.totalDue)}</p>

            <UIFormField className="mt-4" label="收款账户" required>
              <UISelect
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                data-testid="calendar-collect-account-select"
                required
              >
                <option value="">请选择账户</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}（{formatAccountType(account.type)}）
                  </option>
                ))}
              </UISelect>
            </UIFormField>

            <UIFormField className="mt-3" label="发生时间" required>
              <UIInput
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
                required
              />
            </UIFormField>

            {collectError ? <p className="mt-3 text-sm text-rose-300">{collectError}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <UIButton
                onClick={() => !collecting && setCollectPlan(null)}
                size="sm"
                variant="ghost"
              >
                取消
              </UIButton>
              <UIButton
                type="submit"
                disabled={collecting}
                data-testid="calendar-collect-confirm-button"
                size="sm"
              >
                {collecting ? "核销中..." : "确认核销"}
              </UIButton>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
