"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Search, FileText, CheckSquare, FolderKanban, CalendarDays, Target, CornerDownLeft, Loader2, Code2, Bookmark, CalendarClock, Bell } from "lucide-react";

type Hit = {
  id: string;
  type: "task" | "page" | "project" | "event" | "goal" | "note" | "snippet" | "bookmark" | "meeting" | "reminder";
  title: string;
  subtitle?: string | null;
  href: string;
};

const ICONS: Record<Hit["type"], typeof Search> = {
  task: CheckSquare,
  page: FileText,
  note: FileText,
  project: FolderKanban,
  event: CalendarDays,
  goal: Target,
  snippet: Code2,
  bookmark: Bookmark,
  meeting: CalendarClock,
  reminder: Bell,
};

const QUICK_LINKS: Hit[] = [
  { id: "q-new-task", type: "task", title: "New task", subtitle: "Create", href: "/tasks?new=1" },
  { id: "q-new-event", type: "event", title: "New event", subtitle: "Create", href: "/calendar?new=1" },
  { id: "q-new-reminder", type: "reminder", title: "New reminder", subtitle: "Create", href: "/reminders?new=1" },
  { id: "q-new-project", type: "project", title: "New project", subtitle: "Create", href: "/projects?new=1" },
  { id: "q-dash", type: "page", title: "Dashboard", subtitle: "Go to", href: "/" },
  { id: "q-tasks", type: "task", title: "Tasks", subtitle: "Go to", href: "/tasks" },
  { id: "q-cal", type: "event", title: "Calendar", subtitle: "Go to", href: "/calendar" },
  { id: "q-rem", type: "reminder", title: "Reminders", subtitle: "Go to", href: "/reminders" },
  { id: "q-ws", type: "page", title: "Workspace", subtitle: "Go to", href: "/workspace" },
  { id: "q-notes", type: "note", title: "Notes", subtitle: "Go to", href: "/notes" },
  { id: "q-goals", type: "goal", title: "Goals", subtitle: "Go to", href: "/goals" },
  { id: "q-habits", type: "task", title: "Habits", subtitle: "Go to", href: "/habits" },
  { id: "q-exp", type: "project", title: "Expenses", subtitle: "Go to", href: "/expenses" },
  { id: "q-inc", type: "project", title: "Income", subtitle: "Go to", href: "/income" },
  { id: "q-bud", type: "project", title: "Budgets", subtitle: "Go to", href: "/budgets" },
  { id: "q-meet", type: "meeting", title: "Meetings", subtitle: "Go to", href: "/meetings" },
  { id: "q-dev", type: "snippet", title: "Dev Workspace", subtitle: "Go to", href: "/dev" },
  { id: "q-analytics", type: "page", title: "Analytics", subtitle: "Go to", href: "/analytics" },
  { id: "q-files", type: "page", title: "Files", subtitle: "Go to", href: "/files" },
];

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setActive(0);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const d = await api.search(q);
        if (!cancelled) {
          setHits(((d.results ?? []) as Hit[]).slice(0, 20));
          setActive(0);
        }
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const items = query.trim().length < 2
    ? QUICK_LINKS.filter((l) => l.title.toLowerCase().includes(query.trim().toLowerCase()))
    : hits;

  function go(hit: Hit) {
    router.push(hit.href);
    close();
  }

  if (pathname === "/login" || pathname === "/register") return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 hidden items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink-3 shadow-lg transition-colors hover:border-accent hover:text-ink-2 lg:flex"
        aria-label="Open command palette"
      >
        <Search size={14} />
        <span>Search anything</span>
        <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 p-4 pt-[12vh] backdrop-blur-sm" onClick={close}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          {loading ? <Loader2 size={16} className="animate-spin text-ink-3" /> : <Search size={16} className="text-ink-3" />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && items[active]) {
                e.preventDefault();
                go(items[active]);
              }
            }}
            placeholder="Search tasks, pages, events, snippets, meetings…"
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
          />
          <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-3">Esc</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-ink-3">
              {query.trim().length < 2 ? "Type at least 2 characters to search." : "No results found."}
            </div>
          ) : (
            items.map((hit, i) => {
              const Icon = ICONS[hit.type] ?? Search;
              return (
                <button
                  key={`${hit.type}-${hit.id}`}
                  onClick={() => go(hit)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    i === active ? "bg-accent-soft text-ink" : "text-ink-2 hover:bg-surface-2",
                  )}
                >
                  <Icon size={15} className="shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-ink">{hit.title}</div>
                    {hit.subtitle && <div className="truncate text-[10px] uppercase tracking-wider text-ink-3">{hit.subtitle}</div>}
                  </div>
                  <span className="text-[10px] text-ink-3">{hit.type}</span>
                  {i === active && <CornerDownLeft size={12} className="text-ink-3" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
