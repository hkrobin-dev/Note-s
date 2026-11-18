import Link from "next/link";
import { Suspense } from "react";
import { io } from "next/cache";
import {
  Activity,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  ListTodo,
  Plus,
  Target,
  Wallet,
} from "lucide-react";
import { getDashboardData } from "@/app/actions/dashboard";
import { TodayHeader } from "@/components/dashboard/TodayHeader";
import {
  Badge,
  Card,
  CardHeader,
  CardList,
  EmptyState,
  PageSkeleton,
  Progress,
  StatCard,
} from "@/components/ui";
import { buttonStyles } from "@/components/ui/buttonStyles";
import { formatBDT } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { LABELS, type TaskPriority } from "@/types";

const TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  hour: "2-digit",
  minute: "2-digit",
});

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  day: "numeric",
  month: "short",
});

const PRIORITY_TONE: Record<string, "neutral" | "accent" | "warning" | "error"> = {
  LOW: "neutral",
  MEDIUM: "accent",
  HIGH: "warning",
  URGENT: "error",
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  // The dashboard shows "today" in Dhaka, so render it per request instead of
  // baking the build-time date into the static shell.
  await io();
  const data = await getDashboardData();
  const totalTasks = data.tasksDoneToday + data.tasksRemainingToday;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Suspense fallback={<div className="h-20 w-72 animate-pulse rounded-xl bg-surface-2" />}>
          <TodayHeader />
        </Suspense>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Link href="/tasks" className={cn(buttonStyles({ variant: "secondary" }), "justify-center")}>
            <ListTodo size={15} aria-hidden />
            View tasks
          </Link>
          <Link href="/quick-add" className={cn(buttonStyles({ variant: "primary" }), "justify-center")}>
            <Plus size={15} aria-hidden />
            Quick add
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Spent this month"
          value={formatBDT(data.spentThisMonth)}
          hint={`${data.budgetPct}% of planned budget`}
          icon={Wallet}
        />
        <StatCard
          label="Monthly budget"
          value={formatBDT(data.monthlyBudget)}
          hint={data.monthlyBudget > 0 ? "Planned across categories" : "No budget set yet"}
          icon={Target}
        />
        <StatCard
          label="Budget remaining"
          value={formatBDT(Math.max(data.monthlyBudget - data.spentThisMonth, 0))}
          hint={`Income this month ${formatBDT(data.remainingBudget + data.spentThisMonth)}`}
          icon={Target}
          tone={data.monthlyBudget - data.spentThisMonth < 5000 ? "warning" : "positive"}
        />
        <StatCard
          label="Budget used"
          value={`${data.budgetPct}%`}
          hint={`${data.tasksRemainingToday} task${data.tasksRemainingToday === 1 ? "" : "s"} left today`}
          icon={Activity}
          tone={data.budgetPct > 80 ? "warning" : "neutral"}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Today's tasks"
              description={`${data.tasksDoneToday} done · ${data.tasksRemainingToday} remaining`}
              action={
                <Link
                  href="/tasks"
                  className="inline-flex items-center gap-1 text-xs font-medium text-ink-2 transition-colors hover:text-accent"
                >
                  View all <ArrowUpRight size={13} aria-hidden />
                </Link>
              }
            />
            {data.tasksToday.length === 0 ? (
              <EmptyState
                icon={CheckSquare}
                title="Nothing due today"
                description="Enjoy the clear calendar, or plan ahead by adding a task."
                action={
                  <Link href="/quick-add" className={buttonStyles({ variant: "secondary", size: "sm" })}>
                    <Plus size={14} aria-hidden /> Add a task
                  </Link>
                }
              />
            ) : (
              <CardList>
                {data.tasksToday.map((task) => {
                  const done = task.status === "DONE";
                  return (
                    <div key={task.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-full border text-[10px]",
                          done
                            ? "border-positive/40 bg-positive-soft text-positive"
                            : "border-line-strong",
                        )}
                        aria-hidden
                      >
                        {done ? "✓" : null}
                      </span>
                      <span
                        className={cn(
                          "type-body-sm min-w-0 flex-1 truncate",
                          done ? "text-ink-3 line-through" : "text-ink",
                        )}
                      >
                        {task.title}
                      </span>
                      <Badge tone={PRIORITY_TONE[task.priority] ?? "neutral"}>
                        {LABELS.TASK_PRIORITY[task.priority as TaskPriority] ?? task.priority}
                      </Badge>
                      <span className="tabular type-caption w-14 shrink-0 text-right text-ink-3 sm:w-16">
                        {task.dueDate ? TIME.format(new Date(task.dueDate)) : "—"}
                      </span>
                    </div>
                  );
                })}
              </CardList>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Today's schedule"
              description={
                totalTasks === 0 ? "No tasks planned" : `${data.eventsToday.length} event${data.eventsToday.length === 1 ? "" : "s"}`
              }
              action={
                <Link
                  href="/calendar"
                  className="inline-flex items-center gap-1 text-xs font-medium text-ink-2 transition-colors hover:text-accent"
                >
                  Calendar <ArrowUpRight size={13} aria-hidden />
                </Link>
              }
            />
            {data.eventsToday.length === 0 && !data.nextReminder ? (
              <EmptyState
                icon={CalendarDays}
                title="No events scheduled"
                description="Your day is open — block time for focused work."
              />
            ) : (
              <CardList>
                {data.eventsToday.map((event) => (
                  <div key={event.id} className="flex items-center gap-4 px-5 py-3">
                    <span className="tabular w-16 shrink-0 text-[11px] font-medium text-ink-3">
                      {event.allDay ? "All day" : TIME.format(new Date(event.startAt))}
                    </span>
                    <span className="h-8 w-px shrink-0 bg-line" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{event.title}</p>
                      <p className="truncate text-[11px] text-ink-3">
                        {event.location || event.eventType.toLowerCase()}
                      </p>
                    </div>
                  </div>
                ))}
                {data.nextReminder ? (
                  <div className="flex items-center gap-4 px-5 py-3">
                    <span className="tabular w-16 shrink-0 text-[11px] font-medium text-ink-3">
                      {TIME.format(new Date(data.nextReminder.at))}
                    </span>
                    <span className="h-8 w-px shrink-0 bg-line" aria-hidden />
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Bell size={13} className="shrink-0 text-warning" aria-hidden />
                      <p className="truncate text-[13px] text-ink">{data.nextReminder.message}</p>
                    </div>
                    <Badge tone="warning">Reminder</Badge>
                  </div>
                ) : null}
              </CardList>
            )}
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader
              title="Projects"
              action={
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-1 text-xs font-medium text-ink-2 transition-colors hover:text-accent"
                >
                  All <ArrowUpRight size={13} aria-hidden />
                </Link>
              }
            />
            {data.projects.length === 0 ? (
              <EmptyState icon={FolderKanban} title="No projects yet" />
            ) : (
              <div className="space-y-4 px-5 pb-5">
                {data.projects.slice(0, 4).map((project) => {
                  const pct = project.progress !== null ? Math.round(project.progress * 100) : 0;
                  return (
                    <div key={project.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                        <span className="truncate font-medium text-ink">{project.name}</span>
                        <span className="tabular shrink-0 text-[11px] text-ink-3">
                          {project.progress !== null ? `${pct}%` : "—"}
                        </span>
                      </div>
                      <Progress value={pct} />
                      <p className="mt-1.5 text-[11px] text-ink-3">
                        {project.openTasks} open · {project.deadline ? `due ${SHORT_DATE.format(new Date(project.deadline))}` : "no deadline"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent activity" />
            {data.recentActivity.length === 0 ? (
              <EmptyState icon={Activity} title="No activity yet" />
            ) : (
              <CardList>
                {data.recentActivity.slice(0, 6).map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 px-5 py-2.5">
                    <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-accent/70" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-ink-2">
                        <span className="font-medium text-ink">
                          {entry.entityType.charAt(0) + entry.entityType.slice(1).toLowerCase()}
                        </span>{" "}
                        {entry.action.toLowerCase()}
                      </p>
                      <p className="text-[10px] text-ink-3">
                        {SHORT_DATE.format(new Date(entry.createdAt))} ·{" "}
                        {TIME.format(new Date(entry.createdAt))}
                      </p>
                    </div>
                  </div>
                ))}
              </CardList>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
