"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AttachmentLightbox } from "@/components/attachments/lightbox";

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

interface AccountOption {
  id: string;
  name: string;
  type: string;
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

function defaultOccurredAtLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [collectPlan, setCollectPlan] = useState<RepaymentPlanItem | null>(null);
  const [accountId, setAccountId] = useState("");
  const [occurredAt, setOccurredAt] = useState(defaultOccurredAtLocal());
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState<string | null>(null);

  const endpoint = useMemo(() => `/api/orders/${orderId}`, [orderId]);
  const imageAttachments = useMemo(
    () => (order?.attachments ?? []).filter((attachment) => isImage(attachment)),
    [order?.attachments],
  );
  const imageIndexById = useMemo(() => {
    return new Map(imageAttachments.map((item, index) => [item.id, index]));
  }, [imageAttachments]);

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
  }, [endpoint, refreshTick]);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      try {
        const response = await fetch("/api/accounts", { cache: "no-store" });
        const body = (await response.json()) as {
          data?: AccountOption[];
        };

        if (!response.ok || cancelled) {
          return;
        }

        const fetched = body.data ?? [];
        setAccounts(fetched);
        if (!accountId && fetched.length > 0) {
          setAccountId(fetched[0].id);
        }
      } catch {
        // Keep page usable even if account list fails.
      }
    }

    void loadAccounts();

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  useEffect(() => {
    if (previewIndex === null) {
      return;
    }

    if (previewIndex < 0 || previewIndex >= imageAttachments.length) {
      setPreviewIndex(null);
    }
  }, [imageAttachments.length, previewIndex]);

  async function submitCollect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!collectPlan) {
      return;
    }

    if (!accountId) {
      setCollectError("Please select an account");
      return;
    }

    if (!occurredAt) {
      setCollectError("Please choose occurred time");
      return;
    }

    setCollecting(true);
    setCollectError(null);

    try {
      const response = await fetch(`/api/repayment-plans/${collectPlan.id}/collect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          amount: Number(collectPlan.totalDue),
          occurredAt: new Date(occurredAt).toISOString(),
          note: `Collect period ${collectPlan.periodIndex}`,
        }),
      });

      const body = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(body.message ?? "Failed to collect repayment");
      }

      setCollectPlan(null);
      setRefreshTick((tick) => tick + 1);
    } catch (err) {
      setCollectError(err instanceof Error ? err.message : "Failed to collect repayment");
    } finally {
      setCollecting(false);
    }
  }

  async function deleteCurrentAttachment() {
    if (previewIndex === null) {
      return;
    }

    const attachment = imageAttachments[previewIndex];
    if (!attachment) {
      return;
    }

    const confirmed = window.confirm(`Delete attachment "${attachment.fileName}"?`);
    if (!confirmed) {
      return;
    }

    setDeletingAttachment(true);
    setAttachmentError(null);

    try {
      const response = await fetch(`/api/attachments/${attachment.id}`, {
        method: "DELETE",
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? "Failed to delete attachment");
      }

      setPreviewIndex(null);
      setRefreshTick((tick) => tick + 1);
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : "Failed to delete attachment");
    } finally {
      setDeletingAttachment(false);
    }
  }

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
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-300">
                      <th className="px-2 py-2 font-medium">Period</th>
                      <th className="px-2 py-2 font-medium">Due Date</th>
                      <th className="px-2 py-2 font-medium">Interest</th>
                      <th className="px-2 py-2 font-medium">Principal</th>
                      <th className="px-2 py-2 font-medium">Total</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-2 py-2 font-medium">Paid At</th>
                      <th className="px-2 py-2 font-medium">Action</th>
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
                        <td className="px-2 py-2">
                          {plan.status === "paid" ? (
                            <span className="text-xs text-slate-400">Settled</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setCollectPlan(plan);
                                setCollectError(null);
                                setOccurredAt(defaultOccurredAtLocal());
                              }}
                              className="rounded-md border border-cyan-300/60 px-2 py-1 text-xs text-cyan-100 hover:bg-cyan-300/20"
                            >
                              Collect
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
            <h3 className="mb-3 text-lg font-semibold">Attachment Wall</h3>
            {attachmentError ? <p className="mb-3 text-sm text-rose-300">{attachmentError}</p> : null}
            {order.attachments.length === 0 ? (
              <p className="text-sm text-slate-300">No attachments uploaded.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {order.attachments.map((attachment) => {
                  const imageIndex = imageIndexById.get(attachment.id) ?? -1;
                  const canPreview = imageIndex >= 0;
                  return (
                  <button
                    key={attachment.id}
                    type="button"
                    className="group rounded-xl border border-white/10 bg-black/20 p-2 text-left hover:bg-white/5"
                    onClick={() => canPreview && setPreviewIndex(imageIndex)}
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
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}

      {collectPlan ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Close collect dialog"
            onClick={() => !collecting && setCollectPlan(null)}
          />
          <form
            onSubmit={submitCollect}
            className="relative z-10 w-full max-w-md rounded-xl border border-white/15 bg-slate-950 p-5"
          >
            <h4 className="text-base font-semibold">Collect Repayment</h4>
            <p className="mt-1 text-xs text-slate-300">
              Period #{collectPlan.periodIndex} · {formatCurrency(collectPlan.totalDue)}
            </p>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs text-slate-300">Account *</span>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                required
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.type})
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs text-slate-300">Occurred At *</span>
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                required
              />
            </label>

            {collectError ? <p className="mt-3 text-sm text-rose-300">{collectError}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCollectPlan(null)}
                disabled={collecting}
                className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={collecting}
                className="rounded-md border border-cyan-300/60 bg-cyan-400/20 px-3 py-1.5 text-xs text-cyan-100 disabled:opacity-50"
              >
                {collecting ? "Collecting..." : "Confirm Collect"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {previewIndex !== null && imageAttachments[previewIndex] ? (
        <AttachmentLightbox
          item={{
            id: imageAttachments[previewIndex].id,
            fileName: imageAttachments[previewIndex].fileName,
            fileUrl: imageAttachments[previewIndex].fileUrl,
            createdAt: formatDate(imageAttachments[previewIndex].createdAt),
            sizeBytes: imageAttachments[previewIndex].sizeBytes,
            categoryLabel: formatCategory(imageAttachments[previewIndex].category),
          }}
          index={previewIndex}
          total={imageAttachments.length}
          onClose={() => setPreviewIndex(null)}
          onPrev={() =>
            setPreviewIndex((current) => {
              if (current === null || imageAttachments.length === 0) {
                return null;
              }
              return (current - 1 + imageAttachments.length) % imageAttachments.length;
            })
          }
          onNext={() =>
            setPreviewIndex((current) => {
              if (current === null || imageAttachments.length === 0) {
                return null;
              }
              return (current + 1) % imageAttachments.length;
            })
          }
          onDelete={deleteCurrentAttachment}
          deleting={deletingAttachment}
        />
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
