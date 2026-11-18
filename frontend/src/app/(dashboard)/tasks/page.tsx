"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast/toaster";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  Play,
  Square,
  ChevronDown,
  ChevronRight,
  Pencil,
  Search,
  X,
  ListTodo,
  MessageSquare,
  Send,
} from "lucide-react";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string | null;
  projectId?: string | null;
  parentTaskId?: string | null;
  completedAt?: string | null;
  project?: { id: string; name: string } | null;
  subtasks?: Task[];
  _count?: { comments: number };
};

type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  createdAt: string;
};

type Project = { id: string; name: string };

const STATUS_LABEL: Record<Task["status"], string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

const STATUS_STYLE: Record<Task["status"], string> = {
  TODO: "border-line text-ink-3 bg-glass",
  IN_PROGRESS: "border-accent text-accent bg-accent/10",
  DONE: "border-positive text-positive bg-positive/10",
  CANCELLED: "border-line text-ink-3 bg-glass line-through",
};

const PRIORITY_STYLE: Record<Task["priority"], string> = {
  LOW: "border-line text-ink-3 bg-glass",
  MEDIUM: "border-line text-ink-2 bg-glass",
  HIGH: "border-warning text-warning bg-warning/10",
  URGENT: "border-error text-error bg-error/10",
};

const emptyForm = {
  title: "",
  description: "",
  status: "TODO" as Task["status"],
  priority: "MEDIUM" as Task["priority"],
  dueDate: "",
  projectId: "",
};

