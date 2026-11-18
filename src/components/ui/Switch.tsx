"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2 text-xs font-medium text-ink-2 transition-colors hover:text-ink"
    >
      <span
        className={cn(
          "relative h-4.5 w-8 shrink-0 rounded-full border transition-colors",
          checked ? "border-accent bg-accent" : "border-line-strong bg-surface-3",
        )}
        aria-hidden
      >
        <span
          className={cn(
            "absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-white transition-all",
            checked ? "left-4" : "left-0.5 bg-ink-3 group-hover:bg-ink-2",
          )}
        />
      </span>
      {label}
    </button>
  );
}
