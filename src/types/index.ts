export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";
export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "MOBILE_WALLET" | "OTHER";
export type ReminderStatus = "PENDING" | "SENT" | "FAILED" | "CANCELLED";
export type ReminderChannel = "APP" | "BROWSER";

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"];
export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const PROJECT_STATUSES: ProjectStatus[] = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"];
export const PAYMENT_METHODS: PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "MOBILE_WALLET", "OTHER"];

export const LABELS = {
  TASK_STATUS: {
    TODO: "To do",
    IN_PROGRESS: "In progress",
    DONE: "Done",
    CANCELLED: "Cancelled",
  },
  TASK_PRIORITY: {
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    URGENT: "Urgent",
  },
  PROJECT_STATUS: {
    PLANNING: "Planning",
    ACTIVE: "Active",
    ON_HOLD: "On hold",
    COMPLETED: "Completed",
    ARCHIVED: "Archived",
  },
  PAYMENT_METHOD: {
    CASH: "Cash",
    CARD: "Card",
    BANK_TRANSFER: "Bank transfer",
    MOBILE_WALLET: "Mobile wallet",
    OTHER: "Other",
  },
} as const;

/** Derived state: overdue = has future-less dueDate and not done/cancelled. */
export function isOverdue(task: { dueDate?: string | null; status: TaskStatus }, now = new Date()): boolean {
  if (task.status === "DONE" || task.status === "CANCELLED") return false;
  if (!task.dueDate) return false;
  return new Date(task.dueDate).getTime() < now.getTime();
}

/** Project progress rule (§10): completed / (completed + active), cancelled excluded. */
export function projectProgress(tasks: { status: TaskStatus }[]): number | null {
  const done = tasks.filter((t) => t.status === "DONE").length;
  const trackable = tasks.filter((t) => t.status !== "CANCELLED").length;
  if (trackable === 0) return null;
  return done / trackable;
}
