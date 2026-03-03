"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OrderStatus = "active" | "overdue" | "closed";

interface NextRepaymentPlan {
  id: string;
  dueDate: string;
  totalDue: string;
  status: "pending" | "overdue";
}

interface OrderListItem {
  id: string;
  orderNo: string;
  borrowerName: string;
  principal: string;
  status: OrderStatus;
  repaymentPlans: NextRepaymentPlan[];
}

interface CreateOrderForm {
  borrowerName: string;
  borrowerPhone: string;
  principal: string;
  monthlyRate: string;
  startDate: string;
  months: string;
  collateralDesc: string;
  notes: string;
}

const filters: Array<{ value: "" | OrderStatus; label: string }> = [
  { value: "", label: "全部" },
  { value: "active", label: "执行中" },
  { value: "overdue", label: "逾期" },
  { value: "closed", label: "已结清" },
];

const initialForm: CreateOrderForm = {
  borrowerName: "",
  borrowerPhone: "",
  principal: "",
  monthlyRate: "0.01",
  startDate: new Date().toISOString().slice(0, 10),
  months: "3",
  collateralDesc: "",
  notes: "",
};

function formatCurrency(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `¥${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : value;
}

function formatDate(value: string): string {
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

function orderStatusLabel(status: OrderStatus): string {
  if (status === "active") return "执行中";
  if (status === "overdue") return "逾期";
  return "已结清";
}

function parseFormToPayload(form: CreateOrderForm): {
  borrowerName: string;
  borrowerPhone?: string;
  principal: number;
  monthlyRate: number;
  startDate: string;
  months: number;
  collateralDesc?: string;
  notes?: string;
} {
  const borrowerName = form.borrowerName.trim();
  if (!borrowerName) {
    throw new Error("借款人姓名不能为空");
  }

  const principal = Number(form.principal);
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error("本金必须大于 0");
  }

  const monthlyRate = Number(form.monthlyRate);
  if (!Number.isFinite(monthlyRate) || monthlyRate <= 0 || monthlyRate > 1) {
    throw new Error("月利率必须在 0 到 1 之间");
  }

  const months = Number(form.months);
  if (!Number.isInteger(months) || months < 1) {
    throw new Error("期数必须是大于等于 1 的整数");
  }

  if (!form.startDate) {
    throw new Error("起息日期不能为空");
  }

  return {
    borrowerName,
    borrowerPhone: form.borrowerPhone.trim() || undefined,
    principal,
    monthlyRate,
    startDate: `${form.startDate}T00:00:00.000Z`,
    months,
    collateralDesc: form.collateralDesc.trim() || undefined,
    notes: form.notes.trim() || undefined,
  };
}

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<"" | OrderStatus>("");
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<CreateOrderForm>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const query = useMemo(() => {
    if (!statusFilter) {
      return "/api/orders";
    }

    const params = new URLSearchParams({ status: statusFilter });
    return `/api/orders?${params.toString()}`;
  }, [statusFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(query, { cache: "no-store" });
        const body = (await response.json()) as {
          data?: OrderListItem[];
          message?: string;
        };

        if (!response.ok) {
          throw new Error(body.message ?? "加载订单失败");
        }

        if (!cancelled) {
          setOrders(body.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载订单失败");
          setOrders([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [query, reloadTick]);

  async function submitCreateOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    let payload: ReturnType<typeof parseFormToPayload>;
    try {
      payload = parseFormToPayload(form);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "表单输入有误");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as {
        data?: { id: string };
        message?: string;
      };

      if (!response.ok) {
        throw new Error(body.message ?? "创建订单失败");
      }

      setDrawerOpen(false);
      setForm(initialForm);
      setReloadTick((tick) => tick + 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "创建订单失败");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">订单管理</h2>
            <p className="mt-1 text-sm text-slate-300">
              借款人、本金、下一期到期金额与状态总览。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                className={`rounded-md border px-3 py-1.5 text-xs transition ${
                  statusFilter === filter.value
                    ? "border-cyan-300 bg-cyan-400/20 text-cyan-100"
                    : "border-white/20 text-slate-200 hover:bg-white/10"
                }`}
              >
                {filter.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="ml-1 rounded-md border border-cyan-300/60 bg-cyan-400/20 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-300/30"
            >
              新建订单
            </button>
          </div>
        </div>

        {loading ? <p className="text-sm text-slate-300">订单加载中...</p> : null}

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {!loading && !error && orders.length === 0 ? (
          <p className="text-sm text-slate-300">当前筛选下暂无订单。</p>
        ) : null}

        {!loading && !error && orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-300">
                  <th className="px-2 py-3 font-medium">借款人</th>
                  <th className="px-2 py-3 font-medium">订单号</th>
                  <th className="px-2 py-3 font-medium">本金</th>
                  <th className="px-2 py-3 font-medium">下一期到期</th>
                  <th className="px-2 py-3 font-medium">状态</th>
                  <th className="px-2 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const nextDue = order.repaymentPlans[0];
                  return (
                    <tr key={order.id} className="border-b border-white/5 text-slate-100">
                      <td className="px-2 py-3">{order.borrowerName}</td>
                      <td className="px-2 py-3 font-mono text-xs text-slate-300">{order.orderNo}</td>
                      <td className="px-2 py-3">{formatCurrency(order.principal)}</td>
                      <td className="px-2 py-3">
                        {nextDue
                          ? `${formatDate(nextDue.dueDate)} (${formatCurrency(nextDue.totalDue)})`
                          : "-"}
                      </td>
                      <td className="px-2 py-3 uppercase tracking-wide text-xs text-cyan-200">
                        {orderStatusLabel(order.status)}
                      </td>
                      <td className="px-2 py-3">
                        <Link
                          href={`/orders/${order.id}`}
                          className="rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
                        >
                          详情
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="关闭新建订单抽屉"
            className="absolute inset-0 bg-black/50"
            onClick={() => !creating && setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-slate-950 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">新建订单</h3>
                <p className="mt-1 text-xs text-slate-400">
                  一次提交将同时创建订单与还款计划。
                </p>
              </div>
              <button
                type="button"
                className="rounded-md border border-white/20 px-2 py-1 text-xs text-slate-200"
                onClick={() => !creating && setDrawerOpen(false)}
              >
                关闭
              </button>
            </div>

            <form className="space-y-4" onSubmit={submitCreateOrder}>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-300">借款人 *</span>
                <input
                  value={form.borrowerName}
                  onChange={(e) => setForm((prev) => ({ ...prev, borrowerName: e.target.value }))}
                  className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                  placeholder="请输入借款人姓名"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-slate-300">手机号</span>
                <input
                  value={form.borrowerPhone}
                  onChange={(e) => setForm((prev) => ({ ...prev, borrowerPhone: e.target.value }))}
                  className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                  placeholder="13800000000"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-300">本金 *</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.principal}
                    onChange={(e) => setForm((prev) => ({ ...prev, principal: e.target.value }))}
                    className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                    placeholder="10000"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-slate-300">月利率 *</span>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.0001"
                    value={form.monthlyRate}
                    onChange={(e) => setForm((prev) => ({ ...prev, monthlyRate: e.target.value }))}
                    className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-slate-300">起息日期 *</span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-slate-300">期数 *</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.months}
                    onChange={(e) => setForm((prev) => ({ ...prev, months: e.target.value }))}
                    className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs text-slate-300">抵押物描述</span>
                <input
                  value={form.collateralDesc}
                  onChange={(e) => setForm((prev) => ({ ...prev, collateralDesc: e.target.value }))}
                  className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                  placeholder="例如：黄金、手机等"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-slate-300">备注</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="min-h-24 w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                  placeholder="可选备注"
                />
              </label>

              {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  disabled={creating}
                  className="rounded-md border border-white/20 px-4 py-2 text-sm text-slate-200 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md border border-cyan-300/60 bg-cyan-400/20 px-4 py-2 text-sm text-cyan-100 disabled:opacity-50"
                >
                  {creating ? "创建中..." : "创建订单"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
