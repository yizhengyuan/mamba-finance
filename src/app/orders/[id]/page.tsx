"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface RepaymentPlanItem {
  id: string;
  periodIndex: number;
  dueDate: string;
  principalDue: string;
  interestDue: string;
  totalDue: string;
  status: "pending" | "overdue" | "paid";
  paidAt: string | null;
}

interface AttachmentItem {
  id: string;
  category: "transfer_receipt" | "collateral_photo" | "other";
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

interface OrderDetail {
  id: string;
  orderNo: string;
  borrowerName: string;
  borrowerPhone: string | null;
  principal: string;
  monthlyRate: string;
  startDate: string;
  months: number;
  collateralDesc: string | null;
  status: "active" | "overdue" | "closed";
  notes: string | null;
  repaymentPlans: RepaymentPlanItem[];
  attachments: AttachmentItem[];
}

function formatCurrency(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `¥${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : value;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCategory(category: AttachmentItem["category"]): string {
  if (category === "transfer_receipt") {
    return "Transfer Receipt";
  }
  if (category === "collateral_photo") {
    return "Collateral";
  }

  return "Other";
}

function isImage(attachment: AttachmentItem): boolean {
  return (attachment.mimeType ?? "").startsWith("image/");
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const endpoint = useMemo(() => `/api/orders/${orderId}`, [orderId]);

  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        const body = (await response.json()) as {
          data?: OrderDetail;
          message?: string;
        };

        if (!response.ok) {
          throw new Error(body.message ?? "Failed to fetch order");
        }

        if (!cancelled) {
          setOrder(body.data ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch order");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Order Detail</h2>
            <p className="mt-1 text-sm text-slate-300">Order ID: {orderId}</p>
          </div>
          <Link
            href="/orders"
            className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
          >
            Back to Orders
          </Link>
        </div>

        {loading ? <p className="text-sm text-slate-300">Loading order detail...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {!loading && !error && order ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Order No" value={order.orderNo} mono />
            <Info label="Borrower" value={order.borrowerName} />
            <Info label="Phone" value={order.borrowerPhone ?? "-"} />
            <Info label="Principal" value={formatCurrency(order.principal)} />
            <Info label="Monthly Rate" value={order.monthlyRate} />
            <Info label="Months" value={String(order.months)} />
            <Info label="Start Date" value={formatDate(order.startDate)} />
            <Info label="Status" value={order.status.toUpperCase()} />
            <Info label="Collateral" value={order.collateralDesc ?? "-"} />
            <Info label="Notes" value={order.notes ?? "-"} full />
          </div>
        ) : null}
      </div>

      {!loading && !error && order ? (
        <>
          <section className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
            <h3 className="mb-3 text-lg font-semibold">Repayment Plans</h3>
            {order.repaymentPlans.length === 0 ? (
              <p className="text-sm text-slate-300">No repayment plans.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-300">
                      <th className="px-2 py-2 font-medium">Period</th>
                      <th className="px-2 py-2 font-medium">Due Date</th>
                      <th className="px-2 py-2 font-medium">Interest</th>
                      <th className="px-2 py-2 font-medium">Principal</th>
                      <th className="px-2 py-2 font-medium">Total</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-2 py-2 font-medium">Paid At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.repaymentPlans.map((plan) => (
                      <tr key={plan.id} className="border-b border-white/5 text-slate-100">
                        <td className="px-2 py-2">#{plan.periodIndex}</td>
                        <td className="px-2 py-2">{formatDate(plan.dueDate)}</td>
                        <td className="px-2 py-2">{formatCurrency(plan.interestDue)}</td>
                        <td className="px-2 py-2">{formatCurrency(plan.principalDue)}</td>
                        <td className="px-2 py-2">{formatCurrency(plan.totalDue)}</td>
                        <td className="px-2 py-2 uppercase text-xs tracking-wide text-cyan-200">
                          {plan.status}
                        </td>
                        <td className="px-2 py-2">{formatDate(plan.paidAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
            <h3 className="mb-3 text-lg font-semibold">Attachment Wall</h3>
            {order.attachments.length === 0 ? (
              <p className="text-sm text-slate-300">No attachments uploaded.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {order.attachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    type="button"
                    className="group rounded-xl border border-white/10 bg-black/20 p-2 text-left hover:bg-white/5"
                    onClick={() => isImage(attachment) && setPreviewUrl(attachment.fileUrl)}
                  >
                    <div className="aspect-[4/3] overflow-hidden rounded-lg bg-slate-900">
                      {isImage(attachment) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={attachment.fileUrl}
                          alt={attachment.fileName}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                          No Preview
                        </div>
                      )}
                    </div>
                    <p className="mt-2 truncate text-xs text-slate-200">{attachment.fileName}</p>
                    <p className="text-[11px] text-slate-400">
                      {formatCategory(attachment.category)} · {formatDate(attachment.createdAt)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      {previewUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <button
            type="button"
            aria-label="Close image preview"
            className="absolute inset-0"
            onClick={() => setPreviewUrl(null)}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Attachment preview"
            className="relative z-10 max-h-[90vh] max-w-[90vw] rounded-xl border border-white/20"
          />
          <button
            type="button"
            className="absolute right-4 top-4 z-10 rounded-md border border-white/30 bg-black/30 px-3 py-1.5 text-xs text-white"
            onClick={() => setPreviewUrl(null)}
          >
            Close
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Info({
  label,
  value,
  mono = false,
  full = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-black/20 p-3 ${full ? "sm:col-span-2 lg:col-span-3" : ""}`}
    >
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-sm text-slate-100 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