function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "TODO" | "IN_PROGRESS" | "DONE">("ALL");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [quick, setQuick] = useState("");
  const [addingQuick, setAddingQuick] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const [subtaskDraft, setSubtaskDraft] = useState<Record<string, string>>({});
  const [activeTimer, setActiveTimer] = useState<{ timeEntryId: string; taskId: string; startAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [comments, setComments] = useState<Record<string, TaskComment[]>>({});
  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [commentBusy, setCommentBusy] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([api.tasks.list(), api.projects.list()]);
      setTasks((t.tasks ?? []) as Task[]);
      setProjects((p.projects ?? []) as Project[]);
    } catch (err: any) {
      toast({ title: "Could not load tasks", description: err?.message ?? "Check that the backend is running." });
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") setOpen(true);
  }, []);

  const roots = useMemo(() => tasks.filter((t) => !t.parentTaskId), [tasks]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roots.filter((t) => {
      if (filter !== "ALL" && t.status !== filter) return false;
      if (projectFilter && t.projectId !== projectFilter) return false;
      if (q) {
        const hay = `${t.title} ${t.description ?? ""} ${t.project?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [roots, filter, projectFilter, query]);

  const counts = useMemo(() => {
    const base = { ALL: roots.length, TODO: 0, IN_PROGRESS: 0, DONE: 0 } as Record<string, number>;
    for (const t of roots) {
      if (t.status === "TODO") base.TODO += 1;
      else if (t.status === "IN_PROGRESS") base.IN_PROGRESS += 1;
      else if (t.status === "DONE") base.DONE += 1;
    }
    return base;
  }, [roots]);

  function startCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }

  function startEdit(t: Task) {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description ?? "",
      status: t.status,
      priority: t.priority,
      dueDate: toLocalInput(t.dueDate),
      projectId: t.projectId ?? "",
    });
    setOpen(true);
  }

  function payload() {
    return {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      projectId: form.projectId || null,
    };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing) await api.tasks.update(editing.id, payload());
      else await api.tasks.create(payload());
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyForm });
      await load();
      toast({ title: editing ? "Task updated" : "Task created" });
    } catch (err: any) {
      toast({ title: "Could not save task", description: err?.message ?? "Please try again." });
    } finally {
      setSaving(false);
    }
  }

  async function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = quick.trim();
    if (!title) return;
    setAddingQuick(true);
    try {
      await api.tasks.create({ title });
      setQuick("");
      await load();
    } catch (err: any) {
      toast({ title: "Could not add task", description: err?.message ?? "Please try again." });
    } finally {
      setAddingQuick(false);
    }
  }

  async function patch(t: Task, body: any) {
    try {
      await api.tasks.update(t.id, body);
      await load();
    } catch (err: any) {
      toast({ title: "Could not update task", description: err?.message ?? "Please try again." });
    }
  }

  async function remove(t: Task) {
    if (!confirm(t.subtasks?.length ? `Delete "${t.title}" and its ${t.subtasks.length} subtask(s)?` : `Delete "${t.title}"?`)) return;
    try {
      await api.tasks.remove(t.id);
      await load();
    } catch (err: any) {
      toast({ title: "Could not delete task", description: err?.message ?? "Please try again." });
    }
  }

  async function addSubtask(parent: Task) {
    const title = (subtaskDraft[parent.id] ?? "").trim();
    if (!title) return;
    try {
      await api.tasks.create({ title, parentTaskId: parent.id, projectId: parent.projectId ?? undefined });
      setSubtaskDraft((d) => ({ ...d, [parent.id]: "" }));
      setExpanded((e) => ({ ...e, [parent.id]: true }));
      await load();
    } catch (err: any) {
      toast({ title: "Could not add subtask", description: err?.message ?? "Please try again." });
    }
  }

  async function toggleComments(t: Task) {
    const next = !commentsOpen[t.id];
    setCommentsOpen((o) => ({ ...o, [t.id]: next }));
    if (next && comments[t.id] === undefined) {
      try {
        const d = await api.tasks.comments.list(t.id);
        setComments((c) => ({ ...c, [t.id]: (d.comments ?? []) as TaskComment[] }));
      } catch (err: any) {
        toast({ title: "Could not load comments", description: err?.message ?? "Please try again." });
      }
    }
  }

  function syncCommentCount(taskId: string, count: number) {
    setTasks((list) =>
      list.map((x) => (x.id === taskId ? { ...x, _count: { comments: count } } : x)),
    );
  }

  async function addComment(t: Task) {
    const body = (commentDraft[t.id] ?? "").trim();
    if (!body) return;
    setCommentBusy(t.id);
    try {
      const d = await api.tasks.comments.create(t.id, { body });
      const next = [...(comments[t.id] ?? []), d.comment as TaskComment];
      setComments((c) => ({ ...c, [t.id]: next }));
      setCommentDraft((c) => ({ ...c, [t.id]: "" }));
      syncCommentCount(t.id, next.length);
    } catch (err: any) {
      toast({ title: "Could not add comment", description: err?.message ?? "Please try again." });
    } finally {
      setCommentBusy(null);
    }
  }

  async function removeComment(t: Task, c: TaskComment) {
    try {
      await api.tasks.comments.remove(t.id, c.id);
      const next = (comments[t.id] ?? []).filter((x) => x.id !== c.id);
      setComments((cm) => ({ ...cm, [t.id]: next }));
      syncCommentCount(t.id, next.length);
      toast({ title: "Comment deleted" });
    } catch (err: any) {
      toast({ title: "Could not delete comment", description: err?.message ?? "Please try again." });
    }
  }

  async function startTimer(t: Task) {
    if (activeTimer) {
      toast({ title: "Timer already running", description: "Stop the current timer first." });
      return;
    }
    const startAt = new Date().toISOString();
    try {
      const d = await api.timeEntries.create({ taskId: t.id, startAt });
      setActiveTimer({ timeEntryId: d.timeEntry.id, taskId: t.id, startAt: Date.now() });
      await patch(t, { status: t.status === "TODO" ? "IN_PROGRESS" : t.status });
      toast({ title: "Timer started", description: `Tracking time for ${t.title}` });
    } catch (err: any) {
      toast({ title: "Could not start timer", description: err?.message ?? "Please try again." });
    }
  }

  async function stopTimer() {
    if (!activeTimer) return;
    const endAt = new Date().toISOString();
    const durationMins = Math.max(1, Math.floor((Date.now() - activeTimer.startAt) / 60000));
    try {
      await api.timeEntries.update(activeTimer.timeEntryId, { endAt, durationMins });
      toast({ title: "Timer stopped", description: `Logged ${durationMins} min` });
    } catch (err: any) {
      toast({ title: "Could not stop timer", description: err?.message ?? "Please try again." });
    } finally {
      setActiveTimer(null);
    }
  }

  function elapsedLabel() {
    if (!activeTimer) return "";
    const mins = Math.max(0, Math.floor((now - activeTimer.startAt) / 60000));
    return `${mins}m`;
  }

  function dueMeta(t: Task) {
    if (!t.dueDate) return null;
    const due = new Date(t.dueDate);
    const overdue = t.status !== "DONE" && due.getTime() < Date.now();
    return {
      label: due.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      overdue,
    };
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Tasks</h1>
          <p className="text-xs text-ink-3 mt-1">
            {counts.ALL} tasks · {counts.TODO} to do · {counts.IN_PROGRESS} in progress · {counts.DONE} done
          </p>
        </div>
        <button onClick={startCreate} className="btn-primary text-sm inline-flex items-center gap-2">
          <Plus size={16} /> New task
        </button>
      </div>

      <form onSubmit={quickAdd} className="glass rounded-2xl p-3 mb-4 flex items-center gap-2">
        <Plus size={16} className="text-ink-3 ml-1 shrink-0" />
        <input
          value={quick}
          onChange={(e) => setQuick(e.target.value)}
          placeholder="Quick add a task and press Enter…"
          className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
        />
        <button type="submit" disabled={addingQuick || !quick.trim()} className="text-xs px-3 py-1.5 rounded-lg border border-line text-ink-2 hover:bg-glass-hover disabled:opacity-50">
          {addingQuick ? "Adding…" : "Add"}
        </button>
      </form>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <div className="flex gap-1 rounded-xl border border-line p-1 bg-glass w-fit">
          {(["ALL", "TODO", "IN_PROGRESS", "DONE"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap ${filter === f ? "bg-accent text-accent-ink" : "text-ink-2 hover:bg-glass-hover"}`}
            >
              {f === "ALL" ? "All" : STATUS_LABEL[f]} ({counts[f] ?? 0})
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter tasks…"
            className="w-full rounded-lg border border-line bg-transparent pl-9 pr-3 py-2 text-sm text-ink"
          />
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="rounded-lg border border-line bg-transparent px-3 py-2 text-xs text-ink"
        >
          <option value="" className="bg-surface">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id} className="bg-surface">{p.name}</option>
          ))}
        </select>
      </div>

      {activeTimer && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5">
          <div className="text-xs text-ink inline-flex items-center gap-2">
            <Clock size={14} className="text-accent" />
            Tracking <span className="font-semibold">{activeTimer.taskId ? tasks.find((t) => t.id === activeTimer.taskId)?.title ?? "task" : "task"}</span>
            <span className="tabular text-accent">{elapsedLabel()}</span>
          </div>
          <button onClick={stopTimer} className="text-xs px-2.5 py-1 rounded-lg border border-line text-ink-2 hover:bg-glass-hover inline-flex items-center gap-1">
            <Square size={11} /> Stop
          </button>
        </div>
      )}

      {loading ? (
        <div className="glass rounded-2xl p-6 text-sm text-ink-3">Loading tasks…</div>
      ) : visible.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <ListTodo className="mx-auto text-ink-3" size={26} />
          <div className="text-sm text-ink-2 font-medium mt-2">No tasks match</div>
          <div className="text-xs text-ink-3 mt-1">
            {roots.length === 0 ? "Create your first task above." : "Try a different filter or search."}
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {visible.map((t) => {
            const subs = t.subtasks ?? [];
            const doneSubs = subs.filter((s) => s.status === "DONE").length;
            const isOpen = !!expanded[t.id];
            const due = dueMeta(t);
            const isTimer = activeTimer?.taskId === t.id;
            return (
              <div key={t.id} className="glass rounded-2xl border border-line overflow-hidden">
                <div className="px-4 py-3 flex items-start gap-3">
                  <button
                    onClick={() => patch(t, { status: t.status === "DONE" ? "TODO" : "DONE" })}
                    className="mt-0.5 shrink-0"
                    title={t.status === "DONE" ? "Mark as to do" : "Mark done"}
                  >
                    {t.status === "DONE" ? (
                      <CheckCircle2 size={18} className="text-positive" />
                    ) : (
                      <Circle size={18} className="text-ink-3 hover:text-accent" />
                    )}
                  </button>

                  {subs.length > 0 ? (
                    <button onClick={() => setExpanded((e) => ({ ...e, [t.id]: !isOpen }))} className="mt-0.5 shrink-0 text-ink-3 hover:text-ink" title="Subtasks">
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  ) : (
                    <span className="w-4 shrink-0" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-sm font-medium", t.status === "DONE" ? "line-through text-ink-3" : "text-ink")}>
                        {t.title}
                      </span>
                      <span className={cn("text-[10px] font-semibold rounded-full border px-2 py-0.5", PRIORITY_STYLE[t.priority])}>
                        {t.priority}
                      </span>
                      <span className={cn("text-[10px] font-semibold rounded-full border px-2 py-0.5", STATUS_STYLE[t.status])}>
                        {STATUS_LABEL[t.status]}
                      </span>
                      {t.project && (
                        <span className="text-[10px] text-ink-3 border border-line rounded-full px-2 py-0.5 truncate max-w-[10rem]">
                          {t.project.name}
                        </span>
                      )}
                      {due && (
                        <span className={cn("text-[10px] tabular", due.overdue ? "text-error font-semibold" : "text-ink-3")}>
                          {due.overdue ? "Overdue " : "Due "}{due.label}
                        </span>
                      )}
                      {subs.length > 0 && (
                        <span className="text-[10px] text-ink-3 tabular">{doneSubs}/{subs.length} subtasks</span>
                      )}
                    </div>
                    {t.description && <p className="text-[11px] text-ink-3 mt-1 line-clamp-2">{t.description}</p>}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleComments(t)}
                      className={cn(
                        "h-7 px-1.5 inline-flex items-center gap-1 rounded-lg hover:bg-glass-hover",
                        commentsOpen[t.id] ? "text-accent" : "text-ink-3 hover:text-ink",
                      )}
                      title={commentsOpen[t.id] ? "Hide comments" : "Comments"}
                    >
                      <MessageSquare size={14} />
                      {(comments[t.id]?.length ?? t._count?.comments ?? 0) > 0 && (
                        <span className="text-[10px] tabular">{comments[t.id]?.length ?? t._count?.comments}</span>
                      )}
                    </button>
                    {isTimer ? (
                      <button onClick={stopTimer} className="size-7 grid place-items-center rounded-lg text-error hover:bg-error/10" title="Stop timer">
                        <Square size={14} />
                      </button>
                    ) : (
                      <button onClick={() => startTimer(t)} className="size-7 grid place-items-center rounded-lg text-accent hover:bg-accent/10" title="Start timer">
                        <Play size={14} />
                      </button>
                    )}
                    <button onClick={() => startEdit(t)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => remove(t)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-error" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-line px-4 py-3 pl-12 space-y-1.5 bg-surface-2">
                    {subs.length === 0 ? (
                      <div className="text-[11px] text-ink-3">No subtasks yet.</div>
                    ) : (
                      subs.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 group">
                          <button onClick={() => patch(s, { status: s.status === "DONE" ? "TODO" : "DONE" })} className="shrink-0">
                            {s.status === "DONE" ? (
                              <CheckCircle2 size={14} className="text-positive" />
                            ) : (
                              <Circle size={14} className="text-ink-3 hover:text-accent" />
                            )}
                          </button>
                          <span className={cn("text-xs flex-1 min-w-0 truncate", s.status === "DONE" ? "line-through text-ink-3" : "text-ink-2")}>
                            {s.title}
                          </span>
                          <button onClick={() => remove(s)} className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-error" title="Delete subtask">
                            <X size={13} />
                          </button>
                        </div>
                      ))
                    )}
                    <form
                      onSubmit={(e) => { e.preventDefault(); addSubtask(t); }}
                      className="flex items-center gap-2 pt-1"
                    >
                      <Plus size={13} className="text-ink-3 shrink-0" />
                      <input
                        value={subtaskDraft[t.id] ?? ""}
                        onChange={(e) => setSubtaskDraft((d) => ({ ...d, [t.id]: e.target.value }))}
                        placeholder="Add subtask…"
                        className="flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-ink-3"
                      />
                    </form>
                  </div>
                )}

                {commentsOpen[t.id] && (
                  <div className="border-t border-line px-4 py-3 pl-12 bg-surface-2 space-y-2">
                    {(comments[t.id] ?? []).length === 0 ? (
                      <div className="text-[11px] text-ink-3">No comments yet — add context or progress notes.</div>
                    ) : (
                      (comments[t.id] ?? []).map((c) => (
                        <div key={c.id} className="group rounded-lg border border-line bg-surface-2 px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold text-accent">
                              {c.userId === "demo_user_001" ? "You" : c.userId}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-ink-3 tabular">
                                {new Date(c.createdAt).toLocaleString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </span>
                              {c.userId === "demo_user_001" && (
                                <button
                                  onClick={() => removeComment(t, c)}
                                  className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-error"
                                  title="Delete comment"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-ink-2 mt-1 whitespace-pre-wrap break-words">{c.body}</p>
                        </div>
                      ))
                    )}
                    <form onSubmit={(e) => { e.preventDefault(); addComment(t); }} className="flex items-center gap-2 pt-1">
                      <input
                        value={commentDraft[t.id] ?? ""}
                        onChange={(e) => setCommentDraft((d) => ({ ...d, [t.id]: e.target.value }))}
                        placeholder="Write a comment…"
                        maxLength={5000}
                        className="flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-ink-3"
                      />
                      <button
                        type="submit"
                        disabled={commentBusy === t.id || !(commentDraft[t.id] ?? "").trim()}
                        className="text-[11px] px-2 py-1 rounded-lg border border-line text-ink-2 hover:bg-glass-hover disabled:opacity-50 inline-flex items-center gap-1"
                      >
                        <Send size={11} /> {commentBusy === t.id ? "Sending…" : "Send"}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink">{editing ? "Edit task" : "New task"}</h2>
              <button onClick={() => setOpen(false)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={save} className="space-y-3">
              <input
                autoFocus
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Task title"
                className="input-glass text-sm"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Description (optional)"
                className="input-glass text-sm resize-y"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-3">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Task["status"] }))}
                    className="input-glass text-sm mt-1"
                  >
                    {(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] as const).map((s) => (
                      <option key={s} value={s} className="bg-surface">{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-3">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Task["priority"] }))}
                    className="input-glass text-sm mt-1"
                  >
                    {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                      <option key={p} value={p} className="bg-surface">{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-3">Due</label>
                  <input
                    type="datetime-local"
                    value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="input-glass text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-ink-3">Project</label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                    className="input-glass text-sm mt-1"
                  >
                    <option value="" className="bg-surface">No project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-surface">{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm">
                  {saving ? "Saving…" : editing ? "Save changes" : "Create task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
