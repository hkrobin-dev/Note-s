"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

/**
 * The icon and knob reflect the current theme purely through CSS (the `dark:`
 * variant is bound to <html data-theme>), so the markup rendered on the server
 * and on the client's first render are identical — no hydration mismatch.
 */
export function ThemeToggle({
  className,
  variant = "icon",
}: {
  className?: string;
  variant?: "icon" | "row";
}) {
  const { toggleTheme } = useTheme();

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle color theme"
        className={cn(
          "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink",
          className,
        )}
      >
        <Sun size={16} strokeWidth={1.9} className="hidden text-ink-3 dark:block" aria-hidden />
        <Moon size={16} strokeWidth={1.9} className="block text-ink-3 dark:hidden" aria-hidden />
        <span className="flex-1 text-left">Appearance</span>
        <span className="relative h-4.5 w-8 rounded-full border border-line bg-surface-3">
          <span className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-accent transition-all left-0.5 dark:left-4 dark:bg-ink-2" />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      className={cn(
        "grid size-9 place-items-center rounded-lg border border-line bg-surface text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      <Sun size={16} className="hidden dark:block" aria-hidden />
      <Moon size={16} className="block dark:hidden" aria-hidden />
    </button>
  );
}
