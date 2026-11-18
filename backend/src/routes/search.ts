import { Router } from "../lib/async-router";
import { prisma } from "../lib/prisma";

const router = Router();
const DEMO_USER_ID = "demo_user_001";

type Hit = {
  id: string;
  type: "task" | "page" | "project" | "event" | "goal" | "note" | "snippet" | "bookmark" | "meeting" | "reminder";
  title: string;
  subtitle?: string | null;
  href: string;
};

router.get("/", async (req, res) => {
  const userId = (req as any).user?.id ?? DEMO_USER_ID;
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) return res.json({ query: q, results: [] });

  const contains = { contains: q, mode: "insensitive" as const };

  const [tasks, pages, projects, events, goals, snippets, bookmarks, meetings, reminders] = await Promise.all([
    prisma.task.findMany({
      where: { userId, title: contains },
      select: { id: true, title: true, status: true, dueDate: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.page.findMany({
      where: { userId, archivedAt: null, title: contains },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
    prisma.project.findMany({
      where: { userId, archivedAt: null, name: contains },
      select: { id: true, name: true, status: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.calendarEvent.findMany({
      where: { userId, title: contains },
      select: { id: true, title: true, startAt: true },
      orderBy: { startAt: "desc" },
      take: 5,
    }),
    prisma.goal.findMany({
      where: { userId, title: contains },
      select: { id: true, title: true, status: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.snippet.findMany({
      where: {
        userId,
        OR: [
          { title: contains },
          { code: contains },
          { description: contains },
        ],
      },
      select: { id: true, title: true, language: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.bookmark.findMany({
      where: {
        userId,
        OR: [
          { title: contains },
          { url: contains },
          { description: contains },
        ],
      },
      select: { id: true, title: true, category: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.meeting.findMany({
      where: { userId, title: contains },
      select: { id: true, title: true, startAt: true },
      orderBy: { startAt: "desc" },
      take: 5,
    }),
    prisma.reminder.findMany({
      where: { userId, message: contains },
      select: { id: true, message: true, scheduledAt: true, status: true },
      orderBy: { scheduledAt: "desc" },
      take: 5,
    }),
  ]);

  const results: Hit[] = [
    ...tasks.map((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      subtitle: t.status,
      href: "/tasks",
    })),
    ...pages.map((p) => ({
      id: p.id,
      type: "page" as const,
      title: p.title,
      subtitle: "Page",
      href: `/workspace?page=${p.id}`,
    })),
    ...projects.map((p) => ({
      id: p.id,
      type: "project" as const,
      title: p.name,
      subtitle: p.status,
      href: "/projects",
    })),
    ...events.map((e) => ({
      id: e.id,
      type: "event" as const,
      title: e.title,
      subtitle: new Date(e.startAt).toLocaleDateString(),
      href: "/calendar",
    })),
    ...goals.map((g) => ({
      id: g.id,
      type: "goal" as const,
      title: g.title,
      subtitle: g.status,
      href: "/goals",
    })),
    ...snippets.map((s) => ({
      id: s.id,
      type: "snippet" as const,
      title: s.title,
      subtitle: s.language,
      href: "/dev",
    })),
    ...bookmarks.map((b) => ({
      id: b.id,
      type: "bookmark" as const,
      title: b.title,
      subtitle: b.category,
      href: "/dev",
    })),
    ...meetings.map((m) => ({
      id: m.id,
      type: "meeting" as const,
      title: m.title,
      subtitle: new Date(m.startAt).toLocaleString(),
      href: "/meetings",
    })),
    ...reminders.map((r) => ({
      id: r.id,
      type: "reminder" as const,
      title: r.message,
      subtitle: r.status,
      href: "/reminders",
    })),
  ];

  res.json({ query: q, count: results.length, results });
});

export default router;
