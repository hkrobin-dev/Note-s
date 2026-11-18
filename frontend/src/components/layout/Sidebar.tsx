"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  LayoutDashboard, BarChart3, ListTodo, CalendarDays, Clock, Activity, Timer, Bell,
  Inbox, Handshake, FileText, NotebookPen, FolderOpen, CreditCard, Wallet, PiggyBank,
  FolderKanban, Target, Code2, Settings, Moon, Sun, Menu, X, Search, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

const NAV_GROUPS: { label: string; items: { name: string; href: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Ask your life", href: "/ask", icon: Sparkles },
      { name: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
  {
    label: "Plan",
    items: [
      { name: "Tasks", href: "/tasks", icon: ListTodo },
      { name: "Calendar", href: "/calendar", icon: CalendarDays },
      { name: "Routines", href: "/routines", icon: Clock },
      { name: "Habits", href: "/habits", icon: Activity },
      { name: "Time Log", href: "/time-log", icon: Timer },
      { name: "Reminders", href: "/reminders", icon: Bell },
      { name: "Notifications", href: "/notifications", icon: Inbox },
      { name: "Meetings", href: "/meetings", icon: Handshake },
    ],
  },
  {
    label: "Capture",
    items: [
      { name: "Notes", href: "/notes", icon: FileText },
      { name: "Workspace", href: "/workspace", icon: NotebookPen },
      { name: "Files", href: "/files", icon: FolderOpen },
    ],
  },
  {
    label: "Money",
    items: [
      { name: "Expenses", href: "/expenses", icon: CreditCard },
      { name: "Income", href: "/income", icon: Wallet },
      { name: "Budgets", href: "/budgets", icon: PiggyBank },
    ],
  },
  {
    label: "Organize",
    items: [
      { name: "Projects", href: "/projects", icon: FolderKanban },
      { name: "Goals", href: "/goals", icon: Target },
    ],
  },
  {
    label: "Develop",
    items: [{ name: "Dev Workspace", href: "/dev", icon: Code2 }],
  },
];

const MOBILE_TABS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

function openSearch() {
  window.dispatchEvent(new Event("open-command-palette"));
}

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const d: any = await api.notifications.list({ unreadOnly: "true" });
        if (!cancelled) setUnread(d.unreadCount ?? (d.notifications ?? []).length);
      } catch {
        /* badge is best-effort */
      }
    }
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile trigger — sits outside the drawer so it is always reachable */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed left-4 top-4 z-50 grid size-10 place-items-center rounded-xl border border-line bg-surface text-ink shadow-lg lg:hidden",
          isOpen && "hidden",
        )}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {isOpen && (
        <button
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17rem] shrink-0 flex-col border-r border-line bg-surface transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <button
          onClick={() => setIsOpen(false)}
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 lg:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <div className="brand-mark overflow-hidden p-1">
            <Image src="/logo.png" alt="My Life OS logo" width={639} height={510} className="size-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight text-ink">My Life OS</div>
            <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">Personal system</div>
          </div>
        </div>

        <div className="px-3">
          <button onClick={openSearch} className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-ink-3 transition-colors hover:border-accent hover:text-ink-2">
            <Search size={15} />
            <span>Quick search</span>
            <kbd className="ml-auto rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </button>
        </div>

        <nav className="no-scrollbar mt-2 flex-1 overflow-y-auto px-3 pb-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="nav-group-label">{group.label}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  const badge = item.href === "/notifications" ? unread : 0;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      data-active={active}
                      className="nav-item"
                    >
                      <Icon size={17} className="shrink-0" strokeWidth={active ? 2.2 : 1.9} />
                      <span className="flex-1 truncate">{item.name}</span>
                      {badge > 0 && (
                        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[10px] font-semibold text-accent-ink tabular">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <button onClick={toggleTheme} className="nav-item w-full" aria-label="Toggle theme">
            {theme === "light" ? <Moon size={17} className="shrink-0" /> : <Sun size={17} className="shrink-0" />}
            {theme === "light" ? "Dark mode" : "Light mode"}
          </button>
          <Link href="/settings" className="nav-item mt-0.5 w-full">
            <Settings size={17} className="shrink-0" /> Settings
          </Link>
        </div>
      </aside>
    </>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="flex items-center justify-around px-3 py-2">
        {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : !!pathname?.startsWith(href);
          return (
            <Link key={href} href={href} className="flex min-w-14 flex-col items-center gap-1 rounded-lg px-2 py-1" aria-current={active ? "page" : undefined}>
              <Icon size={19} strokeWidth={active ? 2.3 : 1.9} className={active ? "text-accent" : "text-ink-3"} aria-hidden />
              <span className={cn("text-[10px] font-medium leading-none", active ? "text-accent" : "text-ink-3")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
