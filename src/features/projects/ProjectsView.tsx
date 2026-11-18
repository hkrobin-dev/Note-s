"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  FolderKanban,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  type ProjectDTO,
  type ProjectPayload,
  projectSummary,
} from "@/features/projects/api";
import { toDhakaInput, fromDhakaInput } from "@/features/tasks/format";
import { projectDate } from "@/features/projects/format";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Progress,
  Segmented,
  Select,
  StatCard,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const STATUSES: { value: string; label: string }[] = [
  { value: "PLANNING", label: "Planning" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

const STATUS_TONE: Record<string, "neutral" | "accent" | "positive" | "warning"> = {
  PLANNING: "neutral",
  ACTIVE: "positive",
  ON_HOLD: "warning",
  COMPLETED: "accent",
  ARCHIVED: "neutral",
};

const PRIORITIES: { value: string; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const PRIORITY_TONE: Record<string, "neutral" | "accent" | "warning" | "error"> = {
  LOW: "neutral",
  MEDIUM: "accent",
  HIGH: "warning",
  URGENT: "error",
};

function blankForm(): Partial<ProjectDTO> {
  return {
    name: "",
    description: "",
    status: "PLANNING",
    priority: "MEDIUM",
    startDate: "",
    deadline: "",
    accentColor: null,
    icon: null,
  };
}

export function ProjectsView() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectDTO | null>(null);
  const [form, setForm] = useState<Partial<ProjectDTO>>(blankForm());

  const query = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchProjects({}),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["projects"] });

  const createMutation = useMutation({
    mutationFn: (payload: ProjectPayload & { name: string }) => createProject(payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProjectPayload }) =>
      updateProject(id, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: invalidate,
  });

  const projects = useMemo(() => query.data?.projects ?? [], [query.data]);
  const filtered = useMemo(
    () => (statusFilter ? projects.filter((project) => project.status === statusFilter) : projects),
    [projects, statusFilter],
  );
  const summaries = projects.map(projectSummary);
  const activeCount = projects.filter((project) => project.status === "ACTIVE").length;
  const totalOpen = summaries.reduce((sum, project) => sum + project.openTasks, 0);
  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error;

  function openCreate() {
    setEditing(null);
    setForm(blankForm());
    setOpen(true);
  }

  function openEdit(project: ProjectDTO) {
    setEditing(project);
    setForm({
      name: project.name,
      description: project.description ?? "",
      status: project.status,
      priority: project.priority,
      startDate: toDhakaInput(project.startDate),
      deadline: toDhakaInput(project.deadline),
      accentColor: project.accentColor ?? "",
      icon: project.icon ?? "",
    });
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name?.trim()) return;
    const payload: ProjectPayload & { name: string } = {
      name: form.name.trim(),
      description: form.description || null,
      status: form.status ?? "PLANNING",
      priority: form.priority ?? "MEDIUM",
      startDate: form.startDate ? fromDhakaInput(form.startDate) : null,
      deadline: form.deadline ? fromDhakaInput(form.deadline) : null,
      accentColor: form.accentColor || null,
      icon: form.icon || null,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setOpen(false);
      setEditing(null);
    } catch {
      // Error surfaced in the modal.
    }
  }

  async function handleDelete(project: ProjectDTO) {
    if (!window.confirm(`Delete “${project.name}”? Linked records will be unassigned.`)) return;
    try {
      await deleteMutation.mutateAsync(project.id);
    } catch {
      // Error surfaced in the view.
    }
  }

  const filterOptions = [
    { value: "ALL", label: "All", count: projects.length },
    ...STATUSES.map((status) => ({
      value: status.value,
      label: status.label,
      count: projects.filter((project) => project.status === status.value).length,
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Work"
        title="Projects"
        description="Group tasks, notes, events, and expenses under a single outcome."
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus size={15} aria-hidden /> New project
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Projects" value={String(projects.length)} icon={FolderKanban} />
        <StatCard label="Active" value={String(activeCount)} tone="positive" icon={CircleDashed} />
        <StatCard label="Open tasks" value={String(totalOpen)} icon={CalendarClock} />
        <StatCard
          label="Completed"
          value={String(summaries.filter((summary) => summary.status === "COMPLETED").length)}
          tone="accent"
          icon={CheckCircle2}
        />
      </section>

      {mutationError ? <Alert>{mutationError.message}</Alert> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          ariaLabel="Filter by status"
          options={filterOptions}
          value={statusFilter ?? "ALL"}
          onChange={(value) => setStatusFilter(value === "ALL" ? undefined : value)}
        />
        <span className="text-[11px] text-ink-3">
          {filtered.length} project{filtered.length === 1 ? "" : "s"} shown
        </span>
      </div>

      {query.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="h-44 animate-pulse bg-surface-2" />
          ))}
        </div>
      ) : query.isError ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="Could not load projects"
            description={query.error.message}
            action={
              <Button size="sm" onClick={() => query.refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project to give tasks a home."
            action={
              <Button size="sm" variant="primary" onClick={openCreate}>
                <Plus size={14} aria-hidden /> New project
              </Button>
            }
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="No projects with this status"
            description="Try another status filter."
            action={
              <Button size="sm" variant="secondary" onClick={() => setStatusFilter(undefined)}>
                Clear filter
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((project) => {
            const summary = projectSummary(project);
            const pct = summary.progress !== null ? Math.round(summary.progress * 100) : 0;
            return (
              <Card key={project.id} className="group flex flex-col p-4 transition-colors hover:border-line-strong">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "grid size-9 shrink-0 place-items-center rounded-lg border border-line text-[13px] font-semibold",
                      project.accentColor ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink-3",
                    )}
                    aria-hidden
                  >
                    {project.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-[13px] font-semibold text-ink" title={project.name}>
                        {project.name}
                      </h3>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => openEdit(project)}
                          aria-label={`Edit ${project.name}`}
                          className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                          <Pencil size={13} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(project)}
                          aria-label={`Delete ${project.name}`}
                          className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-error-soft hover:text-error"
                        >
                          <Trash2 size={13} aria-hidden />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge tone={STATUS_TONE[project.status] ?? "neutral"} dot>
                        {STATUSES.find((status) => status.value === project.status)?.label ?? project.status}
                      </Badge>
                      <Badge tone={PRIORITY_TONE[project.priority] ?? "neutral"}>
                        {PRIORITIES.find((priority) => priority.value === project.priority)?.label ??
                          project.priority}
                      </Badge>
                    </div>
                  </div>
                </div>

                {project.description ? (
                  <p className="mt-3 line-clamp-2 text-xs text-ink-2">{project.description}</p>
                ) : null}

                <div className="mt-auto pt-4">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-ink-3">
                    <span>
                      {summary.taskCount} task{summary.taskCount === 1 ? "" : "s"} · {summary.openTasks} open
                    </span>
                    <span className="tabular">{summary.progress !== null ? `${pct}%` : "No tasks"}</span>
                  </div>
                  <Progress value={pct} tone={project.status === "ON_HOLD" ? "warning" : "accent"} />
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-3">
                    <CalendarClock size={11} aria-hidden />
                    {project.deadline ? `Due ${projectDate(project.deadline)}` : "No deadline"}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit project" : "New project"}
        description="Give the work a name, status, and deadline."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="project-form"
              variant="primary"
              disabled={!form.name?.trim()}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? "Save changes" : "Create project"}
            </Button>
          </>
        }
      >
        <form id="project-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Project name" htmlFor="project-name" className="sm:col-span-2">
            <Input
              id="project-name"
              value={form.name ?? ""}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="e.g. Website redesign"
              maxLength={200}
              autoFocus
            />
          </Field>

          <Field label="Status" htmlFor="project-status">
            <Select
              id="project-status"
              value={(form.status ?? "PLANNING") as ProjectDTO["status"]}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as ProjectDTO["status"] })
              }
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Priority" htmlFor="project-priority">
            <Select
              id="project-priority"
              value={(form.priority ?? "MEDIUM") as ProjectDTO["priority"]}
              onChange={(event) =>
                setForm({ ...form, priority: event.target.value as ProjectDTO["priority"] })
              }
            >
              {PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Starts" htmlFor="project-start">
            <Input
              id="project-start"
              type="datetime-local"
              value={form.startDate ?? ""}
              onChange={(event) => setForm({ ...form, startDate: event.target.value })}
            />
          </Field>

          <Field label="Deadline" htmlFor="project-deadline">
            <Input
              id="project-deadline"
              type="datetime-local"
              value={form.deadline ?? ""}
              onChange={(event) => setForm({ ...form, deadline: event.target.value })}
            />
          </Field>

          <Field label="Accent color" htmlFor="project-color" hint="Optional hex value.">
            <Input
              id="project-color"
              value={form.accentColor ?? ""}
              onChange={(event) => setForm({ ...form, accentColor: event.target.value })}
              maxLength={50}
              placeholder="#4f5bd5"
            />
          </Field>

          <Field label="Icon" htmlFor="project-icon" hint="Optional icon name.">
            <Input
              id="project-icon"
              value={form.icon ?? ""}
              onChange={(event) => setForm({ ...form, icon: event.target.value })}
              maxLength={50}
              placeholder="globe"
            />
          </Field>

          <Field label="Description" htmlFor="project-description" className="sm:col-span-2">
            <Textarea
              id="project-description"
              value={form.description ?? ""}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              maxLength={5000}
              rows={3}
              placeholder="Optional summary and success criteria"
            />
          </Field>

          {mutationError ? <Alert className="sm:col-span-2">{mutationError.message}</Alert> : null}
        </form>
      </Modal>
    </div>
  );
}
