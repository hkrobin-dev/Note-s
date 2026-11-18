"use client";

import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlarmClock,
  CalendarClock,
  CheckCircle2,
  Inbox,
  ListTodo,
  RotateCcw,
  X,
} from "lucide-react";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ListSkeleton,
  PageHeader,
  SearchInput,
  Segmented,
  Select,
  StatCard,
  Switch,
} from "@/components/ui";
import { TaskComposer } from "@/features/tasks/TaskComposer";
import { TaskRow } from "@/features/tasks/TaskRow";
import {
  createTask,
  deleteTask,
  fetchTasks,
  updateTask,
  type TaskFilters,
  type TaskPayload,
  type TasksResponse,
} from "@/features/tasks/api";
import { todayLine } from "@/lib/dates";
import { TASK_PRIORITIES, LABELS, type TaskPriority } from "@/types";

type DueFilter = "all" | "today" | "week" | "overdue";

const DUE_TABS: { value: DueFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "week", label: "Next 7 days" },
  { value: "overdue", label: "Overdue" },
];

export function TasksView() {
  const queryClient = useQueryClient();
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [priority, setPriority] = useState<TaskPriority | "ALL">("ALL");
  const [showDone, setShowDone] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filters: TaskFilters = {
    due: dueFilter === "all" ? undefined : dueFilter,
    priority: priority === "ALL" ? undefined : priority,
    includeDone: showDone,
    q: deferredSearch,
  };

  const tasksQuery = useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => fetchTasks(filters),
  });

  const createMutation = useMutation({
    mutationFn: (payload: TaskPayload & { title: string }) => createTask(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TaskPayload }) => updateTask(id, payload),
    onMutate: async ({ id, payload }) => {
      if (!payload.status) return;
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snapshot = queryClient.getQueriesData<TasksResponse>({ queryKey: ["tasks"] });
      queryClient.setQueriesData<TasksResponse>({ queryKey: ["tasks"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  status: payload.status!,
                  completedAt: payload.status === "DONE" ? new Date().toISOString() : null,
                }
              : task,
          ),
        };
      });
      return { snapshot };
    },
    onError: (_error, _vars, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const snapshot = queryClient.getQueriesData<TasksResponse>({ queryKey: ["tasks"] });
      queryClient.setQueriesData<TasksResponse>({ queryKey: ["tasks"] }, (old) =>
        old ? { ...old, tasks: old.tasks.filter((task) => task.id !== id) } : old,
      );
      return { snapshot };
    },
    onError: (_error, _id, context) => {
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  async function handleCreate(payload: TaskPayload & { title: string }) {
    await createMutation.mutateAsync(payload);
  }

  async function handleUpdate(id: string, payload: TaskPayload) {
    try {
      await updateMutation.mutateAsync({ id, payload });
    } catch {
      // Error banner below; optimistic state was rolled back.
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      // Error banner below; optimistic state was rolled back.
    }
  }

  const stats = tasksQuery.data?.stats;
  const tasks = tasksQuery.data?.tasks ?? [];
  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error;
  const hasFilters = dueFilter !== "all" || priority !== "ALL" || showDone || search.trim() !== "";

  function clearFilters() {
    setDueFilter("all");
    setPriority("ALL");
    setShowDone(false);
    setSearch("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Work"
        title="Tasks"
        description={`${todayLine()} — capture what matters and keep the list honest.`}
        actions={
          hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <RotateCcw size={14} aria-hidden /> Reset filters
            </Button>
          ) : null
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open tasks" value={stats ? stats.open : "—"} icon={ListTodo} />
        <StatCard
          label="Due today"
          value={stats ? stats.dueToday : "—"}
          icon={CalendarClock}
          tone={stats && stats.dueToday > 0 ? "accent" : "neutral"}
        />
        <StatCard
          label="Overdue"
          value={stats ? stats.overdue : "—"}
          tone={stats && stats.overdue > 0 ? "error" : "neutral"}
          icon={AlarmClock}
        />
        <StatCard
          label="Completed today"
          value={stats ? stats.completedToday : "—"}
          tone="positive"
          icon={CheckCircle2}
        />
      </section>

      <TaskComposer onCreate={handleCreate} isPending={createMutation.isPending} />

      {mutationError ? (
        <Alert>
          <span className="font-medium">Could not save the change.</span> {mutationError.message}
        </Alert>
      ) : null}

      <Card className="flex flex-wrap items-center gap-2 p-2">
        <Segmented
          ariaLabel="Filter by due date"
          options={DUE_TABS}
          value={dueFilter}
          onChange={setDueFilter}
        />

        <Select
          aria-label="Filter by priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as TaskPriority | "ALL")}
          className="h-8 w-auto border-transparent bg-surface-2 text-xs"
        >
          <option value="ALL">All priorities</option>
          {TASK_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {LABELS.TASK_PRIORITY[value]}
            </option>
          ))}
        </Select>

        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tasks…"
          className="min-w-44 flex-1 sm:max-w-60"
        />

        <div className="ml-auto flex items-center gap-3">
          <Switch checked={showDone} onChange={setShowDone} label="Show completed" />
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-ink-3 transition-colors hover:text-ink"
            >
              <X size={12} aria-hidden /> Clear
            </button>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Task list"
          description={`${tasks.length} task${tasks.length === 1 ? "" : "s"}${hasFilters ? " matching filters" : ""}`}
        />
        {tasksQuery.isPending ? (
          <ListSkeleton rows={4} />
        ) : tasksQuery.isError ? (
          <EmptyState
            icon={Inbox}
            title="Could not load tasks"
            description={tasksQuery.error.message}
            action={
              <Button size="sm" onClick={() => tasksQuery.refetch()}>
                Try again
              </Button>
            }
          />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={hasFilters ? "No tasks match these filters" : "No tasks yet"}
            description={
              hasFilters
                ? "Try a different search or reset the filters."
                : "Add your first task above to get started."
            }
            action={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </Card>

      <p className="text-[11px] text-ink-3">
        {tasks.length > 0
          ? `Showing ${tasks.length} task${tasks.length === 1 ? "" : "s"}${!showDone ? " · completed tasks are hidden" : ""}`
          : "Tip: press Enter in the composer to add a task quickly."}
      </p>
    </div>
  );
}
