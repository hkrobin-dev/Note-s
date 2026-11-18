"use client";

import { useState } from "react";
import { CalendarClock, Check, Pencil, Trash2 } from "lucide-react";
import { Badge, Button, Input, Select } from "@/components/ui";
import type { TaskDTO, TaskPayload } from "@/features/tasks/api";
import { PRIORITY_STYLE, dueInfo, fromDhakaInput, toDhakaInput } from "@/features/tasks/format";
import { TASK_PRIORITIES, TASK_STATUSES, LABELS, type TaskPriority, type TaskStatus } from "@/types";
import { cn } from "@/lib/utils";

type Props = {
  task: TaskDTO;
  onUpdate: (id: string, payload: TaskPayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const DUE_TONE = {
  overdue: "text-error",
  today: "text-warning",
  soon: "text-ink-2",
  normal: "text-ink-3",
  none: "text-ink-3",
} as const;

export function TaskRow({ task, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState(task.title);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [due, setDue] = useState(toDhakaInput(task.dueDate));

  const done = task.status === "DONE";
  const cancelled = task.status === "CANCELLED";
  const rawDue = dueInfo(task.dueDate);
  const due_ = done || cancelled ? { text: rawDue.text, tone: "none" as const } : rawDue;
  const priorityStyle = PRIORITY_STYLE[task.priority];

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      await onUpdate(task.id, { status: done ? "TODO" : "DONE" });
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await onUpdate(task.id, {
        title: title.trim(),
        status,
        priority,
        dueDate: fromDhakaInput(due),
      });
      setEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await onDelete(task.id);
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  if (editing) {
    return (
      <li className="bg-surface-2/50 px-5 py-4">
        <form onSubmit={save} className="space-y-3">
          <label className="sr-only" htmlFor={`edit-title-${task.id}`}>
            Task title
          </label>
          <Input
            id={`edit-title-${task.id}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            className="bg-surface"
            autoFocus
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-[11px] font-medium text-ink-3">
              Status
              <Select
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
                className="bg-surface"
              >
                {TASK_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {LABELS.TASK_STATUS[value]}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-1 text-[11px] font-medium text-ink-3">
              Priority
              <Select
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                className="bg-surface"
              >
                {TASK_PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {LABELS.TASK_PRIORITY[value]}
                  </option>
                ))}
              </Select>
            </label>

            <label className="flex flex-col gap-1 text-[11px] font-medium text-ink-3">
              Due
              <Input
                type="datetime-local"
                value={due}
                onChange={(event) => setDue(event.target.value)}
                className="bg-surface"
              />
            </label>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={!title.trim() || busy} loading={busy}>
              Save
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="group flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2/40">
      <button
        type="button"
        onClick={toggle}
        disabled={busy || cancelled}
        aria-label={done ? `Mark “${task.title}” as to do` : `Mark “${task.title}” as done`}
        aria-pressed={done}
        /* 36px hit area with the same small visual circle inside — the check
           toggle is the most-tapped control, so it gets a real touch target. */
        className={cn(
          "relative mt-0.5 grid size-9 shrink-0 place-items-center rounded-full transition-colors",
          cancelled && "opacity-40",
        )}
      >
        <span
          className={cn(
            "grid size-[18px] place-items-center rounded-full border transition-colors",
            done
              ? "border-positive/40 bg-positive-soft text-positive"
              : "border-line-strong group-hover:border-accent group-hover:text-accent",
          )}
        >
          {done ? <Check size={11} strokeWidth={3} aria-hidden /> : null}
        </span>
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "text-[13px]",
              done || cancelled ? "text-ink-3 line-through" : "text-ink",
              cancelled && "line-through",
            )}
          >
            {task.title}
          </span>
          {task.project ? (
            <Badge tone="neutral" className="max-w-[11rem] truncate">
              {task.project.name}
            </Badge>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          <span className={cn("flex items-center gap-1 tabular", DUE_TONE[due_.tone])}>
            <CalendarClock size={11} aria-hidden />
            {due_.text}
          </span>
          <span className={cn("flex items-center gap-1", priorityStyle.text)}>
            <span className={cn("size-1.5 rounded-full", priorityStyle.dot)} aria-hidden />
            {priorityStyle.label}
          </span>
          {task.taggedWith.length > 0 ? (
            <span className="text-ink-3">
              {task.taggedWith.map((tag) => `#${tag.tag.name}`).join(" ")}
            </span>
          ) : null}
          {task.rescheduledFrom ? <span className="text-ink-3">rescheduled</span> : null}
        </div>

        {task.description ? (
          <p className="mt-1 line-clamp-1 text-xs text-ink-3">{task.description}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {confirmingDelete ? (
          <>
            <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                setTitle(task.title);
                setStatus(task.status);
                setPriority(task.priority);
                setDue(toDhakaInput(task.dueDate));
                setEditing(true);
              }}
              aria-label={`Edit “${task.title}”`}
              className="grid size-9 place-items-center rounded-md text-ink-3 opacity-100 transition-colors hover:bg-surface-2 hover:text-ink sm:size-8 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <Pencil size={14} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label={`Delete “${task.title}”`}
              className="grid size-9 place-items-center rounded-md text-ink-3 opacity-100 transition-colors hover:bg-error-soft hover:text-error sm:size-8 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
