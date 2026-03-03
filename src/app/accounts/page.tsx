"use client";

import { useEffect, useState } from "react";

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
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-md border border-cyan-300/60 bg-cyan-400/20 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-300/30"
        >
          新建账户
        </button>
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
                  <td className="px-2 py-3 text-xs uppercase tracking-wide text-cyan-200">
                    {account.isActive ? "启用" : "停用"}
                  </td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={() => openEdit(account)}
                      className="rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
                    >
                      编辑
                    </button>
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
            <Field label="名称 *">
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                required
              />
            </Field>

            <Field label="类型 *">
              <select
                value={createForm.type}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, type: e.target.value as AccountType }))
                }
                className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
              >
                {accountTypes.map((type) => (
                  <option key={type} value={type}>
                    {typeLabel(type)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="期初余额 *">
              <input
                type="number"
                min="0"
                step="0.01"
                value={createForm.openingBalance}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, openingBalance: e.target.value }))
                }
                className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                required
              />
            </Field>

            {createError ? <p className="text-sm text-rose-300">{createError}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={createSubmitting}
                onClick={() => setCreateOpen(false)}
                className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={createSubmitting}
                className="rounded-md border border-cyan-300/60 bg-cyan-400/20 px-3 py-1.5 text-xs text-cyan-100 disabled:opacity-50"
              >
                {createSubmitting ? "创建中..." : "创建"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editing ? (
        <Modal title="编辑账户" onClose={() => !editSubmitting && setEditing(null)}>
          <form className="space-y-3" onSubmit={submitEdit}>
            <Field label="名称 *">
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
                required
              />
            </Field>

            <Field label="类型 *">
              <select
                value={editForm.type}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, type: e.target.value as AccountType }))
                }
                className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
              >
                {accountTypes.map((type) => (
                  <option key={type} value={type}>
                    {typeLabel(type)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="状态">
              <select
                value={editForm.isActive ? "active" : "inactive"}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, isActive: e.target.value === "active" }))
                }
                className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm"
              >
                <option value="active">启用</option>
                <option value="inactive">停用</option>
              </select>
            </Field>

            {editError ? <p className="text-sm text-rose-300">{editError}</p> : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={editSubmitting}
                onClick={() => setEditing(null)}
                className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                className="rounded-md border border-cyan-300/60 bg-cyan-400/20 px-3 py-1.5 text-xs text-cyan-100 disabled:opacity-50"
              >
                {editSubmitting ? "保存中..." : "保存"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-300">{label}</span>
      {children}
    </label>
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
            className="rounded-md border border-white/20 px-2 py-1 text-xs text-slate-200"
          >
            关闭
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
