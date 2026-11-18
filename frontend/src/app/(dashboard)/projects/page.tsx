"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast/toaster";
import { cn } from "@/lib/utils";
import {
  Plus,
  FolderKanban,
  Trash2,
  Pencil,
  CalendarDays,
  CheckCircle2,
  Circle,
  X,
  ListTodo,
} from "lucide-react";

type ProjectTask = { id: string; title: string; status: string; dueDate?: string | null };

type Project = {
  id: string;
  name: string;
  description?: string | null;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  deadline?: string | null;
  tasks?: ProjectTask[];
  _count?: { tasks: number };
};

const STATUSES = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const STATUS_LABEL: Record<string, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On hold",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

const STATUS_STYLE: Record<string, string> = {
  PLANNING: "border-sky-400/50 text-sky-300 bg-sky-400/10",
  ACTIVE: "border-accent/50 text-accent bg-accent/10",
  ON_HOLD: "border-amber-400/50 text-amber-300 bg-amber-400/10",
  COMPLETED: "border-emerald-400/50 text-emerald-300 bg-emerald-400/10",
  ARCHIVED: "border-line text-ink-3 bg-glass",
};

const PRIORITY_STYLE: Record<string, string> = {
  LOW: "border-line text-ink-3 bg-glass",
  MEDIUM: "border-line text-ink-2 bg-glass",
  HIGH: "border-amber-400 text-amber-300 bg-amber-400/10",
  URGENT: "border-red-400 text-red-300 bg-red-400/10",
};

const emptyForm = {
  name: "",
  description: "",
  status: "ACTIVE" as Project["status"],
  priority: "MEDIUM" as Project["priority"],
  deadline: "",
};

