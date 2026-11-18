import { createTask } from "@/server/tasks";
import { createCalendarEvent } from "@/server/calendar";
import { createExpense } from "@/server/expenses";
import type { CreateTaskInput } from "@/lib/validation/task";
import type { QuickAddTaskInput, QuickAddEventInput, QuickAddExpenseInput } from "@/lib/validation/quick-add";

export interface QuickAddResult {
  type: "task" | "event" | "expense";
  redirect: string;
  task?: Awaited<ReturnType<typeof createTask>>;
  event?: Awaited<ReturnType<typeof createCalendarEvent>>;
  expense?: Awaited<ReturnType<typeof createExpense>>;
}

export async function handleQuickAdd(
  type: "task" | "event" | "expense",
  payload: QuickAddTaskInput | QuickAddEventInput | QuickAddExpenseInput,
): Promise<QuickAddResult> {
  switch (type) {
    case "task": {
      const p = payload as QuickAddTaskInput;
      const taskInput: CreateTaskInput = {
        title: p.title,
        description: p.description ?? null,
        status: "TODO",
        priority: p.priority ?? "MEDIUM",
        startDate: undefined,
        dueDate: p.dueDate ?? null,
        estimatedMins: undefined,
        projectId: p.projectId ?? null,
        parentTaskId: undefined,
        tagIds: [],
      };
      const task = await createTask(taskInput);
      return { type: "task", redirect: "/tasks", task };
    }
    case "event": {
      const event = await createCalendarEvent(payload as QuickAddEventInput);
      return { type: "event", redirect: "/calendar", event };
    }
    case "expense": {
      const p = payload as QuickAddExpenseInput;
      const data: Omit<QuickAddExpenseInput, "type"> = {
        amount: p.amount,
        description: p.description,
        expenseDate: p.expenseDate,
        paymentMethod: p.paymentMethod,
        vendor: p.vendor,
        categoryId: p.categoryId,
        projectId: p.projectId,
      };
      const expense = await createExpense(data);
      return { type: "expense", redirect: "/expenses", expense };
    }
  }
}
