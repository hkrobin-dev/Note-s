import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Alert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
  className?: string;
}) {
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs",
        tone === "error" && "border-error/25 bg-error-soft text-error",
        tone === "success" && "border-positive/25 bg-positive-soft text-positive",
        tone === "info" && "border-line bg-surface-2 text-ink-2",
        className,
      )}
    >
      <Icon size={15} className="mt-px shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
