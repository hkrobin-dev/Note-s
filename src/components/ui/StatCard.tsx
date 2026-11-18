import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const TONES = {
  neutral: "text-ink-2",
  accent: "text-accent",
  positive: "text-positive",
  warning: "text-warning",
  error: "text-error",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="type-caption truncate font-medium text-ink-3">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-xl border border-line bg-surface-2",
              TONES[tone],
            )}
          >
            <Icon size={15} aria-hidden />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "tabular mt-3 truncate text-[1.375rem] leading-none font-semibold tracking-[-0.02em] sm:text-[1.625rem]",
          tone === "neutral" ? "text-ink" : TONES[tone],
        )}
      >
        {value}
      </p>
      {hint ? <p className="type-caption mt-2 truncate text-ink-3">{hint}</p> : null}
    </div>
  );
}
