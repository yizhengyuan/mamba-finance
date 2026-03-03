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
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "closed", label: "Closed" },
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
    throw new Error("Borrower name is required");
  }

  const principal = Number(form.principal);
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error("Principal must be greater than 0");
  }

  const monthlyRate = Number(form.monthlyRate);
  if (!Number.isFinite(monthlyRate) || monthlyRate <= 0 || monthlyRate > 1) {
    throw new Error("Monthly rate must be between 0 and 1");
  }

  const months = Number(form.months);
  if (!Number.isInteger(months) || months < 1) {
    throw new Error("Months must be an integer >= 1");
  }

  if (!form.startDate) {
    throw new Error("Start date is required");
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
          throw new Error(body.message ?? "Failed to fetch orders");
        }

        if (!cancelled) {
          setOrders(body.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch orders");
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
      setFormError(err instanceof Error ? err.message : "Invalid form input");
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
        throw new Error(body.message ?? "Failed to create order");
      }

      setDrawerOpen(false);
      setForm(initialForm);
      setReloadTick((tick) => tick + 1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Orders</h2>
            <p className="mt-1 text-sm text-slate-300">
              Borrower, principal, next due and status overview.
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
              New Order
            </button>
          </div>
        </div>

        {loading ? <p className="text-sm text-slate-300">Loading orders...</p> : null}

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {!loading && !error && orders.length === 0 ? (
          <p className="text-sm text-slate-300">No orders found for current filter.</p>
        ) : null}

        {!loading && !error && orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-300">
                  <th className="px-2 py-3 font-medium">Borrower</th>
                  <th className="px-2 py-3 font-medium">Order No</th>
                  <th className="px-2 py-3 font-medium">Principal</th>
                  <th className="px-2 py-3 font-medium">Next Due</th>
                  <th className="px-2 py-3 font-medium">Status</th>
                  <th className="px-2 py-3 font-medium">Action</th>
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
                        {order.status}
                      </td>
                      <td className="px-2 py-3">
                        <Link
                          href={`/orders/${order.id}`}
                          className="rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
                        >
                          Detail
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
            aria-label="Close new order drawer"
            className="absolute inset-0 bg-black/50"
            onClick={() => !creating && setDrawerOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto border-l border-white/10 bg-slate-950 p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Create Order</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Submit once to create order and repayment plans.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md border border-white/20 px-2 py-1 text-xs text-slate-200"
                onClick={() => !creating && setDrawerOpen(false)}
              >
                Close
              </button>
            </div>

            <form className="space-y-4" onSubmit={submitCreateOrder}>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-300">Borrower *</span>
                <input
                  value={form.borrowerName}
                  onChange={(e) => setForm((prev) => ({ ...prev, borrowerName: e.target.value }))}
                  className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                  placeholder="Borrower name"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-slate-300">Phone</span>
                <input
                  value={form.borrowerPhone}
                  onChange={(e) => setForm((prev) => ({ ...prev, borrowerPhone: e.target.value }))}
                  className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                  placeholder="13800000000"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-slate-300">Principal *</span>
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
                  <span className="mb-1 block text-xs text-slate-300">Monthly Rate *</span>
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
                  <span className="mb-1 block text-xs text-slate-300">Start Date *</span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-slate-300">Months *</span>
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
                <span className="mb-1 block text-xs text-slate-300">Collateral</span>
                <input
                  value={form.collateralDesc}
                  onChange={(e) => setForm((prev) => ({ ...prev, collateralDesc: e.target.value }))}
                  className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                  placeholder="Gold, phone, etc."
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs text-slate-300">Notes</span>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="min-h-24 w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                  placeholder="Optional notes"
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md border border-cyan-300/60 bg-cyan-400/20 px-4 py-2 text-sm text-cyan-100 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Order"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
