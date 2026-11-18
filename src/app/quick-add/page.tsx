"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, CreditCard, Plus } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { fromDhakaInput } from "@/features/tasks/format";
import type { ExpenseDTO } from "@/features/expenses/api";

type QAType = "task" | "event" | "expense";

const FORMS: { value: QAType; label: string; icon: React.ElementType; hint: string }[] = [
  { value: "task", label: "Task", icon: Plus, hint: "Something to do" },
  { value: "event", label: "Event", icon: Calendar, hint: "Something scheduled" },
  { value: "expense", label: "Expense", icon: CreditCard, hint: "Money spent" },
];

function blankTask() {
  return { title: "", dueDate: "", priority: "MEDIUM" as const, projectId: "" };
}

function blankEvent() {
  return { title: "", startAt: "", endAt: "", allDay: false, eventType: "GENERAL" as const, description: "" };
}

function blankExpense() {
  return { amount: "", description: "", expenseDate: "", categoryId: "", paymentMethod: "CASH" as const, vendor: "" };
}

export default function QuickAddPage() {
  const router = useRouter();
  const [type, setType] = useState<QAType>("task");
  const [task, setTask] = useState<{
    title: string;
    dueDate: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    projectId: string;
  }>(blankTask());
  const [event, setEvent] = useState<{
    title: string;
    startAt: string;
    endAt: string;
    allDay: boolean;
    eventType: "GENERAL" | "MEETING" | "DEADLINE" | "PERSONAL";
    description: string;
  }>(blankEvent());
  const [expense, setExpense] = useState<{
    amount: string;
    description: string;
    expenseDate: string;
    categoryId: string;
    paymentMethod: "CASH" | "CARD" | "BANK_TRANSFER" | "MOBILE_WALLET" | "OTHER";
    vendor: string;
  }>(blankExpense());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState<{ type: QAType; redirect: string } | null>(null);

  const targetLabel = type === "task" ? "tasks" : type === "event" ? "calendar" : "expenses";

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    setBusy(true);
    try {
      let body: unknown;
      if (type === "task") {
        const startAt = task.dueDate ? fromDhakaInput(task.dueDate) : null;
        body = { type, title: task.title.trim(), priority: task.priority, dueDate: startAt, projectId: task.projectId || null };
      } else if (type === "event") {
        const startAt = event.startAt ? fromDhakaInput(event.startAt) : null;
        const endAt = event.endAt ? fromDhakaInput(event.endAt) : null;
        if (!startAt || !endAt) throw new Error("Start and end are required");
        body = { type, title: event.title.trim(), startAt, endAt, allDay: event.allDay, eventType: event.eventType, description: event.description || null };
      } else {
        if (!expense.amount || Number(expense.amount) <= 0) throw new Error("Amount is required");
        if (!expense.categoryId.trim()) throw new Error("Category is required");
        const expenseDate = expense.expenseDate ? fromDhakaInput(expense.expenseDate) : null;
        if (!expenseDate) throw new Error("Date is required");
        body = { type, amount: Number(expense.amount), description: expense.description || null, expenseDate, paymentMethod: expense.paymentMethod, vendor: expense.vendor || null, categoryId: expense.categoryId };
      }

      const response = await fetch("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Request failed (${response.status})`);
      }
      const result = (await response.json()) as { redirect: string };
      setOk({ type, redirect: result.redirect });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Utilities"
        title="Quick add"
        description="One entry point for tasks, events, and expenses."
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="New entry" description={`Adding a ${type}.`} />
          <div className="px-5 pb-5">
            <div className="mb-5 grid grid-cols-3 gap-2">
              {FORMS.map((form) => {
                const Icon = form.icon;
                const active = type === form.value;
                return (
                  <button
                    key={form.value}
                    type="button"
                    onClick={() => {
                      setType(form.value);
                      setError("");
                      setOk(null);
                    }}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors",
                      active
                        ? "border-accent/50 bg-accent-soft"
                        : "border-line bg-surface-2 hover:border-line-strong",
                    )}
                  >
                    <Icon size={16} className={active ? "text-accent" : "text-ink-3"} aria-hidden />
                    <span className={cn("text-[13px] font-medium", active ? "text-ink" : "text-ink-2")}>
                      {form.label}
                    </span>
                    <span className="text-[10px] text-ink-3">{form.hint}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={submit} className="space-y-4">
              {type === "task" ? (
                <>
                  <Field label="Title" htmlFor="qa-task-title">
                    <Input
                      id="qa-task-title"
                      value={task.title}
                      onChange={(e) => setTask({ ...task, title: e.target.value })}
                      placeholder="e.g. Review monthly spending"
                      maxLength={200}
                      autoFocus
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Due" htmlFor="qa-task-due">
                      <Input
                        id="qa-task-due"
                        type="datetime-local"
                        value={task.dueDate}
                        onChange={(e) => setTask({ ...task, dueDate: e.target.value })}
                      />
                    </Field>
                    <Field label="Priority" htmlFor="qa-task-priority">
                      <Select
                        id="qa-task-priority"
                        value={task.priority}
                        onChange={(e) =>
                          setTask({ ...task, priority: e.target.value as typeof task.priority })
                        }
                      >
                        {["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => (
                          <option key={priority} value={priority}>
                            {priority.charAt(0) + priority.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </>
              ) : null}

              {type === "event" ? (
                <>
                  <Field label="Title" htmlFor="qa-event-title">
                    <Input
                      id="qa-event-title"
                      value={event.title}
                      onChange={(e) => setEvent({ ...event, title: e.target.value })}
                      placeholder="e.g. Family lunch"
                      maxLength={200}
                      autoFocus
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Starts" htmlFor="qa-event-start">
                      <Input
                        id="qa-event-start"
                        type="datetime-local"
                        value={event.startAt}
                        onChange={(e) => setEvent({ ...event, startAt: e.target.value })}
                      />
                    </Field>
                    <Field label="Ends" htmlFor="qa-event-end">
                      <Input
                        id="qa-event-end"
                        type="datetime-local"
                        value={event.endAt}
                        onChange={(e) => setEvent({ ...event, endAt: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Type" htmlFor="qa-event-type">
                      <Select
                        id="qa-event-type"
                        value={event.eventType}
                        onChange={(e) =>
                          setEvent({ ...event, eventType: e.target.value as typeof event.eventType })
                        }
                      >
                        {["GENERAL", "MEETING", "DEADLINE", "PERSONAL"].map((eventType) => (
                          <option key={eventType} value={eventType}>
                            {eventType.charAt(0) + eventType.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        id="qa-all-day"
                        type="checkbox"
                        checked={event.allDay}
                        onChange={(e) => setEvent({ ...event, allDay: e.target.checked })}
                        className="size-5 rounded border-line bg-surface-2 accent-[var(--color-accent)]"
                      />
                      <label htmlFor="qa-all-day" className="text-[15px] text-ink-2 md:text-[13px]">
                        All day
                      </label>
                    </div>
                  </div>
                  <Field label="Description" htmlFor="qa-event-description">
                    <Textarea
                      id="qa-event-description"
                      value={event.description}
                      onChange={(e) => setEvent({ ...event, description: e.target.value })}
                      rows={2}
                      placeholder="Optional details"
                    />
                  </Field>
                </>
              ) : null}

              {type === "expense" ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Amount (BDT)" htmlFor="qa-expense-amount">
                      <Input
                        id="qa-expense-amount"
                        value={expense.amount}
                        onChange={(e) => setExpense({ ...expense, amount: e.target.value })}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        autoFocus
                      />
                    </Field>
                    <Field label="Date & time" htmlFor="qa-expense-date">
                      <Input
                        id="qa-expense-date"
                        type="datetime-local"
                        value={expense.expenseDate}
                        onChange={(e) => setExpense({ ...expense, expenseDate: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Category" htmlFor="qa-expense-category" hint="Category ID from your budget setup.">
                      <Input
                        id="qa-expense-category"
                        value={expense.categoryId}
                        onChange={(e) => setExpense({ ...expense, categoryId: e.target.value })}
                        placeholder="e.g. cat_groceries"
                      />
                    </Field>
                    <Field label="Payment method" htmlFor="qa-expense-method">
                      <Select
                        id="qa-expense-method"
                        value={expense.paymentMethod}
                        onChange={(e) =>
                          setExpense({
                            ...expense,
                            paymentMethod: e.target.value as ExpenseDTO["paymentMethod"],
                          })
                        }
                      >
                        {["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET", "OTHER"].map((method) => (
                          <option key={method} value={method}>
                            {method.charAt(0) + method.slice(1).toLowerCase().replace("_", " ")}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                  <Field label="Vendor" htmlFor="qa-expense-vendor">
                    <Input
                      id="qa-expense-vendor"
                      value={expense.vendor}
                      onChange={(e) => setExpense({ ...expense, vendor: e.target.value })}
                      maxLength={200}
                      placeholder="Optional"
                    />
                  </Field>
                  <Field label="Description" htmlFor="qa-expense-description">
                    <Textarea
                      id="qa-expense-description"
                      value={expense.description}
                      onChange={(e) => setExpense({ ...expense, description: e.target.value })}
                      maxLength={5000}
                      rows={2}
                      placeholder="Optional note"
                    />
                  </Field>
                </>
              ) : null}

              {error ? <Alert>{error}</Alert> : null}

              <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
                <Button type="submit" variant="primary" loading={busy} disabled={busy}>
                  <Plus size={15} aria-hidden /> Create {type}
                </Button>
              </div>
            </form>
          </div>
        </Card>

        <div className="space-y-5 lg:col-span-2">
          {ok ? (
            <Card className="border-positive/30 bg-positive-soft">
              <CardHeader title="Created" description={`Your ${ok.type} was saved successfully.`} />
              <div className="px-5 pb-5">
                <Button variant="secondary" size="sm" onClick={() => router.push(ok.redirect)}>
                  View in {targetLabel} <ArrowRight size={13} aria-hidden />
                </Button>
              </div>
            </Card>
          ) : (
            <Card>
              <CardHeader title="How it works" description="Shortcuts for daily capture." />
              <div className="space-y-3 px-5 pb-5 text-xs text-ink-2">
                <p className="rounded-lg border border-line bg-surface-2 p-3">
                  <span className="font-medium text-ink">Tasks</span> land in today&apos;s work queue
                  with the priority and due date you choose.
                </p>
                <p className="rounded-lg border border-line bg-surface-2 p-3">
                  <span className="font-medium text-ink">Events</span> appear on the calendar for the
                  selected month and day.
                </p>
                <p className="rounded-lg border border-line bg-surface-2 p-3">
                  <span className="font-medium text-ink">Expenses</span> update your monthly spending
                  and budget reports immediately.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
