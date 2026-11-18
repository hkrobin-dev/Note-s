import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { dhakaDayBounds } from "@/lib/dates";
import { NotFoundError } from "@/lib/api-response";
import type { CreateTaskInput, TaskQueryInput, UpdateTaskInput } from "@/lib/validation/task";
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from "@/lib/validation/task";
import type { TaskPriority, TaskStatus } from "@/types";

export const taskInclude = {
  project: { select: { id: true, name: true, accentColor: true } },
  taggedWith: { include: { tag: { select: { id: true, name: true, color: true } } } },
} satisfies Prisma.TaskInclude;

export type TaskWithRelations = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

function enumList<T extends string>(raw: string | undefined, allowed: readonly T[]): T[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim().toUpperCase())
    .filter((v): v is T => (allowed as readonly string[]).includes(v));
}

export async function listTasks(query: TaskQueryInput) {
  const statuses = enumList<TaskStatus>(query.status, TASK_STATUS_VALUES);
  const priorities = enumList<TaskPriority>(query.priority, TASK_PRIORITY_VALUES);
  const includeDone = query.includeDone === "true";

  const where: Prisma.TaskWhereInput = {};

  if (statuses.length > 0) {
    where.status = { in: statuses };
  } else if (!includeDone) {
    where.status = { in: ["TODO", "IN_PROGRESS"] };
  }

  if (priorities.length > 0) where.priority = { in: priorities };
  if (query.projectId) where.projectId = query.projectId;

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
    ];
  }

  if (query.due) {
    const today = dhakaDayBounds();
    const week = dhakaDayBounds(7);

    if (query.due === "today") {
      where.dueDate = { gte: today.start, lte: today.end };
    } else if (query.due === "week") {
      where.dueDate = { gte: today.start, lte: week.end };
    } else if (query.due === "overdue") {
      where.dueDate = { lt: new Date() };
      where.AND = [{ status: { in: ["TODO", "IN_PROGRESS"] } }];
    }
  }

  return prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [
      { dueDate: { sort: "asc", nulls: "last" } },
      { priority: "desc" },
      { createdAt: "desc" },
    ],
    take: query.limit ?? 100,
  });
}

export type TaskStats = {
  open: number;
  dueToday: number;
  overdue: number;
  completedToday: number;
};

export async function getTaskStats(): Promise<TaskStats> {
  const today = dhakaDayBounds();
  const [open, dueToday, overdue, completedToday] = await Promise.all([
    prisma.task.count({ where: { status: { in: ["TODO", "IN_PROGRESS"] } } }),
    prisma.task.count({
      where: { status: { in: ["TODO", "IN_PROGRESS"] }, dueDate: { gte: today.start, lte: today.end } },
    }),
    prisma.task.count({
      where: { status: { in: ["TODO", "IN_PROGRESS"] }, dueDate: { lt: new Date() } },
    }),
    prisma.task.count({
      where: { status: "DONE", completedAt: { gte: today.start, lte: today.end } },
    }),
  ]);
  return { open, dueToday, overdue, completedToday };
}

export async function getTask(id: string) {
  return prisma.task.findUnique({ where: { id }, include: taskInclude });
}

export async function createTask(input: CreateTaskInput) {
  const { tagIds, ...data } = input;
  const uniqueTagIds = [...new Set(tagIds)];

  return prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        ...data,
        completedAt: data.status === "DONE" ? new Date() : null,
        taggedWith: uniqueTagIds.length
          ? { create: uniqueTagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: taskInclude,
    });

    await tx.activityLog.create({
      data: {
        entityType: "TASK",
        entityId: task.id,
        action: "CREATED",
        detail: { title: task.title },
      },
    });

    return task;
  });
}

export async function updateTask(id: string, input: UpdateTaskInput) {
  const { tagIds, ...data } = input;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.task.findUnique({
      where: { id },
      select: { status: true, dueDate: true, originalDueDate: true, title: true },
    });
    if (!existing) throw new NotFoundError("Task not found");

    const update: Prisma.TaskUncheckedUpdateInput = { ...data };

    if (data.status && data.status !== existing.status) {
      update.completedAt = data.status === "DONE" ? new Date() : null;
    }

    // Keep a rescheduling trail instead of silently overwriting the due date.
    if (data.dueDate !== undefined) {
      const nextDue = data.dueDate ? new Date(data.dueDate).getTime() : null;
      const prevDue = existing.dueDate ? existing.dueDate.getTime() : null;
      if (nextDue !== prevDue) {
        update.rescheduledFrom = existing.dueDate;
        update.originalDueDate = existing.originalDueDate ?? existing.dueDate;
      }
    }

    if (tagIds) {
      await tx.taskTag.deleteMany({ where: { taskId: id } });
      if (tagIds.length > 0) {
        await tx.taskTag.createMany({
          data: [...new Set(tagIds)].map((tagId) => ({ taskId: id, tagId })),
          skipDuplicates: true,
        });
      }
    }

    const task = await tx.task.update({ where: { id }, data: update, include: taskInclude });

    const action =
      data.status === "DONE" && existing.status !== "DONE"
        ? "COMPLETED"
        : data.dueDate !== undefined && task.rescheduledFrom
          ? "RESCHEDULED"
          : "UPDATED";

    await tx.activityLog.create({
      data: {
        entityType: "TASK",
        entityId: task.id,
        action,
        detail: { title: task.title, status: task.status },
      },
    });

    return task;
  });
}

export async function deleteTask(id: string) {
  return prisma.$transaction(async (tx) => {
    const task = await tx.task.delete({ where: { id }, select: { id: true, title: true } });
    await tx.activityLog.create({
      data: {
        entityType: "TASK",
        entityId: task.id,
        action: "DELETED",
        detail: { title: task.title },
      },
    });
    return task;
  });
}
