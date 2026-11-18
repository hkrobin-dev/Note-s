import { cn } from "@/lib/utils";

export function TodayHeader({ className }: { className?: string }) {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" };
  return (
    <div className={cn("glass p-6 rounded-2xl", className)}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-ink-2 tracking-wider uppercase">Good morning</p>
          <h1 className="text-3xl font-bold text-ink tracking-tight">{now.toLocaleDateString(undefined, options)}</h1>
        </div>
        <div className="flex items-end gap-3">
          <div className="text-right hidden md:block">
            <div className="text-4xl font-bold text-ink tabular">{now.getHours()}:{String(now.getMinutes()).padStart(2, "0")}</div>
            <div className="text-xs text-ink-3 uppercase tracking-wider">{now.toLocaleTimeString(undefined, { hour12: false }).slice(-6)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
