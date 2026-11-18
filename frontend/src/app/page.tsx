"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "@/components/toast/toaster";
import { format, isBefore, startOfToday } from "date-fns";
import {
  Plus,
  FileText,
  CalendarDays,
  Wallet,
  FolderKanban,
  Timer,
  CheckCircle2,
  Circle,
  ArrowUpRight,
  Activity,
  Target,
  CalendarClock,
  Code2,
  BarChart3,
  BellRing,
  ListChecks,
  Check,
  Search,
  ListTodo,
  CreditCard,
  PiggyBank,
  ChevronRight,
  Sparkles,
  LayoutGrid,
  Clock,
} from "lucide-react";

type Task = { id: string; title: string; status: string; priority: string; dueDate?: string | null };
type Routine = { id: string; title: string; timeOfDay: string; active: boolean };
type TimeSummary = { date: string; mins: number };
type Note = { id: string; title: string; updatedAt: string };
type CalEvent = { id: string; title: string; startAt: string; allDay: boolean };
type ActionItem = {
  id: string;
  text: string;
  assignee?: string | null;
  dueDate?: string | null;
  done: boolean;
};
type Meeting = {
  id: string;
  title: string;
  startAt: string;
  location?: string | null;
  actionItems?: ActionItem[];
};
type Habit = { id: string; title: string; checkedInToday: boolean; logs?: { id: string }[] };
type Reminder = {
  id: string;
  message: string;
  scheduledAt: string;
  status: string;
  task?: { id: string; title: string } | null;
};
type Goal = {
  id: string;
  title: string;
  currentValue: number;
  targetValue: number;
  unit?: string | null;
  status: string;
  dueDate?: string | null;
};

function goalPct(g: Goal) {
  if (!g.targetValue) return 0;
  return Math.max(0, Math.min(100, Math.round((g.currentValue / g.targetValue) * 100)));
}

