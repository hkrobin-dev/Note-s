import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
export type ButtonSize = "sm" | "md" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16)] hover:bg-accent-hover",
  secondary:
    "bg-surface text-ink border border-line hover:bg-surface-2 hover:border-line-strong",
  ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-error-soft text-error border border-error/30 hover:border-error/60",
  subtle: "bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink",
};

/* Mobile-first touch targets: 40–44px on phones, compact 32–36px from md up. */
const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 rounded-lg px-2.5 text-xs md:h-8",
  md: "h-10 gap-2 rounded-lg px-3.5 text-[13px] md:h-9",
  icon: "size-10 justify-center rounded-lg md:size-9",
};

export function buttonStyles({
  variant = "secondary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-colors",
    "disabled:pointer-events-none disabled:opacity-45",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}
