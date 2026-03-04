"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AttachmentLightbox } from "@/components/attachments/lightbox";
import { UIButton } from "@/components/ui/button";
import { UIFormField, UIInput, UISelect } from "@/components/ui/form-field";
import { UIStatusBadge } from "@/components/ui/status-badge";

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
    return "转账回单";
  }
  if (category === "collateral_photo") {
    return "抵押物照片";
  }

  return "其他";
}

function formatAccountType(type: string): string {
  if (type === "cash") return "现金";
  if (type === "bank_card") return "银行卡";
  if (type === "wechat") return "微信";
  if (type === "alipay") return "支付宝";
  return "其他";
}

function isImage(attachment: AttachmentItem): boolean {
  return (attachment.mimeType ?? "").startsWith("image/");
}

function orderStatusLabel(status: OrderDetail["status"]): string {
  if (status === "active") return "执行中";
  if (status === "overdue") return "逾期";
  return "已结清";
}

function planStatusLabel(status: RepaymentPlanItem["status"]): string {
  if (status === "pending") return "待收";
  if (status === "overdue") return "逾期";
  return "已收";
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
          throw new Error(body.message ?? "加载订单详情失败");
        }

        if (!cancelled) {
          setOrder(body.data ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载订单详情失败");
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accountId,
          amount: Number(collectPlan.totalDue),
          occurredAt: new Date(occurredAt).toISOString(),
          note: `核销第${collectPlan.periodIndex}期`,
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

  async function deleteCurrentAttachment() {
    if (previewIndex === null) {
      return;
    }

    const attachment = imageAttachments[previewIndex];
    if (!attachment) {
      return;
    }

    const confirmed = window.confirm(`确认删除附件「${attachment.fileName}」吗？`);
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
        throw new Error(body.message ?? "删除附件失败");
      }

      setPreviewIndex(null);
      setRefreshTick((tick) => tick + 1);
    } catch (err) {
      setAttachmentError(err instanceof Error ? err.message : "删除附件失败");
    } finally {
      setDeletingAttachment(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">订单详情</h2>
            <p className="mt-1 text-sm text-slate-300">订单 ID：{orderId}</p>
          </div>
          <Link
            href="/orders"
            className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
          >
            返回订单列表
          </Link>
        </div>

        {loading ? <p className="text-sm text-slate-300">订单详情加载中...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        {!loading && !error && order ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="订单编号" value={order.orderNo} mono />
            <Info label="借款人" value={order.borrowerName} />
            <Info label="手机号" value={order.borrowerPhone ?? "-"} />
            <Info label="本金" value={formatCurrency(order.principal)} />
            <Info label="月利率" value={order.monthlyRate} />
            <Info label="期数" value={String(order.months)} />
            <Info label="起息日期" value={formatDate(order.startDate)} />
            <Info label="状态" value={orderStatusLabel(order.status)} />
            <Info label="抵押物" value={order.collateralDesc ?? "-"} />
            <Info label="备注" value={order.notes ?? "-"} full />
          </div>
        ) : null}
      </div>

      {!loading && !error && order ? (
        <>
          <section className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
            <h3 className="mb-3 text-lg font-semibold">还款计划</h3>
            {order.repaymentPlans.length === 0 ? (
              <p className="text-sm text-slate-300">暂无还款计划。</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-300">
                      <th className="px-2 py-2 font-medium">期次</th>
                      <th className="px-2 py-2 font-medium">到期日</th>
                      <th className="px-2 py-2 font-medium">利息</th>
                      <th className="px-2 py-2 font-medium">本金</th>
                      <th className="px-2 py-2 font-medium">合计</th>
                      <th className="px-2 py-2 font-medium">状态</th>
                      <th className="px-2 py-2 font-medium">实收时间</th>
                      <th className="px-2 py-2 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.repaymentPlans.map((plan) => (
                      <tr key={plan.id} className="border-b border-white/5 text-slate-100">
                        <td className="px-2 py-2">第 {plan.periodIndex} 期</td>
                        <td className="px-2 py-2">{formatDate(plan.dueDate)}</td>
                        <td className="px-2 py-2">{formatCurrency(plan.interestDue)}</td>
                        <td className="px-2 py-2">{formatCurrency(plan.principalDue)}</td>
                        <td className="px-2 py-2">{formatCurrency(plan.totalDue)}</td>
                        <td className="px-2 py-2">
                          <UIStatusBadge
                            tone={
                              plan.status === "overdue"
                                ? "overdue"
                                : plan.status === "paid"
                                  ? "paid"
                                  : "active"
                            }
                          >
                            {planStatusLabel(plan.status)}
                          </UIStatusBadge>
                        </td>
                        <td className="px-2 py-2">{formatDate(plan.paidAt)}</td>
                        <td className="px-2 py-2">
                          {plan.status === "paid" ? (
                            <span className="text-xs text-slate-400">已结清</span>
                          ) : (
                            <UIButton
                              type="button"
                              size="sm"
                              onClick={() => {
                                setCollectPlan(plan);
                                setCollectError(null);
                                setOccurredAt(defaultOccurredAtLocal());
                              }}
                            >
                              核销
                            </UIButton>
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
            <h3 className="mb-3 text-lg font-semibold">附件墙</h3>
            {attachmentError ? <p className="mb-3 text-sm text-rose-300">{attachmentError}</p> : null}
            {order.attachments.length === 0 ? (
              <p className="text-sm text-slate-300">暂无已上传附件。</p>
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
                          暂无预览
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
            aria-label="关闭核销弹窗"
            onClick={() => !collecting && setCollectPlan(null)}
          />
          <form
            onSubmit={submitCollect}
            className="relative z-10 w-full max-w-md rounded-xl border border-white/15 bg-slate-950 p-5"
          >
            <h4 className="text-base font-semibold">核销回款</h4>
            <p className="mt-1 text-xs text-slate-300">
              第 {collectPlan.periodIndex} 期 · 应收 {formatCurrency(collectPlan.totalDue)}
            </p>

            <UIFormField className="mt-4" label="收款账户" required>
              <UISelect
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
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
                onChange={(e) => setOccurredAt(e.target.value)}
                required
              />
            </UIFormField>

            {collectError ? <p className="mt-3 text-sm text-rose-300">{collectError}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <UIButton
                type="button"
                onClick={() => setCollectPlan(null)}
                disabled={collecting}
                size="sm"
                variant="ghost"
              >
                取消
              </UIButton>
              <UIButton
                type="submit"
                disabled={collecting}
                size="sm"
              >
                {collecting ? "核销中..." : "确认核销"}
              </UIButton>
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
      {value ? <p className={`mt-1 text-sm text-slate-100 ${mono ? "font-mono" : ""}`}>{value}</p> : null}
    </div>
  );
}
