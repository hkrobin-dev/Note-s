"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";
  return (
    <button
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      className={cn("glass-interactive size-9 place-items-center text-ink-2", className)}
    >
      {isLight ? <Moon size={16} className="text-accent" /> : <Sun size={16} className="text-accent-2" />}
      <span className="sr-only">{isLight ? "Light theme" : "Dark theme"}</span>
    </button>
  );
}
