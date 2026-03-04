"use client";

import { useEffect, useState } from "react";
import { UIButton } from "@/components/ui/button";
import { UIFormField, UIInput, UISelect } from "@/components/ui/form-field";
import { UIStatusBadge } from "@/components/ui/status-badge";

type AccountType = "cash" | "bank_card" | "wechat" | "alipay" | "other";

interface AccountItem {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalance: string;
  currentBalance: string;
  isActive: boolean;
  createdAt: string;
}

const accountTypes: AccountType[] = ["cash", "bank_card", "wechat", "alipay", "other"];

function money(value: string): string {
  const num = Number(value);
  return Number.isFinite(num)
    ? `¥${num.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : value;
}

function typeLabel(type: AccountType): string {
  if (type === "bank_card") {
    return "银行卡";
  }

  if (type === "cash") return "现金";
  if (type === "wechat") return "微信";
  if (type === "alipay") return "支付宝";
  return "其他";
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    name: "",
    type: "cash" as AccountType,
    openingBalance: "0",
  });

  const [editing, setEditing] = useState<AccountItem | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "cash" as AccountType,
    isActive: true,
  });

  async function loadAccounts() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/accounts", { cache: "no-store" });
      const body = (await response.json()) as { data?: AccountItem[]; message?: string };

      if (!response.ok) {
        throw new Error(body.message ?? "加载账户失败");
      }

      setAccounts(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载账户失败");
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function submitCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);

    const openingBalance = Number(createForm.openingBalance);
    if (!createForm.name.trim()) {
      setCreateError("请输入账户名称");
      return;
    }

    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      setCreateError("期初余额必须大于等于 0");
      return;
    }

    setCreateSubmitting(true);
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          type: createForm.type,
          openingBalance,
        }),
      });

      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? "创建账户失败");
      }

      setCreateOpen(false);
      setCreateForm({ name: "", type: "cash", openingBalance: "0" });
      await loadAccounts();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "创建账户失败");
    } finally {
      setCreateSubmitting(false);
    }
  }

  function openEdit(account: AccountItem) {
    setEditing(account);
    setEditForm({
      name: account.name,
      type: account.type,
      isActive: account.isActive,
    });
    setEditError(null);
  }

  async function submitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) {
      return;
    }

    if (!editForm.name.trim()) {
      setEditError("请输入账户名称");
      return;
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      const response = await fetch(`/api/accounts/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          type: editForm.type,
          isActive: editForm.isActive,
        }),
      });

      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? "更新账户失败");
      }

      setEditing(null);
      await loadAccounts();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "更新账户失败");
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">账户管理</h2>
          <p className="mt-1 text-sm text-slate-300">
            管理资金账户、账户类型与启用状态。
          </p>
        </div>
        <UIButton size="sm" onClick={() => setCreateOpen(true)}>
          新建账户
        </UIButton>
      </div>

      {loading ? <p className="text-sm text-slate-300">账户加载中...</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {!loading && !error && accounts.length === 0 ? (
        <p className="text-sm text-slate-300">暂无账户。</p>
      ) : null}

      {!loading && !error && accounts.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-slate-300">
                <th className="px-2 py-3 font-medium">名称</th>
                <th className="px-2 py-3 font-medium">类型</th>
                <th className="px-2 py-3 font-medium">币种</th>
                <th className="px-2 py-3 font-medium">期初</th>
                <th className="px-2 py-3 font-medium">当前</th>
                <th className="px-2 py-3 font-medium">状态</th>
                <th className="px-2 py-3 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b border-white/5 text-slate-100">
                  <td className="px-2 py-3">{account.name}</td>
                  <td className="px-2 py-3">{typeLabel(account.type)}</td>
                  <td className="px-2 py-3">{account.currency}</td>
                  <td className="px-2 py-3">{money(account.openingBalance)}</td>
                  <td className="px-2 py-3">{money(account.currentBalance)}</td>
                  <td className="px-2 py-3">
                    <UIStatusBadge tone={account.isActive ? "active" : "draft"}>
                      {account.isActive ? "启用" : "停用"}
                    </UIStatusBadge>
                  </td>
                  <td className="px-2 py-3">
                    <UIButton type="button" variant="ghost" size="sm" onClick={() => openEdit(account)}>
                      编辑
                    </UIButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {createOpen ? (
        <Modal title="新建账户" onClose={() => !createSubmitting && setCreateOpen(false)}>
          <form className="space-y-3" onSubmit={submitCreate}>
            <UIFormField label="名称" required>
              <UIInput
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </UIFormField>

            <UIFormField label="类型" required>
              <UISelect
                value={createForm.type}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, type: e.target.value as AccountType }))
                }
              >
                {accountTypes.map((type) => (
                  <option key={type} value={type}>
                    {typeLabel(type)}
                  </option>
                ))}
              </UISelect>
            </UIFormField>

            <UIFormField label="期初余额" required>
              <UIInput
                type="number"
                min="0"
                step="0.01"
                value={createForm.openingBalance}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, openingBalance: e.target.value }))
                }
                required
              />
            </UIFormField>

            {createError ? <p className="text-sm text-rose-300">{createError}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <UIButton
                type="button"
                disabled={createSubmitting}
                onClick={() => setCreateOpen(false)}
                variant="ghost"
                size="sm"
              >
                取消
              </UIButton>
              <UIButton
                type="submit"
                disabled={createSubmitting}
                size="sm"
              >
                {createSubmitting ? "创建中..." : "创建"}
              </UIButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {editing ? (
        <Modal title="编辑账户" onClose={() => !editSubmitting && setEditing(null)}>
          <form className="space-y-3" onSubmit={submitEdit}>
            <UIFormField label="名称" required>
              <UIInput
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </UIFormField>

            <UIFormField label="类型" required>
              <UISelect
                value={editForm.type}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, type: e.target.value as AccountType }))
                }
              >
                {accountTypes.map((type) => (
                  <option key={type} value={type}>
                    {typeLabel(type)}
                  </option>
                ))}
              </UISelect>
            </UIFormField>

            <UIFormField label="状态">
              <UISelect
                value={editForm.isActive ? "active" : "inactive"}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))
                }
              >
                <option value="active">启用</option>
                <option value="inactive">停用</option>
              </UISelect>
            </UIFormField>

            {editError ? <p className="text-sm text-rose-300">{editError}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <UIButton
                type="button"
                disabled={editSubmitting}
                onClick={() => setEditing(null)}
                variant="ghost"
                size="sm"
              >
                取消
              </UIButton>
              <UIButton
                type="submit"
                disabled={editSubmitting}
                size="sm"
              >
                {editSubmitting ? "保存中..." : "保存"}
              </UIButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <button
        type="button"
        aria-label={`关闭${title}`}
        className="absolute inset-0"
        onClick={onClose}
      />
      <section className="relative z-10 w-full max-w-md rounded-xl border border-white/15 bg-slate-950 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/20 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
          >
            关闭
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
