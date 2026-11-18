"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  FolderKanban,
  BookOpen,
  Wallet,
  ChartNoAxesColumn,
  Bell,
  Files,
  Search,
  Settings,
  Plus,
  X,
  Menu,
  Layers3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const GROUPS: {
  label: string;
  items: { href: string; label: string; icon: React.ElementType }[];
}[] = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Work",
    items: [
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/calendar", label: "Calendar", icon: Calendar },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/notes", label: "Notes", icon: BookOpen },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/expenses", label: "Expenses", icon: Wallet },
      { href: "/reports", label: "Budgets & reports", icon: ChartNoAxesColumn },
    ],
  },
  {
    label: "Utilities",
    items: [
      { href: "/reminders", label: "Reminders", icon: Bell },
      { href: "/files", label: "Files", icon: Files },
      { href: "/search", label: "Search", icon: Search },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onNavigate}
      className="flex items-center gap-3 px-4 py-5 transition-opacity hover:opacity-90"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-accent text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]">
        <Layers3 size={18} strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] leading-tight font-semibold tracking-tight text-ink">
          My Life OS
        </span>
        <span className="block truncate text-[11px] leading-tight text-ink-3">
          Personal workspace
        </span>
      </span>
    </Link>
  );
}

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-6 px-3 pb-4">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2.5 text-[10px] font-semibold tracking-[0.1em] text-ink-3 uppercase">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-8.5 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-surface-2 text-ink"
                        : "text-ink-2 hover:bg-surface-2/60 hover:text-ink",
                    )}
                  >
                    {active ? (
                      <span className="absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
                    ) : null}
                    <Icon
                      size={16}
                      strokeWidth={1.9}
                      className={active ? "text-accent" : "text-ink-3"}
                      aria-hidden
                    />
                    <span className="truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <Brand onNavigate={onNavigate} />
      <div className="px-3">
        <Link
          href="/quick-add"
          onClick={onNavigate}
          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-accent text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16)] transition-colors hover:bg-accent-hover"
        >
          <Plus size={15} aria-hidden />
          Quick add
        </Link>
      </div>
      <div className="mt-4 flex-1 overflow-y-auto">
        <NavItems onNavigate={onNavigate} />
      </div>
      <div className="mt-auto space-y-2 border-t border-line p-3">
        <ThemeToggle variant="row" />
        <p className="flex items-center gap-2 px-2.5 py-1 text-[11px] text-ink-3">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-positive opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-positive" />
          </span>
          Local workspace
        </p>
      </div>
    </>
  );
}

/** Desktop sidebar. */
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col border-r border-line bg-base-2 lg:flex">
      <SidebarBody />
    </aside>
  );
}

/** Mobile top bar + navigation drawer. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 flex min-h-14 w-full items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 shadow-sm backdrop-blur-md lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={open}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-ink-2 shadow-[var(--shadow-card)]"
        >
          <Menu size={18} aria-hidden />
          <span className="text-[13px] font-medium text-ink">Menu</span>
        </button>
        <Link href="/" className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-ink">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-accent text-white">
            <Layers3 size={13} aria-hidden />
          </span>
          <span className="truncate">My Life OS</span>
        </Link>
        <Link
          href="/quick-add"
          aria-label="Quick add"
          className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.16)]"
        >
          <Plus size={18} aria-hidden />
        </Link>
      </header>

      {open ? (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button
            type="button"
            aria-label="Close navigation"
            className="animate-fade-in absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="animate-fade-in relative flex h-full w-[min(20rem,88vw)] max-w-[320px] flex-col border-r border-line bg-base-2 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between pr-3">
              <Brand onNavigate={() => setOpen(false)} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="grid size-9 place-items-center rounded-lg border border-line bg-surface text-ink-3 hover:bg-surface-2 hover:text-ink"
              >
                <X size={17} aria-hidden />
              </button>
            </div>
            <SidebarBody onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
