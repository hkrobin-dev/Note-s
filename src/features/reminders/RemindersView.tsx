"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import {
  fetchReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  type ReminderDTO,
  type ReminderPayload,
} from "@/features/reminders/api";
import { toDhakaInput, fromDhakaInput } from "@/features/tasks/format";
import { formatDateTime } from "@/lib/dates";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  ListSkeleton,
  Modal,
  PageHeader,
  Segmented,
  Select,
  StatCard,
} from "@/components/ui";

const STATUSES: { value: ReminderDTO["status"]; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_TONE: Record<string, "neutral" | "accent" | "positive" | "warning" | "error"> = {
  PENDING: "accent",
  SENT: "positive",
  FAILED: "error",
  CANCELLED: "neutral",
};

function blankForm(): Partial<ReminderDTO> {
  return { message: "", scheduledAt: "", status: "PENDING", channel: "APP" };
}

export function RemindersView() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ReminderDTO["status"] | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ReminderDTO | null>(null);
  const [form, setForm] = useState<Partial<ReminderDTO>>(blankForm());

  const query = useQuery({
    queryKey: ["reminders"],
    queryFn: () => fetchReminders({}),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["reminders"] });

  const createMutation = useMutation({
    mutationFn: (payload: ReminderPayload & { scheduledAt: string; message: string }) =>
      createReminder(payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReminderPayload }) =>
      updateReminder(id, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReminder(id),
    onSuccess: invalidate,
  });

  const reminders = useMemo(() => query.data?.reminders ?? [], [query.data]);
  const pendingCount = reminders.filter((reminder) => reminder.status === "PENDING").length;
  const sentCount = reminders.filter((reminder) => reminder.status === "SENT").length;
  const failedCount = reminders.filter((reminder) => reminder.status === "FAILED").length;
  const visible = statusFilter
    ? reminders.filter((reminder) => reminder.status === statusFilter)
    : reminders;
  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error;

  function openCreate() {
    setEditing(null);
    setForm(blankForm());
    setOpen(true);
  }

  function openEdit(reminder: ReminderDTO) {
    setEditing(reminder);
    setForm({
      message: reminder.message,
      scheduledAt: toDhakaInput(reminder.scheduledAt),
      status: reminder.status,
      channel: reminder.channel,
    });
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.message?.trim()) return;
    const scheduledAt = form.scheduledAt ? fromDhakaInput(form.scheduledAt) : null;
    if (!scheduledAt) return;
    const payload: ReminderPayload & { scheduledAt: string; message: string } = {
      message: form.message.trim(),
      scheduledAt,
      status: form.status ?? "PENDING",
      channel: form.channel ?? "APP",
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

  async function handleDelete(reminder: ReminderDTO) {
    if (!window.confirm("Delete this reminder?")) return;
    try {
      await deleteMutation.mutateAsync(reminder.id);
    } catch {
      // Error surfaced in the view.
    }
  }

  const filterOptions = [
    { value: "ALL", label: "All", count: reminders.length },
    ...STATUSES.map((status) => ({
      value: status.value,
      label: status.label,
      count: reminders.filter((reminder) => reminder.status === status.value).length,
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Utilities"
        title="Reminders"
        description="Scheduled nudges delivered by the server — no tab needs to stay open."
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus size={15} aria-hidden /> New reminder
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Pending" value={String(pendingCount)} tone="accent" icon={BellRing} />
        <StatCard label="Sent" value={String(sentCount)} tone="positive" icon={Bell} />
        <StatCard
          label="Failed"
          value={String(failedCount)}
          tone={failedCount > 0 ? "error" : "neutral"}
          icon={CalendarClock}
        />
        <StatCard label="Total" value={String(reminders.length)} icon={Bell} />
      </section>

      {mutationError ? <Alert>{mutationError.message}</Alert> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          ariaLabel="Filter reminders by status"
          options={filterOptions}
          value={statusFilter ?? "ALL"}
          onChange={(value) =>
            setStatusFilter(value === "ALL" ? undefined : (value as ReminderDTO["status"]))
          }
        />
        <span className="text-[11px] text-ink-3">{visible.length} shown</span>
      </div>

      <Card>
        <CardHeader title="Reminders" description="Due reminders are sent within a minute." />
        {query.isPending ? (
          <ListSkeleton rows={4} />
        ) : query.isError ? (
          <EmptyState
            icon={Bell}
            title="Could not load reminders"
            description={query.error.message}
            action={
              <Button size="sm" onClick={() => query.refetch()}>
                Try again
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={statusFilter ? "No reminders with this status" : "No reminders yet"}
            description={
              statusFilter
                ? "Try another status filter."
                : "Create a reminder so nothing important slips through."
            }
            action={
              statusFilter ? (
                <Button size="sm" variant="secondary" onClick={() => setStatusFilter(undefined)}>
                  Clear filter
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={openCreate}>
                  <Plus size={14} aria-hidden /> New reminder
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {visible.map((reminder) => {
              const overdue =
                reminder.status === "PENDING" &&
                // eslint-disable-next-line react-hooks/purity -- display-only comparison against the current clock
                new Date(reminder.scheduledAt).getTime() < Date.now();
              return (
                <li
                  key={reminder.id}
                  className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2/40"
                >
                  <span
                    className={
                      reminder.status === "PENDING"
                        ? "grid size-8 shrink-0 place-items-center rounded-lg border border-accent/30 bg-accent-soft text-accent"
                        : reminder.status === "SENT"
                          ? "grid size-8 shrink-0 place-items-center rounded-lg border border-positive/30 bg-positive-soft text-positive"
                          : reminder.status === "FAILED"
                            ? "grid size-8 shrink-0 place-items-center rounded-lg border border-error/30 bg-error-soft text-error"
                            : "grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-ink-3"
                    }
                  >
                    <Bell size={14} aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{reminder.message}</p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-3">
                      <span className="flex items-center gap-1">
                        <CalendarClock size={10} aria-hidden />
                        {formatDateTime(reminder.scheduledAt, true)}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{reminder.channel === "BROWSER" ? "Browser notification" : "In-app"}</span>
                      {reminder.taskId ? <span>· linked task</span> : null}
                      {reminder.eventId ? <span>· linked event</span> : null}
                      {overdue ? <span className="font-medium text-error">· due now</span> : null}
                    </p>
                    {reminder.failReason ? (
                      <p className="mt-1 line-clamp-1 text-[11px] text-error">{reminder.failReason}</p>
                    ) : null}
                  </div>

                  <Badge tone={STATUS_TONE[reminder.status] ?? "neutral"} dot>
                    {STATUSES.find((status) => status.value === reminder.status)?.label ?? reminder.status}
                  </Badge>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => openEdit(reminder)}
                      aria-label="Edit reminder"
                      className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      <Pencil size={13} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(reminder)}
                      aria-label="Delete reminder"
                      className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-error-soft hover:text-error"
                    >
                      <Trash2 size={13} aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit reminder" : "New reminder"}
        description="Times are shown in Asia/Dhaka and stored in UTC."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="reminder-form"
              variant="primary"
              disabled={!form.message?.trim() || !form.scheduledAt}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? "Save changes" : "Create reminder"}
            </Button>
          </>
        }
      >
        <form id="reminder-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Message" htmlFor="reminder-message">
            <Input
              id="reminder-message"
              value={form.message ?? ""}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              maxLength={1000}
              placeholder="e.g. Call the bank about the card"
              autoFocus
            />
          </Field>

          <Field label="Scheduled at" htmlFor="reminder-time">
            <Input
              id="reminder-time"
              type="datetime-local"
              value={form.scheduledAt ?? ""}
              onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="reminder-status">
              <Select
                id="reminder-status"
                value={form.status ?? "PENDING"}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as ReminderDTO["status"] })
                }
              >
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Channel" htmlFor="reminder-channel">
              <Select
                id="reminder-channel"
                value={form.channel ?? "APP"}
                onChange={(event) =>
                  setForm({ ...form, channel: event.target.value as ReminderDTO["channel"] })
                }
              >
                <option value="APP">In-app</option>
                <option value="BROWSER">Browser</option>
              </Select>
            </Field>
          </div>

          {mutationError ? <Alert>{mutationError.message}</Alert> : null}
        </form>
      </Modal>
    </div>
  );
}
