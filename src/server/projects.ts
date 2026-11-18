import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/api-response";
import type { CreateProjectInput, ProjectQueryInput, UpdateProjectInput } from "@/lib/validation/project";
import type { ProjectStatus } from "@/types";
import type { TaskPriority } from "@/types";

const DEFAULT_LIMIT = 100;

export const projectInclude = {
  _count: {
    select: { tasks: true, pages: true, events: true, expenses: true },
  },
  tasks: {
    select: { id: true, title: true, status: true, dueDate: true, priority: true },
    orderBy: { dueDate: "asc" },
    take: 5,
  },
} satisfies Prisma.ProjectInclude;

export type ProjectWithRelations = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

export async function listProjects(query: ProjectQueryInput) {
  const where: Prisma.ProjectWhereInput = {};

  if (query.status) where.status = query.status as ProjectStatus;
  if (query.priority) where.priority = query.priority as TaskPriority;

  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return prisma.project.findMany({
    where,
    include: projectInclude,
    orderBy: [{ updatedAt: "desc" }],
    take: query.limit ?? DEFAULT_LIMIT,
  });
}

export async function getProject(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: projectInclude,
  });
  if (!project) throw new NotFoundError("Project not found");
  return project;
}

export async function createProject(input: CreateProjectInput) {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: input,
      include: projectInclude,
    });

    await tx.activityLog.create({
      data: {
        entityType: "PROJECT",
        entityId: project.id,
        action: "CREATED",
        detail: { name: project.name, status: project.status },
      },
    });

    return project;
  });
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  const existing = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true, status: true },
  });
  if (!existing) throw new NotFoundError("Project not found");

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id },
      data: input,
      include: projectInclude,
    });

    await tx.activityLog.create({
      data: {
        entityType: "PROJECT",
        entityId: project.id,
        action: "UPDATED",
        detail: { name: project.name, status: project.status },
      },
    });

    return project;
  });
}

export async function deleteProject(id: string) {
  const existing = await prisma.project.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing) throw new NotFoundError("Project not found");

  return prisma.$transaction(async (tx) => {
    await tx.project.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        entityType: "PROJECT",
        entityId: existing.id,
        action: "DELETED",
        detail: { name: existing.name },
      },
    });
    return existing;
  });
}
