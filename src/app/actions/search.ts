"use server";

import { prisma } from "@/lib/db";

export type SearchResult =
  | { kind: "task"; id: string; title: string; subtitle: string | null; url: string; status: string }
  | { kind: "event"; id: string; title: string; subtitle: string | null; url: string; startAt: string }
  | { kind: "expense"; id: string; title: string; subtitle: string | null; url: string; amount: string }
  | { kind: "note"; id: string; title: string; subtitle: string | null; url: string; updatedAt: string }
  | { kind: "project"; id: string; title: string; subtitle: string | null; url: string; status: string }
  | { kind: "file"; id: string; title: string; subtitle: string | null; url: string; mimeType: string };

export async function searchAll(q: string): Promise<SearchResult[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  const like = { contains: trimmed, mode: "insensitive" as const };

  const [tasks, events, expenses, notes, projects, files] = await Promise.all([
    prisma.task.findMany({
      where: { OR: [{ title: like }, { description: like }] },
      select: { id: true, title: true, description: true, status: true, dueDate: true },
      take: 10,
    }),
    prisma.calendarEvent.findMany({
      where: { OR: [{ title: like }, { description: like }, { location: like }] },
      select: { id: true, title: true, description: true, location: true, startAt: true },
      take: 10,
    }),
    prisma.expense.findMany({
      where: { OR: [{ description: like }, { vendor: like }] },
      select: {
        id: true,
        description: true,
        vendor: true,
        amount: true,
        expenseDate: true,
        category: { select: { name: true } },
      },
      take: 10,
    }),
    prisma.page.findMany({
      where: { OR: [{ title: like }] },
      select: { id: true, title: true, updatedAt: true },
      take: 10,
    }),
    prisma.project.findMany({
      where: { OR: [{ name: like }, { description: like }] },
      select: { id: true, name: true, description: true, status: true },
      take: 10,
    }),
    prisma.storedFile.findMany({
      where: { OR: [{ filename: like }, { safeFilename: like }] },
      select: { id: true, filename: true, mimeType: true },
      take: 10,
    }),
  ]);

  const results: SearchResult[] = [];

  for (const t of tasks) {
    results.push({
      kind: "task",
      id: t.id,
      title: t.title,
      subtitle: t.description ?? (t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : null),
      url: `/tasks`,
      status: t.status,
    });
  }
  for (const e of events) {
    results.push({
      kind: "event",
      id: e.id,
      title: e.title,
      subtitle: e.location ?? e.description ?? null,
      url: `/calendar`,
      startAt: e.startAt.toISOString(),
    });
  }
  for (const ex of expenses) {
    results.push({
      kind: "expense",
      id: ex.id,
      title: ex.description ?? ex.vendor ?? "Expense",
      subtitle: ex.category?.name,
      url: `/expenses`,
      amount: Number(ex.amount).toLocaleString("en-BD", { style: "currency", currency: "BDT" }),
    });
  }
  for (const n of notes) {
    results.push({
      kind: "note",
      id: n.id,
      title: n.title,
      subtitle: `Updated ${new Date(n.updatedAt).toLocaleDateString()}`,
      url: `/notes`,
      updatedAt: n.updatedAt.toISOString(),
    });
  }
  for (const p of projects) {
    results.push({
      kind: "project",
      id: p.id,
      title: p.name,
      subtitle: p.description ?? null,
      url: `/projects`,
      status: p.status,
    });
  }
  for (const f of files) {
    results.push({
      kind: "file",
      id: f.id,
      title: f.filename,
      subtitle: f.mimeType,
      url: `/files`,
      mimeType: f.mimeType,
    });
  }

  return results;
}
