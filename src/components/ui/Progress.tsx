import { cn } from "@/lib/utils";

const TONES = {
  accent: "bg-accent",
  positive: "bg-positive",
  warning: "bg-warning",
  error: "bg-error",
} as const;

export function Progress({
  value,
  tone = "accent",
  className,
}: {
  value: number;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-300", TONES[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
