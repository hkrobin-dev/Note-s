"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { LayoutDashboard, CheckSquare, Calendar, Wallet, Settings } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/expenses", label: "Money", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileBottomTab() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-base/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-base/80 lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors"
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-xl transition-colors",
                  active ? "bg-accent-soft text-accent" : "text-ink-3",
                )}
              >
                <Icon
                  size={19}
                  strokeWidth={active ? 2.2 : 1.8}
                  aria-hidden
                />
              </span>
              <span className={cn("leading-none", active ? "text-accent" : "text-ink-3")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