function toDateInput(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export default function ProjectsPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    try {
      const d = await api.projects.list();
      setProjects((d.projects ?? []) as Project[]);
    } catch (err: any) {
      toast({ title: "Could not load projects", description: err?.message ?? "Check that the backend is running." });
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") startCreate();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  function startCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function startEdit(p: Project) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      status: p.status,
      priority: p.priority,
      deadline: toDateInput(p.deadline),
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
        priority: form.priority,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      };
      if (editing) await api.projects.update(editing.id, body);
      else await api.projects.create(body);
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyForm });
      await load();
      toast({ title: editing ? "Project updated" : "Project created" });
    } catch (err: any) {
      toast({ title: "Could not save project", description: err?.message ?? "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Project) {
    if (!confirm(`Delete "${p.name}"? Tasks will be kept but unlinked.`)) return;
    try {
      await api.projects.remove(p.id);
      await load();
    } catch (err: any) {
      toast({ title: "Could not delete project", description: err?.message ?? "Please try again." });
    }
  }

  async function quickAddTask(project: Project, e: React.FormEvent) {
    e.preventDefault();
    const title = (drafts[project.id] ?? "").trim();
    if (!title) return;
    try {
      await api.tasks.create({ title, projectId: project.id });
      setDrafts((d) => ({ ...d, [project.id]: "" }));
      await load();
    } catch (err: any) {
      toast({ title: "Could not add task", description: err?.message ?? "Please try again." });
    }
  }

  async function toggleTask(task: ProjectTask) {
    try {
      await api.tasks.update(task.id, { status: task.status === "DONE" ? "TODO" : "DONE" });
      await load();
    } catch (err: any) {
      toast({ title: "Could not update task", description: err?.message ?? "Please try again." });
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Projects</h1>
          <p className="text-xs text-ink-3 mt-1">Group tasks into outcomes and track their progress.</p>
        </div>
        <button onClick={startCreate} className="btn-primary text-sm inline-flex items-center gap-2">
          <Plus size={16} /> New project
        </button>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-6 text-sm text-ink-3">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <FolderKanban className="mx-auto text-ink-3" size={26} />
          <div className="text-sm text-ink-2 font-medium mt-2">No projects yet</div>
          <div className="text-xs text-ink-3 mt-1">Create one to group related tasks.</div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => {
            const tasks = p.tasks ?? [];
            const done = tasks.filter((t) => t.status === "DONE").length;
            const total = tasks.length || p._count?.tasks || 0;
            const pct = total === 0 ? 0 : Math.round((done / total) * 100);
            const overdue = p.deadline && p.status !== "COMPLETED" && new Date(p.deadline).getTime() < Date.now();
            const isOpen = !!expanded[p.id];
            const shown = isOpen ? tasks : tasks.slice(0, 4);
            return (
              <div key={p.id} className="glass rounded-2xl border border-white/10 p-5 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-ink truncate">{p.name}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className={cn("text-[10px] font-semibold rounded-full border px-2 py-0.5", STATUS_STYLE[p.status])}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                      <span className={cn("text-[10px] font-semibold rounded-full border px-2 py-0.5", PRIORITY_STYLE[p.priority])}>
                        {p.priority}
                      </span>
                      {p.deadline && (
                        <span className={cn("text-[10px] tabular inline-flex items-center gap-1", overdue ? "text-red-300 font-semibold" : "text-ink-3")}>
                          <CalendarDays size={10} /> {new Date(p.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(p)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(p)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-red-400" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {p.description && <p className="text-[11px] text-ink-3 mt-2 line-clamp-2">{p.description}</p>}

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-ink-3 mb-1">
                    <span>{done}/{total} tasks done</span>
                    <span className="tabular">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-400" : "bg-accent")} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 flex-1">
                  {tasks.length === 0 ? (
                    <div className="text-[11px] text-ink-3 inline-flex items-center gap-1.5"><ListTodo size={12} /> No tasks yet</div>
                  ) : (
                    <>
                      {shown.map((t) => (
                        <div key={t.id} className="flex items-center gap-2">
                          <button onClick={() => toggleTask(t)} className="shrink-0" title="Toggle done">
                            {t.status === "DONE" ? (
                              <CheckCircle2 size={13} className="text-emerald-400" />
                            ) : (
                              <Circle size={13} className="text-ink-3 hover:text-accent" />
                            )}
                          </button>
                          <span className={cn("text-[11px] truncate flex-1", t.status === "DONE" ? "line-through text-ink-3" : "text-ink-2")}>
                            {t.title}
                          </span>
                        </div>
                      ))}
                      {tasks.length > 4 && (
                        <button
                          onClick={() => setExpanded((e) => ({ ...e, [p.id]: !isOpen }))}
                          className="text-[10px] text-accent hover:underline"
                        >
                          {isOpen ? "Show less" : `+${tasks.length - 4} more`}
                        </button>
                      )}
                    </>
                  )}
                </div>

                <form onSubmit={(e) => quickAddTask(p, e)} className="mt-3 flex items-center gap-1.5 border-t border-white/10 pt-2.5">
                  <Plus size={13} className="text-ink-3 shrink-0" />
                  <input
                    value={drafts[p.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                    placeholder="Add task to project…"
                    className="flex-1 bg-transparent text-[11px] text-ink outline-none placeholder:text-ink-3"
                  />
                </form>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0f1a] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink">{editing ? "Edit project" : "New project"}</h2>
              <button onClick={() => setOpen(false)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <input
                autoFocus
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Project name"
                className="input-glass text-sm"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="What is this project about? (optional)"
                className="input-glass text-sm resize-y"
              />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-3">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Project["status"] }))}
                    className="input-glass text-sm mt-1"
                  >
                    {STATUSES.map((s) => <option key={s} value={s} className="bg-[#0b0f1a]">{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-3">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Project["priority"] }))}
                    className="input-glass text-sm mt-1"
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p} className="bg-[#0b0f1a]">{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-3">Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                    className="input-glass text-sm mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm">
                  {saving ? "Saving…" : editing ? "Save changes" : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