function fmtMinutes(m: number | null | undefined) {
  if (!m) return "0m";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function reminderWhen(iso: string) {
  const d = new Date(iso);
  const today = startOfToday();
  const tomorrow = +today + 86_400_000;
  if (+d < +today) return `Overdue · ${format(d, "MMM d, h:mm a")}`;
  if (+d < tomorrow) return `Today · ${format(d, "h:mm a")}`;
  if (+d < tomorrow + 86_400_000) return `Tomorrow · ${format(d, "h:mm a")}`;
  return format(d, "MMM d · h:mm a");
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [timeToday, setTimeToday] = useState<TimeSummary[]>([]);
  const [finance, setFinance] = useState<{ spentThisMonth?: number; earnedThisMonth?: number; budgetUsed?: number } | null>(null);
  const [todayEvents, setTodayEvents] = useState<CalEvent[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyHabit, setBusyHabit] = useState<string | null>(null);
  const [busyReminder, setBusyReminder] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.tasks.list().then((d) => setTasks((d.tasks ?? []) as Task[])).catch(() => setTasks([])),
      api.routines.list().then((d) => setRoutines((d.routines ?? []) as Routine[])).catch(() => setRoutines([])),
      api.notes
        .list()
        .then((d) => setNotes(((d.notes ?? []) as Note[]).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 6)))
        .catch(() => setNotes([])),
      api.timeEntries
        .summary({ from: format(startOfToday(), "yyyy-MM-dd"), to: format(startOfToday(), "yyyy-MM-dd") })
        .then((d) => setTimeToday((d.daily ?? []) as TimeSummary[]))
        .catch(() => setTimeToday([])),
      api.reports.dashboard().then((d) => setFinance(d)).catch(() => setFinance(null)),
      api.calendar
        .list()
        .then((d) => {
          const today = startOfToday();
          setTodayEvents(
            ((d.events ?? []) as CalEvent[])
              .filter((e) => +new Date(e.startAt) >= +today && +new Date(e.startAt) < +today + 86_400_000)
              .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)),
          );
        })
        .catch(() => setTodayEvents([])),
      api.meetings
        .list("all")
        .then((d) => setMeetings((d.meetings ?? []) as Meeting[]))
        .catch(() => setMeetings([])),
      api.habits
        .list()
        .then((d) => setHabits((d.habits ?? []) as Habit[]))
        .catch(() => setHabits([])),
      api.goals
        .list()
        .then((d) => setGoals((d.goals ?? []) as Goal[]))
        .catch(() => setGoals([])),
      api.reminders
        .list({ status: "PENDING" })
        .then((d) => setReminders((d.reminders ?? []) as Reminder[]))
        .catch(() => setReminders([])),
    ]).finally(() => setLoading(false));
  }, []);

  async function toggleHabit(h: Habit) {
    const done = h.checkedInToday;
    setBusyHabit(h.id);
    setHabits((list) =>
      list.map((x) =>
        x.id === h.id ? { ...x, checkedInToday: !done } : x,
      ),
    );
    try {
      if (done) await api.habits.uncheckin(h.id);
      else await api.habits.checkin(h.id);
      toast.success(done ? "Check-in removed" : "Habit checked in", h.title);
    } catch {
      setHabits((list) => list.map((x) => (x.id === h.id ? h : x)));
      toast.error("Could not update habit", h.title);
    } finally {
      setBusyHabit(null);
    }
  }

  async function completeReminder(r: Reminder) {
    setBusyReminder(r.id);
    setReminders((list) => list.filter((x) => x.id !== r.id));
    try {
      await api.reminders.update(r.id, { status: "SENT" });
      toast.success("Reminder completed", r.message);
    } catch {
      setReminders((list) => [r, ...list]);
      toast.error("Could not complete reminder", r.message);
    } finally {
      setBusyReminder(null);
    }
  }

  const totalMins = timeToday.reduce((s, d) => s + d.mins, 0);
  const openTasks = useMemo(() => tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED"), [tasks]);
  const overdue = useMemo(() => {
    const today = startOfToday();
    return openTasks.filter((t) => t.dueDate && isBefore(new Date(t.dueDate), today)).length;
  }, [openTasks]);

  const nextMeetings = useMemo(
    () =>
      meetings
        .filter((m) => +new Date(m.startAt) >= Date.now())
        .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
        .slice(0, 3),
    [meetings],
  );

  const openActions = useMemo(() => {
    return meetings
      .flatMap((m) => (m.actionItems ?? []).filter((a) => !a.done).map((item) => ({ item, meeting: m })))
      .sort((a, b) => {
        const ad = a.item.dueDate ? +new Date(a.item.dueDate) : Infinity;
        const bd = b.item.dueDate ? +new Date(b.item.dueDate) : Infinity;
        return ad - bd;
      });
  }, [meetings]);

  async function completeAction(meetingId: string, item: ActionItem) {
    setBusyAction(item.id);
    setMeetings((list) =>
      list.map((m) =>
        m.id === meetingId
          ? { ...m, actionItems: (m.actionItems ?? []).map((a) => (a.id === item.id ? { ...a, done: true } : a)) }
          : m,
      ),
    );
    try {
      await api.meetings.actionItems.update(meetingId, item.id, { done: true });
      toast.success("Action item completed", item.text);
    } catch {
      setMeetings((list) =>
        list.map((m) =>
          m.id === meetingId
            ? { ...m, actionItems: (m.actionItems ?? []).map((a) => (a.id === item.id ? { ...a, done: false } : a)) }
            : m,
        ),
      );
      toast.error("Could not complete action item", item.text);
    } finally {
      setBusyAction(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <div className="flex-1 p-6 md:p-10">
          <div className="skeleton h-44 rounded-3xl" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-12">
            <div className="skeleton h-80 rounded-2xl lg:col-span-8" />
            <div className="skeleton h-80 rounded-2xl lg:col-span-4" />
          </div>
        </div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const sortedTasks = openTasks
    .slice()
    .sort((a, b) => {
      const ad = a.dueDate ? +new Date(a.dueDate) : Infinity;
      const bd = b.dueDate ? +new Date(b.dueDate) : Infinity;
      return ad - bd;
    });
  const activeGoals = goals.filter((g) => g.status === "ACTIVE");
  const habitDone = habits.filter((h) => h.checkedInToday).length;
  const habitPct = habits.length ? Math.round((habitDone / habits.length) * 100) : 0;

  const SHORTCUTS = [
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/expenses", label: "Expenses", icon: CreditCard },
    { href: "/income", label: "Income", icon: Wallet },
    { href: "/budgets", label: "Budgets", icon: PiggyBank },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/time-log", label: "Time log", icon: Timer },
    { href: "/habits", label: "Habits", icon: Activity },
    { href: "/workspace", label: "Workspace", icon: FileText },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/meetings", label: "Meetings", icon: CalendarClock },
    { href: "/dev", label: "Dev workspace", icon: Code2 },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 pb-24 md:p-8 lg:p-10 lg:pb-10">
        <div className="mx-auto w-full max-w-[1400px] space-y-6">
          {/* Hero */}
          <section className="hero">
            <div className="relative z-10 p-6 md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="eyebrow">Personal command center</div>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink md:text-[2.5rem]">
                    Good <span className="text-accent">{greeting}</span>.
                  </h1>
                  <p className="mt-2 text-sm text-ink-3">
                    {format(new Date(), "EEEE, MMM d, yyyy")}
                    <span className="mx-2 opacity-40">•</span>
                    Keep it simple: do the next right thing.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
                    className="search-trigger"
                  >
                    <Search size={15} />
                    <span>Search anything…</span>
                    <kbd>⌘K</kbd>
                  </button>
                  <Link href="/tasks" className="btn-primary"><Plus size={16} /> New task</Link>
                </div>
              </div>
            </div>
          </section>

          {/* KPI strip */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Open tasks" value={openTasks.length} sub={overdue > 0 ? `${overdue} overdue` : "Nothing overdue"} icon={ListTodo} />
            <KpiCard label="Active routines" value={routines.filter((r) => r.active).length} sub={`${routines.length} total routines`} icon={Activity} />
            <KpiCard label="Time today" value={fmtMinutes(totalMins)} sub="Tracked focus time" icon={Timer} />
            <KpiCard
              label="Spent this month"
              value={`৳${Number(finance?.spentThisMonth ?? 0).toLocaleString()}`}
              sub={finance?.budgetUsed != null ? `${finance.budgetUsed}% of budget used` : "No budget set"}
              icon={Wallet}
            />
          </div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Focus */}
            <Panel
              className="lg:col-span-8"
              icon={ListTodo}
              title="Focus"
              subtitle="Top open tasks, closest due first"
              action={<Link href="/tasks" className="link-arrow">View all <ArrowUpRight size={13} /></Link>}
            >
              {sortedTasks.length === 0 ? (
                <div className="empty-state">
                  <div className="text-sm font-medium text-ink-2">No open tasks</div>
                  <div className="mt-1 text-xs">Create one to get momentum.</div>
                  <Link href="/tasks" className="btn-primary mt-4"><Plus size={15} /> Add task</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {sortedTasks.slice(0, 6).map((t) => (
                    <div key={t.id} className="list-row">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-line bg-surface text-accent">
                        {t.status === "IN_PROGRESS" ? <Timer size={14} /> : <Circle size={14} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-ink">{t.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
                          <span className={cn("chip", (t.priority === "URGENT" || t.priority === "HIGH") && "chip--accent")}>
                            {t.priority}
                          </span>
                          <span>{t.dueDate ? `Due ${format(new Date(t.dueDate), "MMM d")}` : "No due date"}</span>
                        </div>
                      </div>
                      <Link href="/tasks" className="text-ink-3 transition-colors hover:text-accent" aria-label="Open task">
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Today */}
            <Panel
              className="lg:col-span-4"
              icon={CalendarDays}
              title="Today"
              subtitle="Events and next meetings"
              action={<Link href="/calendar" className="link-arrow">Calendar <ArrowUpRight size={13} /></Link>}
            >
              {todayEvents.length === 0 && nextMeetings.length === 0 ? (
                <div className="empty-state">Nothing scheduled today.</div>
              ) : (
                <div className="timeline">
                  {todayEvents.map((e) => (
                    <div key={e.id} className="timeline-item flex items-start gap-3">
                      <span className="w-14 shrink-0 pt-0.5 text-[10px] font-semibold text-accent tabular">
                        {e.allDay ? "All day" : format(new Date(e.startAt), "h:mm a")}
                      </span>
                      <span className="truncate text-xs text-ink">{e.title}</span>
                    </div>
                  ))}
                  {nextMeetings.map((m) => (
                    <Link key={m.id} href="/meetings" className="timeline-item flex items-start gap-3">
                      <span className="w-14 shrink-0 pt-0.5 text-[10px] font-semibold text-accent tabular">
                        {format(new Date(m.startAt), "MMM d")}
                      </span>
                      <span className="truncate text-xs text-ink-2">{m.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>

            {/* Habits */}
            <Panel
              className="lg:col-span-4"
              icon={Sparkles}
              title="Habits today"
              subtitle={habits.length ? `${habitDone}/${habits.length} checked in` : "Build a daily streak"}
              action={<Link href="/habits" className="link-arrow">Manage <ArrowUpRight size={13} /></Link>}
            >
              {habits.length === 0 ? (
                <div className="empty-state">
                  No habits yet. <Link href="/habits" className="text-accent hover:underline">Add your first habit</Link>.
                </div>
              ) : (
                <div className="flex items-center gap-5">
                  <div className="ring shrink-0" style={{ "--pct": habitPct } as React.CSSProperties}>
                    <div className="ring-inner">{habitPct}%</div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {habits.slice(0, 4).map((h) => (
                      <button
                        key={h.id}
                        onClick={() => toggleHabit(h)}
                        disabled={busyHabit === h.id}
                        className="flex w-full items-center gap-2 text-left text-xs disabled:opacity-50"
                      >
                        {h.checkedInToday
                          ? <CheckCircle2 size={14} className="shrink-0 text-positive" />
                          : <Circle size={14} className="shrink-0 text-ink-3" />}
                        <span className={cn("truncate", h.checkedInToday ? "text-ink-3 line-through" : "text-ink-2")}>{h.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Panel>

            {/* Goals */}
            <Panel
              className="lg:col-span-4"
              icon={Target}
              title="Goals"
              subtitle="Progress toward what matters"
              action={<Link href="/goals" className="link-arrow">Manage <ArrowUpRight size={13} /></Link>}
            >
              {activeGoals.length === 0 ? (
                <div className="empty-state">
                  No active goals. <Link href="/goals" className="text-accent hover:underline">Set a goal</Link>.
                </div>
              ) : (
                <div className="space-y-4">
                  {activeGoals.slice(0, 4).map((g) => {
                    const pct = goalPct(g);
                    return (
                      <div key={g.id}>
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="truncate text-ink-2">{g.title}</span>
                          <span className="shrink-0 text-ink-3 tabular">
                            {g.currentValue}/{g.targetValue}{g.unit ? ` ${g.unit}` : ""}
                          </span>
                        </div>
                        <div className="progress-track mt-2">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            {/* Reminders */}
            <Panel
              className="lg:col-span-4"
              icon={BellRing}
              title="Reminders"
              subtitle={reminders.length === 0 ? "Nothing pending" : `${reminders.length} pending`}
              action={<Link href="/reminders" className="link-arrow">Open <ArrowUpRight size={13} /></Link>}
            >
              {reminders.length === 0 ? (
                <div className="empty-state">
                  You&apos;re clear. <Link href="/reminders" className="text-accent hover:underline">Schedule a reminder</Link>.
                </div>
              ) : (
                <div className="space-y-2">
                  {reminders.slice(0, 4).map((r) => {
                    const overdue = +new Date(r.scheduledAt) < +startOfToday();
                    return (
                      <div key={r.id} className="list-row">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs text-ink">{r.message}</div>
                          <div className={cn("mt-0.5 text-[10px]", overdue ? "text-error" : "text-ink-3")}>
                            {reminderWhen(r.scheduledAt)}{r.task ? ` · ${r.task.title}` : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => completeReminder(r)}
                          disabled={busyReminder === r.id}
                          className="grid size-7 shrink-0 place-items-center rounded-lg text-positive transition-colors hover:bg-positive/10 disabled:opacity-50"
                          title="Mark done"
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                  {reminders.length > 4 && (
                    <Link href="/reminders" className="block pt-1 text-[11px] text-accent hover:underline">+{reminders.length - 4} more</Link>
                  )}
                </div>
              )}
            </Panel>

            {/* Action items */}
            <Panel
              className="lg:col-span-7"
              icon={ListChecks}
              title="Action items"
              subtitle={openActions.length === 0 ? "Nothing open" : `${openActions.length} open from meetings`}
              action={<Link href="/meetings" className="link-arrow">Meetings <ArrowUpRight size={13} /></Link>}
            >
              {openActions.length === 0 ? (
                <div className="empty-state">
                  All caught up. <Link href="/meetings" className="text-accent hover:underline">Review meetings</Link>.
                </div>
              ) : (
                <div className="space-y-2">
                  {openActions.slice(0, 5).map(({ item, meeting }) => (
                    <div key={item.id} className="list-row items-start">
                      <button
                        onClick={() => completeAction(meeting.id, item)}
                        disabled={busyAction === item.id}
                        className="mt-0.5 grid size-4 shrink-0 place-items-center rounded border border-line text-transparent transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                        title="Mark done"
                      >
                        <Check size={11} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs text-ink">{item.text}</div>
                        <div className="mt-0.5 truncate text-[10px] text-ink-3">
                          {meeting.title}{item.assignee ? ` · ${item.assignee}` : ""}{item.dueDate ? ` · due ${format(new Date(item.dueDate), "MMM d")}` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                  {openActions.length > 5 && (
                    <Link href="/meetings" className="block pt-1 text-[11px] text-accent hover:underline">+{openActions.length - 5} more</Link>
                  )}
                </div>
              )}
            </Panel>

            {/* Routines */}
            <Panel
              className="lg:col-span-5"
              icon={Clock}
              title="Routines"
              subtitle="Your daily rhythm"
              action={<Link href="/routines" className="link-arrow">Manage <ArrowUpRight size={13} /></Link>}
            >
              {routines.length === 0 ? (
                <div className="empty-state">No routines yet.</div>
              ) : (
                <div className="space-y-2">
                  {routines.slice(0, 5).map((r) => (
                    <div key={r.id} className="list-row justify-between">
                      <div className="min-w-0">
                        <div className="truncate text-sm text-ink">{r.title}</div>
                        <div className="mt-0.5 text-[11px] text-ink-3">{format(new Date(`2000-01-01T${r.timeOfDay}:00`), "h:mm a")}</div>
                      </div>
                      <span className={cn("chip", r.active ? "chip--positive" : "")}>{r.active ? "Active" : "Paused"}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Recent notes */}
            <Panel
              className="lg:col-span-12"
              icon={FileText}
              title="Recent notes"
              subtitle="Pick up where you left off"
              action={<Link href="/notes" className="link-arrow">View all <ArrowUpRight size={13} /></Link>}
            >
              {notes.length === 0 ? (
                <div className="empty-state">No notes yet.</div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {notes.map((n) => (
                    <Link key={n.id} href={`/workspace?page=${n.id}`} className="group rounded-xl border border-line bg-surface-2 p-4 transition-colors hover:border-accent">
                      <div className="line-clamp-2 text-sm font-medium text-ink">{n.title || "Untitled"}</div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-3">
                        <span>{format(new Date(n.updatedAt), "MMM d, yyyy")}</span>
                        <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>

            {/* Shortcuts */}
            <Panel className="lg:col-span-12" icon={LayoutGrid} title="Shortcuts" subtitle="Jump back in fast">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {SHORTCUTS.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2 p-3 transition-colors hover:border-accent">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-accent"><Icon size={15} /></span>
                    <span className="truncate text-xs font-medium text-ink-2">{label}</span>
                  </Link>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </main>
    </div>
  );
}

function Panel({ title, subtitle, action, children, className, icon: Icon }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  icon?: React.ElementType;
}) {
  return (
    <section className={cn("panel overflow-hidden", className)}>
      <div className="panel-head">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && <span className="panel-head-icon"><Icon size={15} /></span>}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-ink-3">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function KpiCard({ label, value, sub, icon: Icon }: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="panel kpi">
      <div className="flex items-start justify-between gap-3">
        <span className="kpi-label">{label}</span>
        {Icon && <span className="kpi-icon"><Icon size={16} /></span>}
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      <div className="kpi-rule" />
    </div>
  );
}
