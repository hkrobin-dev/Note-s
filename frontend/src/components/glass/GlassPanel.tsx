import { cn } from "@/lib/utils";

type GlassProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "primary" | "elevated" | "interactive" | "inset";
};

export function GlassPanel({ variant = "primary", className, ...rest }: GlassProps) {
  return (
    <div
      className={cn(
        variant === "primary" && "panel",
        variant === "elevated" && "glass-elevated",
        variant === "interactive" && "glass-interactive",
        variant === "inset" && "glass-inset",
        className,
      )}
      {...rest}
    />
  );
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}

export function StatTile({ label, value, sub, tone, icon: Icon }: { label: string; value: string | number; sub?: string; tone?: "positive" | "warning" | "error"; icon?: React.ElementType }) {
  return (
    <div className="panel kpi">
      <div className="flex items-start justify-between gap-3">
        <span className="kpi-label">{label}</span>
        {Icon && <span className="kpi-icon"><Icon size={16} /></span>}
      </div>
      <div className={cn(
        "kpi-value",
        tone === "positive" && "text-positive",
        tone === "warning" && "text-warning",
        tone === "error" && "text-error",
      )}>
        {value}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
      <div className="kpi-rule" />
    </div>
  );
}
