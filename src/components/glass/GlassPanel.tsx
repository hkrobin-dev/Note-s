import { Card, SectionHeading } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { cn } from "@/lib/utils";

type GlassProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "primary" | "elevated" | "interactive" | "inset";
};

/** Legacy surface wrapper — kept so older modules share the new card styling. */
export function GlassPanel({ variant = "primary", className, ...rest }: GlassProps) {
  return (
    <Card
      className={cn(
        variant === "inset" && "bg-surface-2 shadow-none",
        variant === "elevated" && "shadow-[var(--shadow-pop)]",
        className,
      )}
      {...rest}
    />
  );
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return <SectionHeading title={title} action={action} className="mb-3" />;
}

export function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "positive" | "warning" | "error";
}) {
  return <StatCard label={label} value={value} hint={sub} tone={tone ?? "neutral"} />;
}
