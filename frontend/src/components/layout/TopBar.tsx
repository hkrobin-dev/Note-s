"use client";

import { usePathname, useRouter } from "next/navigation";
import { Search, Moon, Sun, LogOut } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { API_URL } from "@/lib/api";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/tasks": "Tasks",
  "/calendar": "Calendar",
  "/notes": "Notes",
  "/projects": "Projects",
  "/settings": "Settings",
};

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  function openSearch() {
    window.dispatchEvent(new Event("open-command-palette"));
  }

  async function signOut() {
    await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => undefined);
    router.replace("/login");
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">My Life OS</div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">{TITLES[pathname ?? ""] ?? "Workspace"}</h1>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={openSearch} className="search-trigger md:w-64" aria-label="Open search">
          <Search size={15} />
          <span>Search anything…</span>
          <kbd>⌘K</kbd>
        </button>
        <NotificationBell />
        <button
          onClick={toggleTheme}
          className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition-colors hover:border-accent hover:text-accent"
          aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button
          onClick={signOut}
          className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink-2 transition-colors hover:border-accent hover:text-accent"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
