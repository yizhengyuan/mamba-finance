import { cn } from "@/lib/ui/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const variantClass: Record<ButtonVariant, string> = {
  primary:
    "border-slate-700/20 bg-slate-800 text-white hover:bg-slate-700",
  secondary:
    "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200",
  ghost: "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
  danger:
    "border-rose-300 bg-rose-600 text-white hover:bg-rose-500",
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
