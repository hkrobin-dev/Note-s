import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/api-response";
import type { CreateFileInput, FileQueryInput, UpdateFileInput } from "@/lib/validation/file";

const DEFAULT_LIMIT = 100;

export const fileInclude = {
  links: {
    select: { id: true, linkedId: true, linkedKind: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  },
} satisfies Prisma.StoredFileInclude;

export type FileWithRelations = Prisma.StoredFileGetPayload<{ include: typeof fileInclude }>;

export async function listFiles(query: FileQueryInput) {
  const where: Prisma.StoredFileWhereInput = {};

  if (query.mimeType) where.mimeType = query.mimeType;

  if (query.q) {
    where.OR = [
      { filename: { contains: query.q, mode: "insensitive" } },
      { safeFilename: { contains: query.q, mode: "insensitive" } },
    ];
  }

  return prisma.storedFile.findMany({
    where,
    include: fileInclude,
    orderBy: [{ createdAt: "desc" }],
    take: query.limit ?? DEFAULT_LIMIT,
  });
}

export async function getFile(id: string) {
  const file = await prisma.storedFile.findUnique({
    where: { id },
    include: fileInclude,
  });
  if (!file) throw new NotFoundError("File not found");
  return file;
}

export async function createFile(input: CreateFileInput) {
  return prisma.$transaction(async (tx) => {
    const file = await tx.storedFile.create({
      data: input,
      include: fileInclude,
    });

    await tx.activityLog.create({
      data: {
        entityType: "FILE",
        entityId: file.id,
        action: "CREATED",
        detail: { filename: file.filename, mimeType: file.mimeType },
      },
    });

    return file;
  });
}

export async function updateFile(id: string, input: UpdateFileInput) {
  const existing = await prisma.storedFile.findUnique({
    where: { id },
    select: { id: true, filename: true },
  });
  if (!existing) throw new NotFoundError("File not found");

  return prisma.$transaction(async (tx) => {
    const file = await tx.storedFile.update({
      where: { id },
      data: input,
      include: fileInclude,
    });

    await tx.activityLog.create({
      data: {
        entityType: "FILE",
        entityId: file.id,
        action: "UPDATED",
        detail: { filename: file.filename },
      },
    });

    return file;
  });
}

export async function deleteFile(id: string) {
  const existing = await prisma.storedFile.findUnique({
    where: { id },
    select: { id: true, filename: true },
  });
  if (!existing) throw new NotFoundError("File not found");

  return prisma.$transaction(async (tx) => {
    await tx.storedFile.delete({ where: { id } });
    await tx.activityLog.create({
      data: {
        entityType: "FILE",
        entityId: existing.id,
        action: "DELETED",
        detail: { filename: existing.filename },
      },
    });
    return existing;
  });
}

export async function getFileSizeStats() {
  const [total, byteSum] = await Promise.all([
    prisma.storedFile.count(),
    prisma.storedFile.aggregate({
      _sum: { byteSize: true },
    }),
  ]);
  return { total, byteSum: byteSum._sum.byteSize ?? 0 };
}
