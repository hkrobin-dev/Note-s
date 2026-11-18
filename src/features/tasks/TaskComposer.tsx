"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Card, Input, Select } from "@/components/ui";
import type { TaskPayload } from "@/features/tasks/api";
import { fromDhakaInput } from "@/features/tasks/format";
import { TASK_PRIORITIES, LABELS, type TaskPriority } from "@/types";

type Props = {
  onCreate: (payload: TaskPayload & { title: string }) => Promise<void>;
  isPending: boolean;
};

export function TaskComposer({ onCreate, isPending }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [due, setDue] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || isPending) return;

    try {
      await onCreate({ title: trimmed, priority, dueDate: fromDhakaInput(due) });
      setTitle("");
      setDue("");
    } catch {
      // The mutation error is surfaced by the parent view.
    }
  }

  return (
    <Card className="p-3">
      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="new-task-title">
            New task title
          </label>
          <Input
            id="new-task-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a task — what needs to be done?"
            maxLength={200}
            className="h-11 flex-1 border-transparent bg-surface-2 focus:border-accent sm:h-10"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!title.trim() || isPending}
            loading={isPending}
            className="h-11 px-4 sm:h-10"
          >
            <Plus size={15} aria-hidden /> Add task
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
          <label className="flex items-center gap-2 text-[11px] text-ink-3 sm:text-xs">
            Priority
            <Select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
              className="h-9 w-auto border-transparent bg-surface-2 pr-7 sm:h-8"
            >
              {TASK_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {LABELS.TASK_PRIORITY[value]}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex items-center gap-2 text-[11px] text-ink-3 sm:text-xs">
            Due
            <Input
              type="datetime-local"
              value={due}
              onChange={(event) => setDue(event.target.value)}
              className="h-9 w-auto border-transparent bg-surface-2 pr-2 sm:h-8"
            />
          </label>

          {due ? (
            <button
              type="button"
              onClick={() => setDue("")}
              className="text-[11px] text-ink-3 underline-offset-2 hover:text-ink hover:underline"
            >
              Clear due date
            </button>
          ) : (
            <span className="hidden text-[11px] text-ink-3 sm:inline">
              Optional — set a priority and due date if it matters.
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
