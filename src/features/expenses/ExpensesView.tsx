"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Clock3,
  Pencil,
  Plus,
  Receipt,
  Tags,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  fetchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseDTO,
  type ExpensePayload,
} from "@/features/expenses/api";
import { fromDhakaInput, toDhakaInput } from "@/features/tasks/format";
import { dhakaDayKey } from "@/lib/dates";
import { formatAmount } from "@/features/expenses/format";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  ListSkeleton,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  StatCard,
  Textarea,
} from "@/components/ui";

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "MOBILE_WALLET", label: "Mobile wallet" },
  { value: "OTHER", label: "Other" },
];

const PAYMENT_LABEL = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

const DAY_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  weekday: "long",
  day: "numeric",
  month: "short",
});

function blankForm(): Partial<ExpenseDTO> {
  return {
    amount: "",
    description: "",
    expenseDate: "",
    paymentMethod: "CASH",
    categoryId: "",
    vendor: "",
  };
}

function dayLabel(key: string): string {
  const today = dhakaDayKey();
  if (key === today) return "Today";
  if (key === dhakaDayKey(new Date(Date.now() - 86_400_000))) return "Yesterday";
  return DAY_FMT.format(new Date(`${key}T00:00:00+06:00`));
}

export function ExpensesView() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseDTO | null>(null);
  const [form, setForm] = useState<Partial<ExpenseDTO>>(blankForm());

  const query = useQuery({
    queryKey: ["expenses"],
    queryFn: () => fetchExpenses({}),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["expenses"] });

  const createMutation = useMutation({
    mutationFn: (payload: ExpensePayload & { amount: string | number; expenseDate: string; categoryId: string }) =>
      createExpense(payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ExpensePayload }) => updateExpense(id, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: invalidate,
  });

  const expenses = useMemo(() => query.data?.expenses ?? [], [query.data]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return expenses;
    return expenses.filter((expense) =>
      [expense.description, expense.vendor, expense.category?.name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [expenses, q]);

  const total = filtered.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const todayCount = expenses.filter((expense) => dhakaDayKey(expense.expenseDate) === dhakaDayKey()).length;
  const categories = new Set(expenses.map((expense) => expense.categoryId));
  const categoryOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const expense of expenses) {
      if (expense.categoryId) seen.set(expense.categoryId, expense.category?.name ?? expense.categoryId);
    }
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [expenses]);

  const grouped = useMemo(() => {
    const map = new Map<string, ExpenseDTO[]>();
    for (const expense of filtered) {
      const key = dhakaDayKey(expense.expenseDate);
      map.set(key, [...(map.get(key) ?? []), expense]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error;

  function openCreate() {
    setEditing(null);
    setForm(blankForm());
    setOpen(true);
  }

  function openEdit(expense: ExpenseDTO) {
    setEditing(expense);
    setForm({
      amount: expense.amount,
      description: expense.description ?? "",
      expenseDate: toDhakaInput(expense.expenseDate),
      paymentMethod: expense.paymentMethod,
      vendor: expense.vendor ?? "",
      categoryId: expense.categoryId,
    });
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    const expenseDate = form.expenseDate ? fromDhakaInput(form.expenseDate) : null;
    if (!expenseDate) return;
    const payload = {
      amount: Number(form.amount),
      description: form.description || null,
      expenseDate,
      paymentMethod: form.paymentMethod ?? "CASH",
      vendor: form.vendor || null,
      categoryId: form.categoryId ?? "",
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

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      // Error surfaced in the view.
    }
  }

  const amountValid = Boolean(form.amount) && Number(form.amount) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Money"
        title="Expenses"
        description="Every purchase in one place, grouped by day and category."
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus size={15} aria-hidden /> Add expense
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total spent" value={formatAmount(total)} icon={Wallet} />
        <StatCard label="Transactions" value={String(filtered.length)} icon={Receipt} />
        <StatCard label="Categories" value={String(categories.size)} icon={Tags} />
        <StatCard
          label="Logged today"
          value={String(todayCount)}
          icon={CalendarDays}
          tone={todayCount > 0 ? "accent" : "neutral"}
        />
      </section>

      {mutationError ? (
        <Alert>
          <span className="font-medium">Could not save the expense.</span> {mutationError.message}
        </Alert>
      ) : null}

      <Card>
        <CardHeader
          title="All expenses"
          description={`${filtered.length} record${filtered.length === 1 ? "" : "s"}${q ? " matching search" : ""}`}
          action={
            <SearchInput
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search expenses…"
              className="w-44 sm:w-56"
            />
          }
        />

        {query.isPending ? (
          <ListSkeleton rows={5} />
        ) : query.isError ? (
          <EmptyState
            icon={Receipt}
            title="Could not load expenses"
            description={query.error.message}
            action={
              <Button size="sm" onClick={() => query.refetch()}>
                Try again
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={q ? "No matching expenses" : "No expenses yet"}
            description={
              q ? "Try a different description, vendor, or category." : "Log your first expense to start tracking."
            }
            action={
              q ? (
                <Button size="sm" variant="secondary" onClick={() => setQ("")}>
                  Clear search
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={openCreate}>
                  <Plus size={14} aria-hidden /> Add expense
                </Button>
              )
            }
          />
        ) : (
          <div className="border-t border-line">
            {grouped.map(([key, rows]) => (
              <section key={key}>
                <h3 className="flex items-center justify-between border-b border-line bg-surface-2/50 px-5 py-1.5 text-[11px] font-medium text-ink-3">
                  <span>{dayLabel(key)}</span>
                  <span className="tabular">
                    {formatAmount(rows.reduce((sum, row) => sum + Number(row.amount), 0))}
                  </span>
                </h3>
                <ul className="divide-y divide-line">
                  {rows.map((expense) => (
                    <li key={expense.id} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/40">
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-ink-3">
                        <Receipt size={14} aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-ink">
                          {expense.description || expense.category?.name || "Expense"}
                        </p>
                        <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-ink-3">
                          <span>{expense.category?.name ?? expense.categoryId}</span>
                          <span aria-hidden>·</span>
                          <span>{PAYMENT_LABEL[expense.paymentMethod] ?? expense.paymentMethod}</span>
                          {expense.vendor ? (
                            <>
                              <span aria-hidden>·</span>
                              <span className="truncate">{expense.vendor}</span>
                            </>
                          ) : null}
                          <span className="flex items-center gap-1">
                            <Clock3 size={10} aria-hidden />
                            {new Intl.DateTimeFormat("en-GB", {
                              timeZone: "Asia/Dhaka",
                              hour: "2-digit",
                              minute: "2-digit",
                            }).format(new Date(expense.expenseDate))}
                          </span>
                        </p>
                      </div>
                      <span className="tabular shrink-0 text-[13px] font-medium text-ink">
                        {formatAmount(expense.amount)}
                      </span>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => openEdit(expense)}
                          aria-label="Edit expense"
                          className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <Pencil size={13} aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(expense.id)}
                          aria-label="Delete expense"
                          className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-error-soft hover:text-error sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <Trash2 size={13} aria-hidden />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit expense" : "New expense"}
        description={editing ? "Update the recorded transaction." : "Record a purchase in seconds."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="expense-form"
              variant="primary"
              disabled={!amountValid}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? "Save changes" : "Add expense"}
            </Button>
          </>
        }
      >
        <form id="expense-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (BDT)" htmlFor="expense-amount">
            <Input
              id="expense-amount"
              value={form.amount ?? ""}
              onChange={(event) => setForm({ ...form, amount: event.target.value })}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              autoFocus
            />
          </Field>

          <Field label="Date & time" htmlFor="expense-date">
            <Input
              id="expense-date"
              type="datetime-local"
              value={form.expenseDate ?? ""}
              onChange={(event) => setForm({ ...form, expenseDate: event.target.value })}
            />
          </Field>

          <Field label="Category" htmlFor="expense-category" hint="Use an existing category or type a new ID.">
            <Input
              id="expense-category"
              list="expense-category-options"
              value={form.categoryId ?? ""}
              onChange={(event) => setForm({ ...form, categoryId: event.target.value })}
              placeholder="e.g. cat_groceries"
            />
            <datalist id="expense-category-options">
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </datalist>
          </Field>

          <Field label="Payment method" htmlFor="expense-method">
            <Select
              id="expense-method"
              value={(form.paymentMethod ?? "CASH") as ExpenseDTO["paymentMethod"]}
              onChange={(event) =>
                setForm({ ...form, paymentMethod: event.target.value as ExpenseDTO["paymentMethod"] })
              }
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Vendor" htmlFor="expense-vendor" className="sm:col-span-2">
            <Input
              id="expense-vendor"
              value={form.vendor ?? ""}
              onChange={(event) => setForm({ ...form, vendor: event.target.value })}
              maxLength={200}
              placeholder="Where did you spend it?"
            />
          </Field>

          <Field label="Description" htmlFor="expense-description" className="sm:col-span-2">
            <Textarea
              id="expense-description"
              value={form.description ?? ""}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              maxLength={5000}
              rows={2}
              placeholder="Optional note"
            />
          </Field>

          {mutationError ? (
            <Alert className="sm:col-span-2">{mutationError.message}</Alert>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
