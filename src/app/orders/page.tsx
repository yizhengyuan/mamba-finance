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

const filters: Array<{ value: "" | OrderStatus; label: string }> = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "closed", label: "Closed" },
];

function formatCurrency(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `¥${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<"" | OrderStatus>("");
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [query]);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Orders</h2>
          <p className="mt-1 text-sm text-slate-300">
            Borrower, principal, next due and status overview.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-300">Loading orders...</p>
      ) : null}

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
  );
}
