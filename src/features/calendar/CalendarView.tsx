"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  fetchCalendarEvents,
  fetchCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  type CalendarEventDTO,
  type CalendarEventPayload,
  type OccurrenceDTO,
} from "@/features/calendar/api";
import { toDhakaInput, fromDhakaInput } from "@/features/tasks/format";
import { dhakaDayKey } from "@/lib/dates";
import { monthDays } from "@/features/calendar/format";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  PageSkeleton,
  Segmented,
  Select,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/utils";

type View = "month" | "week" | "day";
type AnyEvent = CalendarEventDTO | OccurrenceDTO;

const VIEWS: { value: View; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

const EVENT_TYPES = ["GENERAL", "MEETING", "DEADLINE", "PERSONAL"] as const;
const EVENT_STATUSES = ["CONFIRMED", "TENTATIVE", "CANCELLED"] as const;

const TYPE_DOT: Record<string, string> = {
  GENERAL: "bg-ink-3",
  MEETING: "bg-accent",
  DEADLINE: "bg-warning",
  PERSONAL: "bg-positive",
};

const TYPE_TONE: Record<string, "neutral" | "accent" | "warning" | "positive"> = {
  GENERAL: "neutral",
  MEETING: "accent",
  DEADLINE: "warning",
  PERSONAL: "positive",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  hour: "2-digit",
  minute: "2-digit",
});

const DAY_TITLE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const MONTH_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  month: "long",
  year: "numeric",
});

function eventTime(event: AnyEvent): string {
  if (event.allDay) return "All day";
  return `${TIME_FMT.format(new Date(event.startAt))} – ${TIME_FMT.format(new Date(event.endAt))}`;
}

function eventBaseId(event: AnyEvent): string {
  return "baseEventId" in event ? event.baseEventId : event.id;
}

function blankEvent(dayKey?: string | null): Partial<CalendarEventDTO> {
  return {
    title: "",
    description: null,
    startAt: dayKey ? `${dayKey}T09:00` : "",
    endAt: dayKey ? `${dayKey}T10:00` : "",
    allDay: false,
    eventType: "GENERAL",
    location: null,
    notes: null,
    status: "CONFIRMED",
  };
}

