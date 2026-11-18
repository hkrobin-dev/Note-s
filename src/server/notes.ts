import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/api-response";
import type { CreateNoteInput, NoteQueryInput, UpdateNoteInput } from "@/lib/validation/note";

const DEFAULT_LIMIT = 100;

export const noteInclude = {
  project: { select: { id: true, name: true, accentColor: true } },
  parent: { select: { id: true, title: true } },
  children: { select: { id: true, title: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 5 },
  taggedWith: { include: { tag: { select: { id: true, name: true, color: true } } } },
} satisfies Prisma.PageInclude;

export type NoteWithRelations = Prisma.PageGetPayload<{ include: typeof noteInclude }>;

export async function listNotes(query: NoteQueryInput) {
  const where: Prisma.PageWhereInput = {};

  if (query.projectId) where.projectId = query.projectId;
  if (query.parentId === undefined) where.parentId = null; // top-level notes only by default
  if (query.favorite === "true") where.favorite = true;
  if (query.favorite === "false") where.favorite = false;
  if (query.archived === "true") where.archivedAt = { not: null };
  if (query.archived === "false") where.archivedAt = null;

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return prisma.page.findMany({
    where,
    include: noteInclude,
    orderBy: [{ favorite: "desc" }, { order: "asc" }, { updatedAt: "desc" }],
    take: query.limit ?? DEFAULT_LIMIT,
  });
}

export async function getNote(id: string) {
  const note = await prisma.page.findUnique({
    where: { id },
    include: noteInclude,
  });
  if (!note) throw new NotFoundError("Note not found");
  return note;
}

export async function createNote(input: CreateNoteInput) {
  return prisma.$transaction(async (tx) => {
    const note = await tx.page.create({
      data: input,
      include: noteInclude,
    });

    await tx.activityLog.create({
      data: {
        entityType: "PAGE",
        entityId: note.id,
        action: "CREATED",
        detail: { title: note.title, projectId: note.projectId },
      },
    });

    return note;
  });
}

export async function updateNote(id: string, input: UpdateNoteInput) {
  const existing = await prisma.page.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!existing) throw new NotFoundError("Note not found");

  return prisma.$transaction(async (tx) => {
    const note = await tx.page.update({
      where: { id },
      data: input,
      include: noteInclude,
    });

    await tx.activityLog.create({
      data: {
        entityType: "PAGE",
        entityId: note.id,
        action: "UPDATED",
        detail: { title: note.title },
      },
    });

    return note;
  });
}

export async function deleteNote(id: string) {
  const existing = await prisma.page.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!existing) throw new NotFoundError("Note not found");

  return prisma.$transaction(async (tx) => {
    await tx.page.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        entityType: "PAGE",
        entityId: existing.id,
        action: "DELETED",
        detail: { title: existing.title },
      },
    });
    return existing;
  });
}
