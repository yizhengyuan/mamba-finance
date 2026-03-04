import { cn } from "@/lib/ui/cn";

type BadgeTone = "active" | "paid" | "overdue" | "draft";

const toneClass: Record<BadgeTone, string> = {
  active: "border-cyan-300/45 bg-cyan-500/15 text-cyan-100",
  paid: "border-emerald-300/45 bg-emerald-500/15 text-emerald-100",
  overdue: "border-rose-300/45 bg-rose-500/15 text-rose-100",
  draft: "border-slate-400/40 bg-slate-700/30 text-slate-200",
};

export function UIStatusBadge({
  children,
  tone = "draft",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-md border px-2 text-xs font-medium tracking-wide",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