export function CalendarView() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("month");
  const [year, setYear] = useState(0);
  const [month, setMonth] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [todayKey, setTodayKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEventDTO | null>(null);
  const [form, setForm] = useState<Partial<CalendarEventDTO>>(blankEvent());
  const [editError, setEditError] = useState("");

  useEffect(() => {
    const now = new Date();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- calendar cursor is client-only (today depends on the visitor's clock)
    setYear(now.getUTCFullYear());
    setMonth(now.getUTCMonth() + 1);
    const key = dhakaDayKey(now);
    setTodayKey(key);
    setSelectedDay(key);
  }, []);

  const monthStart = new Date(Date.UTC(year, month - 1, 1, -6));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const fromDate = new Date(monthStart);
  fromDate.setUTCDate(fromDate.getUTCDate() - 14);
  const toDate = new Date(monthEnd);
  toDate.setUTCDate(toDate.getUTCDate() + 14);

  const query = useQuery({
    queryKey: ["calendar", year, month],
    queryFn: () =>
      fetchCalendarEvents({
        expand: "occurrences",
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
      }),
    enabled: year > 0,
  });

  const events = useMemo<AnyEvent[]>(
    () => query.data?.occurrences ?? query.data?.events ?? [],
    [query.data],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AnyEvent[]>();
    for (const event of events) {
      const key = dhakaDayKey(event.startAt);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    }
    return map;
  }, [events]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["calendar"] });

  const createMutation = useMutation({
    mutationFn: (payload: CalendarEventPayload & { title: string; startAt: string; endAt: string }) =>
      createCalendarEvent(payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CalendarEventPayload }) =>
      updateCalendarEvent(id, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCalendarEvent(id),
    onSuccess: invalidate,
  });

  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error;

  const anchorDay = selectedDay ?? todayKey ?? "";
  const dayEvents = eventsByDay.get(anchorDay) ?? [];
  const monthLabel = year > 0 ? MONTH_FMT.format(new Date(Date.UTC(year, month - 1, 1))) : "Calendar";

  function navigate(delta: number) {
    if (view === "month") {
      setMonth((current) => {
        const next = current + delta;
        if (next < 1) {
          setYear((value) => value - 1);
          return 12;
        }
        if (next > 12) {
          setYear((value) => value + 1);
          return 1;
        }
        return next;
      });
      return;
    }

    const anchor = new Date(`${anchorDay}T00:00:00+06:00`);
    anchor.setUTCDate(anchor.getUTCDate() + (view === "week" ? 7 : 1) * delta);
    const key = dhakaDayKey(anchor);
    setSelectedDay(key);
    setYear(anchor.getUTCFullYear());
    setMonth(anchor.getUTCMonth() + 1);
  }

  function goToday() {
    const now = new Date();
    setYear(now.getUTCFullYear());
    setMonth(now.getUTCMonth() + 1);
    const key = dhakaDayKey(now);
    setTodayKey(key);
    setSelectedDay(key);
  }

  function openCreate(dayKey?: string | null) {
    setEditing(null);
    setEditError("");
    setForm(blankEvent(dayKey ?? anchorDay));
    setOpen(true);
  }

  async function openEdit(event: AnyEvent) {
    setEditing(null);
    setEditError("");
    try {
      const full = await fetchCalendarEvent(eventBaseId(event));
      setEditing(full);
      setForm({
        title: full.title,
        description: full.description,
        startAt: toDhakaInput(full.startAt),
        endAt: toDhakaInput(full.endAt),
        allDay: full.allDay,
        eventType: full.eventType,
        location: full.location,
        notes: full.notes,
        status: full.status,
      });
      setOpen(true);
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Could not load event");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title?.trim()) return;
    const startAt = form.startAt ? fromDhakaInput(form.startAt) : null;
    const endAt = form.endAt ? fromDhakaInput(form.endAt) : null;
    if (!startAt || !endAt) {
      setEditError("Start and end times are required.");
      return;
    }
    if (new Date(endAt) <= new Date(startAt)) {
      setEditError("The end time must be after the start time.");
      return;
    }

    const payload: CalendarEventPayload & { title: string; startAt: string; endAt: string } = {
      title: form.title.trim(),
      description: form.description || null,
      startAt,
      endAt,
      allDay: Boolean(form.allDay),
      eventType: form.eventType ?? "GENERAL",
      location: form.location || null,
      notes: form.notes || null,
      status: form.status ?? "CONFIRMED",
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setOpen(false);
      setEditing(null);
      setEditError("");
    } catch (error) {
      setEditError(error instanceof Error ? error.message : "Could not save event");
    }
  }

  async function handleDelete(event: AnyEvent) {
    if (!window.confirm(`Delete “${event.title}”?`)) return;
    try {
      await deleteMutation.mutateAsync(eventBaseId(event));
    } catch {
      // Error surfaced in the view.
    }
  }

  // `today` comes from the browser clock, so wait for the mount effect before
  // rendering date-dependent UI (keeps prerendering free of current-time reads).
  if (!todayKey || year === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Work"
        title={monthLabel}
        description="Plan events, deadlines, and the shape of your week."
        actions={
          <>
            <div className="inline-flex items-center rounded-lg border border-line bg-surface p-0.5">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Previous"
                className="grid size-8 place-items-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <ChevronLeft size={16} aria-hidden />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="h-8 rounded-md px-2.5 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => navigate(1)}
                aria-label="Next"
                className="grid size-8 place-items-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
            <Segmented ariaLabel="Calendar view" options={VIEWS} value={view} onChange={setView} />
            <Button variant="primary" onClick={() => openCreate()}>
              <Plus size={15} aria-hidden /> Add event
            </Button>
          </>
        }
      />

      {mutationError ? <Alert>{mutationError.message}</Alert> : null}
      {editError && !open ? <Alert>{editError}</Alert> : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {query.isError ? (
            <Card>
              <EmptyState
                icon={CalendarDays}
                title="Could not load calendar"
                description={query.error.message}
                action={
                  <Button size="sm" onClick={() => query.refetch()}>
                    Try again
                  </Button>
                }
              />
            </Card>
          ) : view === "month" ? (
            <Card className="overflow-hidden">
              <div className="grid grid-cols-7 gap-px bg-line">
                {DAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="bg-surface-2 py-2 text-center text-[10px] font-semibold tracking-[0.06em] text-ink-3 uppercase"
                  >
                    {label}
                  </div>
                ))}
                {year > 0
                  ? monthDays(year, month).map((day) => {
                      const list = eventsByDay.get(day.dayKey) ?? [];
                      const isToday = day.dayKey === todayKey;
                      const isSelected = day.dayKey === selectedDay;
                      return (
                        <button
                          key={day.dayKey}
                          type="button"
                          onClick={() => setSelectedDay(day.dayKey)}
                          className={cn(
                            "min-h-24 bg-surface p-1.5 text-left transition-colors hover:bg-surface-2/70",
                            !day.inMonth && "bg-surface-2/40",
                            isSelected && "bg-accent-soft",
                          )}
                        >
                          <span
                            className={cn(
                              "mb-1 grid size-6 place-items-center rounded-md text-[11px] font-medium",
                              isToday
                                ? "bg-accent text-white"
                                : day.inMonth
                                  ? "text-ink"
                                  : "text-ink-3",
                            )}
                          >
                            {day.date.getUTCDate()}
                          </span>
                          <span className="block space-y-0.5">
                            {list.slice(0, 2).map((event) => (
                              <span
                                key={event.id}
                                className="flex items-center gap-1 overflow-hidden rounded px-0.5 text-[10px] leading-4 text-ink-2"
                                title={event.title}
                              >
                                <span
                                  className={cn(
                                    "size-1.5 shrink-0 rounded-full",
                                    TYPE_DOT[event.eventType] ?? "bg-ink-3",
                                  )}
                                  aria-hidden
                                />
                                <span className="truncate">{event.title}</span>
                              </span>
                            ))}
                            {list.length > 2 ? (
                              <span className="block pl-2.5 text-[10px] text-ink-3">
                                +{list.length - 2} more
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })
                  : Array.from({ length: 35 }).map((_, index) => (
                      <div key={index} className="min-h-24 animate-pulse bg-surface" />
                    ))}
              </div>
            </Card>
          ) : view === "week" ? (
            <Card className="overflow-hidden">
              <div className="grid grid-cols-7 gap-px bg-line">
                {Array.from({ length: 7 }).map((_, offset) => {
                  const start = new Date(`${anchorDay}T00:00:00+06:00`);
                  start.setUTCDate(start.getUTCDate() - start.getUTCDay() + offset);
                  const key = dhakaDayKey(start);
                  const list = eventsByDay.get(key) ?? [];
                  const isToday = key === todayKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDay(key)}
                      className={cn(
                        "min-h-40 bg-surface p-2 text-left transition-colors hover:bg-surface-2/60",
                        key === selectedDay && "bg-accent-soft",
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-semibold tracking-wide text-ink-3 uppercase">
                          {DAY_LABELS[offset]}
                        </span>
                        <span
                          className={cn(
                            "grid size-6 place-items-center rounded-md text-[11px] font-medium",
                            isToday ? "bg-accent text-white" : "text-ink-2",
                          )}
                        >
                          {start.getUTCDate()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {list.map((event) => (
                          <div
                            key={event.id}
                            className="rounded border border-line bg-surface-2 px-1.5 py-1"
                          >
                            <p className="truncate text-[10px] font-medium text-ink">{event.title}</p>
                            <p className="truncate text-[9px] text-ink-3">{eventTime(event)}</p>
                          </div>
                        ))}
                        {list.length === 0 ? (
                          <p className="text-[10px] text-ink-3">No events</p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader
                title={DAY_TITLE_FMT.format(new Date(`${anchorDay}T00:00:00+06:00`))}
                description={`${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`}
                action={
                  <Button size="sm" variant="secondary" onClick={() => openCreate(anchorDay)}>
                    <Plus size={13} aria-hidden /> Add
                  </Button>
                }
              />
              {dayEvents.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Nothing scheduled"
                  description="This day is free. Add an event to block time."
                  action={
                    <Button size="sm" variant="primary" onClick={() => openCreate(anchorDay)}>
                      <Plus size={14} aria-hidden /> Add event
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {dayEvents.map((event) => (
                    <AgendaRow
                      key={event.id}
                      event={event}
                      onEdit={() => openEdit(event)}
                      onDelete={() => handleDelete(event)}
                    />
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

        <aside>
          <Card>
            <CardHeader
              title={view === "day" ? "Agenda" : DAY_TITLE_FMT.format(new Date(`${anchorDay}T00:00:00+06:00`))}
              description={`${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`}
              action={
                <button
                  type="button"
                  onClick={() => openCreate(anchorDay)}
                  aria-label="Add event"
                  className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-accent"
                >
                  <Plus size={15} aria-hidden />
                </button>
              }
            />
            {query.isFetching ? (
              <p className="flex items-center gap-2 px-5 pb-4 text-[11px] text-ink-3">
                <RefreshCw size={12} className="animate-spin" aria-hidden /> Syncing…
              </p>
            ) : null}
            {dayEvents.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No events"
                description="Select another day or create an event."
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-line border-t border-line">
                {dayEvents.map((event) => (
                  <AgendaRow
                    key={event.id}
                    event={event}
                    compact
                    onEdit={() => openEdit(event)}
                    onDelete={() => handleDelete(event)}
                  />
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit event" : "New event"}
        description="Times are shown in Asia/Dhaka."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="event-form"
              variant="primary"
              disabled={!form.title?.trim() || !form.startAt || !form.endAt}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? "Save changes" : "Create event"}
            </Button>
          </>
        }
      >
        <form id="event-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="event-title" className="sm:col-span-2">
            <Input
              id="event-title"
              value={form.title ?? ""}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              maxLength={200}
              placeholder="e.g. Project review"
              autoFocus
            />
          </Field>

          <Field label="Starts" htmlFor="event-start">
            <Input
              id="event-start"
              type="datetime-local"
              value={form.startAt ?? ""}
              onChange={(event) => setForm({ ...form, startAt: event.target.value })}
            />
          </Field>

          <Field label="Ends" htmlFor="event-end">
            <Input
              id="event-end"
              type="datetime-local"
              value={form.endAt ?? ""}
              onChange={(event) => setForm({ ...form, endAt: event.target.value })}
            />
          </Field>

          <Field label="Type" htmlFor="event-type">
            <Select
              id="event-type"
              value={form.eventType ?? "GENERAL"}
              onChange={(event) => setForm({ ...form, eventType: event.target.value })}
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Status" htmlFor="event-status">
            <Select
              id="event-status"
              value={form.status ?? "CONFIRMED"}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              {EVENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Location" htmlFor="event-location" className="sm:col-span-2">
            <Input
              id="event-location"
              value={form.location ?? ""}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              maxLength={200}
              placeholder="Optional"
            />
          </Field>

          <Field label="Description" htmlFor="event-description" className="sm:col-span-2">
            <Textarea
              id="event-description"
              value={form.description ?? ""}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              maxLength={5000}
              rows={3}
              placeholder="Optional details"
            />
          </Field>

          <Field label="Notes" htmlFor="event-notes" className="sm:col-span-2">
            <Textarea
              id="event-notes"
              value={form.notes ?? ""}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              maxLength={5000}
              rows={2}
              placeholder="Private notes"
            />
          </Field>

          <div className="flex items-center gap-2.5 sm:col-span-2">
            <input
              id="event-all-day"
              type="checkbox"
              checked={Boolean(form.allDay)}
              onChange={(event) => setForm({ ...form, allDay: event.target.checked })}
              className="size-5 rounded border-line bg-surface-2 accent-[var(--color-accent)]"
            />
            <label htmlFor="event-all-day" className="text-[15px] text-ink-2 md:text-[13px]">
              All day
            </label>
          </div>

          {editError ? <Alert className="sm:col-span-2">{editError}</Alert> : null}
          {mutationError ? <Alert className="sm:col-span-2">{mutationError.message}</Alert> : null}
        </form>
      </Modal>
    </div>
  );
}

function AgendaRow({
  event,
  onEdit,
  onDelete,
  compact = false,
}: {
  event: AnyEvent;
  onEdit: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  return (
    <li className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2/40">
      <span
        className={cn(
          "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2",
        )}
      >
        <span className={cn("size-2 rounded-full", TYPE_DOT[event.eventType] ?? "bg-ink-3")} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">{event.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-3">
          <span className="flex items-center gap-1">
            <Clock size={10} aria-hidden /> {eventTime(event)}
          </span>
          {event.location ? (
            <span className="flex items-center gap-1 truncate">
              <MapPin size={10} aria-hidden /> {event.location}
            </span>
          ) : null}
        </p>
        {!compact ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={TYPE_TONE[event.eventType] ?? "neutral"}>{event.eventType.toLowerCase()}</Badge>
            {event.status !== "CONFIRMED" ? (
              <Badge tone={event.status === "CANCELLED" ? "error" : "warning"}>
                {event.status.toLowerCase()}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${event.title}`}
          className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <Pencil size={13} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${event.title}`}
          className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-error-soft hover:text-error"
        >
          <Trash2 size={13} aria-hidden />
        </button>
      </div>
    </li>
  );
}
