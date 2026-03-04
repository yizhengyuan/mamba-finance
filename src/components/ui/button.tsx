import { cn } from "@/lib/ui/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "border-cyan-300/60 bg-cyan-400/20 text-cyan-100 hover:bg-cyan-300/25 hover:border-cyan-200/80",
  secondary:
    "border-slate-400/40 bg-slate-800/40 text-slate-100 hover:bg-slate-700/45 hover:border-slate-300/60",
  ghost: "border-white/20 bg-transparent text-slate-100 hover:bg-white/10",
  danger:
    "border-rose-300/55 bg-rose-500/15 text-rose-100 hover:bg-rose-500/25 hover:border-rose-200/70",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
};

export function UIButton({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    />
  );
}
