import { cn } from "@/lib/ui/cn";

type BadgeTone = "active" | "paid" | "overdue" | "draft";

const toneClass: Record<BadgeTone, string> = {
  active: "border-slate-300 bg-slate-100 text-slate-700",
  paid: "border-emerald-300 bg-emerald-50 text-emerald-700",
  overdue: "border-rose-300 bg-rose-50 text-rose-700",
  draft: "border-slate-300 bg-slate-100 text-slate-600",
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
