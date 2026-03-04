import { UIButton } from "@/components/ui/button";
import { UICard } from "@/components/ui/card";
import { UIFormField, UIInput, UISelect } from "@/components/ui/form-field";
import { UIStatusBadge } from "@/components/ui/status-badge";

const tokenList = [
  { name: "主色", value: "var(--brand)", preview: "bg-cyan-400" },
  { name: "成功色", value: "var(--success)", preview: "bg-emerald-400" },
  { name: "警告色", value: "var(--warning)", preview: "bg-amber-400" },
  { name: "风险色", value: "var(--danger)", preview: "bg-rose-400" },
  { name: "面板背景", value: "var(--surface-2)", preview: "bg-slate-700" },
  { name: "柔和边框", value: "var(--border-soft)", preview: "bg-slate-400" },
];

export default function UiLabPage() {
  return (
    <section className="space-y-5">
      <header className="ui-panel p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-cyan-300/90">UI Lab</p>
        <h2 className="mt-1 text-2xl font-semibold">前端设计实验室</h2>
        <p className="mt-2 text-sm text-slate-300">
          这里用于高频试验 UI，不直接影响业务页面。先在本页通过，再迁移到订单、账户、看板。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <UICard title="按钮系统" description="统一主次操作层级与危险动作样式">
          <div className="flex flex-wrap gap-2">
            <UIButton>确认提交</UIButton>
            <UIButton variant="secondary">次级操作</UIButton>
            <UIButton variant="ghost">文字按钮</UIButton>
            <UIButton variant="danger">删除数据</UIButton>
            <UIButton disabled>禁用状态</UIButton>
          </div>
        </UICard>

        <UICard title="状态标签" description="统一订单与还款状态的视觉表达">
          <div className="flex flex-wrap gap-2">
            <UIStatusBadge tone="active">执行中</UIStatusBadge>
            <UIStatusBadge tone="paid">已结清</UIStatusBadge>
            <UIStatusBadge tone="overdue">逾期</UIStatusBadge>
            <UIStatusBadge tone="draft">草稿</UIStatusBadge>
          </div>
        </UICard>

        <UICard title="表单骨架" description="输入框、下拉框、提示文字统一样式">
          <form className="space-y-3">
            <UIFormField label="借款人" required hint="真实姓名或昵称">
              <UIInput placeholder="例如：王某某" />
            </UIFormField>
            <UIFormField label="收款账户" required>
              <UISelect defaultValue="">
                <option value="" disabled>
                  请选择账户
                </option>
                <option value="cash">现金账户</option>
                <option value="wechat">微信收款</option>
              </UISelect>
            </UIFormField>
            <div className="flex justify-end gap-2 pt-2">
              <UIButton variant="ghost" size="sm">
                取消
              </UIButton>
              <UIButton size="sm">保存</UIButton>
            </div>
          </form>
        </UICard>

        <UICard title="设计变量（Tokens）" description="颜色和语义变量统一维护在 globals.css">
          <div className="space-y-2">
            {tokenList.map((token) => (
              <div
                key={token.name}
                className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${token.preview}`} />
                  <span className="text-sm text-slate-200">{token.name}</span>
                </div>
                <span className="text-xs text-slate-400">{token.value}</span>
              </div>
            ))}
          </div>
        </UICard>
      </div>
    </section>
  );
}
