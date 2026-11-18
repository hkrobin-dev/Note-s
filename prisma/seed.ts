import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Development seed — realistic single-user data for the Dhaka timezone.
 * Idempotent: every record uses a stable id and is upserted, so re-running
 * refreshes the sample data instead of duplicating it.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const TZ = "Asia/Dhaka";

function dhakaDay(offsetDays = 0): string {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function at(offsetDays: number, time = "09:00"): Date {
  return new Date(`${dhakaDay(offsetDays)}T${time}:00+06:00`);
}

function monthMarker(): Date {
  const [y, m] = dhakaDay().split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

async function main() {
  const USER_ID = "demo_user_001";

  // Ensure the demo user exists (all user-owned records default to this id).
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: { id: USER_ID, email: "demo@mylifeos.local", username: "demo", passwordHash: "x" },
  });

  // ---------------------------------------------------------------- settings
  await prisma.appSetting.upsert({
    where: { key: "preferences" },
    update: {},
    create: {
      key: "preferences",
      value: { currency: "BDT", timezone: TZ, weekStartsOn: 0, theme: "glass-dark" },
    },
  });

  // -------------------------------------------------------------- categories
  const categories = [
    { id: "cat_groceries", name: "Groceries", color: "#39c98a", icon: "shopping-basket", order: 1 },
    { id: "cat_rent", name: "Rent", color: "#7c8cff", icon: "home", order: 2 },
    { id: "cat_utilities", name: "Utilities", color: "#f4b860", icon: "zap", order: 3 },
    { id: "cat_transport", name: "Transport", color: "#67d5ff", icon: "bus", order: 4 },
    { id: "cat_dining", name: "Dining out", color: "#f07878", icon: "utensils", order: 5 },
    { id: "cat_health", name: "Health", color: "#c084fc", icon: "heart-pulse", order: 6 },
    { id: "cat_education", name: "Education", color: "#38bdf8", icon: "book-open", order: 7 },
    { id: "cat_shopping", name: "Shopping", color: "#fb7185", icon: "shopping-bag", order: 8 },
    { id: "cat_subscriptions", name: "Subscriptions", color: "#a3e635", icon: "repeat", order: 9 },
    { id: "cat_other", name: "Other", color: "#94a3b8", icon: "circle-ellipsis", order: 10 },
  ];
  for (const c of categories) {
    await prisma.expenseCategory.upsert({ where: { id: c.id }, update: c, create: c });
  }

  // ------------------------------------------------------------------ tags
  const tags = [
    { id: "tag_work", name: "work", color: "#7c8cff" },
    { id: "tag_personal", name: "personal", color: "#39c98a" },
    { id: "tag_urgent", name: "urgent", color: "#f07878" },
    { id: "tag_reading", name: "reading", color: "#f4b860" },
  ];
  for (const t of tags) {
    await prisma.tag.upsert({ where: { id: t.id }, update: t, create: t });
  }

  // -------------------------------------------------------------- projects
  const projects = [
    {
      id: "proj_website",
      name: "Website redesign",
      description: "Portfolio refresh — new visual system, case studies, and CMS.",
      status: "ACTIVE" as const,
      priority: "HIGH" as const,
      startDate: at(-21),
      deadline: at(17, "18:00"),
      accentColor: "#7c8cff",
      icon: "globe",
    },
    {
      id: "proj_savings",
      name: "Personal savings plan",
      description: "Build a six-month emergency fund and automate monthly transfers.",
      status: "ACTIVE" as const,
      priority: "MEDIUM" as const,
      startDate: at(-60),
      deadline: at(33, "18:00"),
      accentColor: "#39c98a",
      icon: "piggy-bank",
    },
    {
      id: "proj_office",
      name: "Home office setup",
      description: "Desk, lighting, and ergonomics upgrade.",
      status: "ACTIVE" as const,
      priority: "MEDIUM" as const,
      startDate: at(-14),
      deadline: at(1, "18:00"),
      accentColor: "#67d5ff",
      icon: "monitor",
    },
  ];
  for (const p of projects) {
    await prisma.project.upsert({ where: { id: p.id }, update: p, create: p });
  }

  // ----------------------------------------------------------------- tasks
  const tasks = [
    {
      id: "task_spending_review",
      title: "Review monthly spending summary",
      status: "IN_PROGRESS" as const,
      priority: "HIGH" as const,
      dueDate: at(0, "11:00"),
      estimatedMins: 45,
      projectId: "proj_savings",
      tags: ["tag_personal"],
    },
    {
      id: "task_isp_bill",
      title: "Confirm ISP bill payment",
      status: "TODO" as const,
      priority: "MEDIUM" as const,
      dueDate: at(0, "18:00"),
      estimatedMins: 10,
      projectId: null,
      tags: ["tag_personal"],
    },
    {
      id: "task_reading",
      title: "30 min reading session",
      status: "DONE" as const,
      priority: "LOW" as const,
      dueDate: at(0, "08:00"),
      completedAt: at(0, "08:40"),
      estimatedMins: 30,
      projectId: null,
      tags: ["tag_reading"],
    },
    {
      id: "task_backup",
      title: "Backup project files",
      status: "TODO" as const,
      priority: "URGENT" as const,
      dueDate: at(0, "20:00"),
      estimatedMins: 20,
      projectId: "proj_website",
      tags: ["tag_work", "tag_urgent"],
    },
    {
      id: "task_case_study",
      title: "Write case study draft for homepage",
      status: "IN_PROGRESS" as const,
      priority: "HIGH" as const,
      dueDate: at(2, "17:00"),
      estimatedMins: 120,
      projectId: "proj_website",
      tags: ["tag_work"],
    },
    {
      id: "task_desk_lamp",
      title: "Order desk lamp and cable tray",
      status: "TODO" as const,
      priority: "MEDIUM" as const,
      dueDate: at(1, "15:00"),
      estimatedMins: 15,
      projectId: "proj_office",
      tags: ["tag_personal"],
    },
    {
      id: "task_savings_transfer",
      title: "Set up automatic savings transfer",
      status: "TODO" as const,
      priority: "HIGH" as const,
      dueDate: at(4, "10:00"),
      estimatedMins: 30,
      projectId: "proj_savings",
      tags: ["tag_personal"],
    },
    {
      id: "task_old_notes",
      title: "Archive old meeting notes",
      status: "CANCELLED" as const,
      priority: "LOW" as const,
      dueDate: at(-3, "17:00"),
      projectId: "proj_website",
      tags: ["tag_work"],
    },
  ];
  for (const t of tasks) {
    const { tags: taskTags, id, projectId: pid, ...data } = t;
    const projectLink = pid ? { project: { connect: { id: pid } } } : {};
    await prisma.task.upsert({
      where: { id },
      update: { ...data, ...projectLink },
      create: { id, ...data, ...projectLink },
    });
    await prisma.taskTag.deleteMany({ where: { taskId: id } });
    await prisma.taskTag.createMany({
      data: taskTags.map((tagId) => ({ taskId: id, tagId })),
      skipDuplicates: true,
    });
  }

  // ---------------------------------------------------------------- events
  const events = [
    {
      id: "evt_family_lunch",
      title: "Family lunch",
      startAt: at(0, "13:00"),
      endAt: at(0, "14:30"),
      eventType: "PERSONAL",
      location: "Dhanmondi",
    },
    {
      id: "evt_website_deadline",
      title: "Project deadline: Website redesign",
      startAt: at(17, "00:00"),
      endAt: at(17, "23:59"),
      allDay: true,
      eventType: "DEADLINE",
      projectId: "proj_website",
    },
    {
      id: "evt_standup",
      title: "Weekly planning",
      startAt: at(1, "10:00"),
      endAt: at(1, "10:45"),
      eventType: "MEETING",
      location: "Google Meet",
      projectId: "proj_website",
    },
    {
      id: "evt_dentist",
      title: "Dentist appointment",
      startAt: at(5, "17:30"),
      endAt: at(5, "18:15"),
      eventType: "PERSONAL",
      location: "City Dental",
    },
    {
      id: "evt_weekly_sync",
      title: "Weekly team sync",
      startAt: at(1, "09:00"),
      endAt: at(1, "10:00"),
      allDay: false,
      eventType: "MEETING",
      location: "Google Meet",
      projectId: "proj_website",
    },
  ];
  for (const e of events) {
    const { projectId: ePid, ...eRest } = e;
    const link = ePid ? { project: { connect: { id: ePid } } } : {};
    await prisma.calendarEvent.upsert({ where: { id: e.id }, update: { ...eRest, ...link }, create: { ...eRest, ...link } });
  }

  await prisma.recurrenceRule.upsert({
    where: { eventId: "evt_weekly_sync" },
    update: {},
    create: {
      id: "rec_weekly_sync",
      frequency: "WEEKLY",
      interval: 1,
      weekdays: [1],
      until: at(60, "23:59"),
      maxOccurrences: 8,
      eventId: "evt_weekly_sync",
    },
  });

  // ------------------------------------------------------------- reminders
  const reminders = [
    {
      id: "rem_electricity",
      message: "Pay electricity bill",
      scheduledAt: at(0, "19:30"),
      status: "PENDING" as const,
    },
    {
      id: "rem_isp",
      message: "Check ISP bill payment confirmation",
      scheduledAt: at(0, "18:00"),
      status: "PENDING" as const,
      taskId: "task_isp_bill",
    },
    {
      id: "rem_weekly_sync",
      message: "Prepare weekly sync agenda",
      scheduledAt: at(1, "08:30"),
      status: "PENDING" as const,
      eventId: "evt_weekly_sync",
    },
  ];
  for (const r of reminders) {
    const { taskId: rTid, eventId: rEid, ...rRest } = r;
    const links: Record<string, any> = {};
    if (rTid) links.task = { connect: { id: rTid } };
    if (rEid) links.event = { connect: { id: rEid } };
    await prisma.reminder.upsert({ where: { id: r.id }, update: { ...rRest, ...links }, create: { ...rRest, ...links } });
  }

  // --------------------------------------------------------------- finance
  const month = monthMarker();
  const budgets = [
    { id: "budget_month", month, categoryId: null, amount: "25000.00" },
    { id: "budget_groceries", month, categoryId: "cat_groceries", amount: "9000.00" },
    { id: "budget_utilities", month, categoryId: "cat_utilities", amount: "4500.00" },
    { id: "budget_transport", month, categoryId: "cat_transport", amount: "3000.00" },
    { id: "budget_dining", month, categoryId: "cat_dining", amount: "3500.00" },
  ];
  for (const b of budgets) {
    const { categoryId: bCid, ...bRest } = b;
    const catLink = bCid ? { category: { connect: { id: bCid } } } : {};
    await prisma.budget.upsert({ where: { id: b.id }, update: { ...bRest, ...catLink }, create: { ...bRest, ...catLink } });
  }

  const expenses = [
    { id: "exp_rent", amount: "12000.00", expenseDate: at(-6, "10:00"), description: "Monthly house rent", categoryId: "cat_rent", paymentMethod: "BANK_TRANSFER" as const, vendor: "Landlord" },
    { id: "exp_groceries_1", amount: "2450.00", expenseDate: at(-5, "18:20"), description: "Weekly groceries", categoryId: "cat_groceries", paymentMethod: "CASH" as const, vendor: "Shwapno" },
    { id: "exp_electricity", amount: "1820.00", expenseDate: at(-4, "11:15"), description: "Electricity bill", categoryId: "cat_utilities", paymentMethod: "MOBILE_WALLET" as const, vendor: "DESCO" },
    { id: "exp_internet", amount: "1200.00", expenseDate: at(-3, "09:30"), description: "Home internet", categoryId: "cat_utilities", paymentMethod: "CARD" as const, vendor: "Link3" },
    { id: "exp_commute", amount: "320.00", expenseDate: at(-2, "08:45"), description: "Rickshaw and bus fares", categoryId: "cat_transport", paymentMethod: "CASH" as const },
    { id: "exp_dinner", amount: "980.00", expenseDate: at(-1, "20:10"), description: "Dinner with friends", categoryId: "cat_dining", paymentMethod: "CARD" as const, vendor: "Pizza Hut" },
    { id: "exp_groceries_2", amount: "1680.00", expenseDate: at(0, "10:05"), description: "Fruit and vegetables", categoryId: "cat_groceries", paymentMethod: "CASH" as const, vendor: "Karwan Bazar" },
  ];
  for (const e of expenses) {
    const { categoryId: eCid, ...eRest } = e;
    const catLink = eCid ? { category: { connect: { id: eCid } } } : {};
    await prisma.expense.upsert({ where: { id: e.id }, update: { ...eRest, ...catLink }, create: { ...eRest, ...catLink } });
  }

  const incomes = [
    { id: "inc_salary", amount: "45000.00", incomeDate: at(-7, "10:00"), source: "Salary", note: "October salary" },
    { id: "inc_freelance", amount: "8000.00", incomeDate: at(-2, "16:00"), source: "Freelance", note: "Landing page project" },
  ];
  for (const i of incomes) {
    await prisma.incomeRecord.upsert({ where: { id: i.id }, update: i, create: i });
  }

  await prisma.recurringExpense.upsert({
    where: { id: "rec_electricity" },
    update: {},
    create: {
      id: "rec_electricity",
      name: "Electricity bill",
      amount: "1800.00",
      frequency: "MONTHLY",
      category: { connect: { id: "cat_utilities" } },
      startDate: at(-90),
      nextExpectedAt: at(26, "10:00"),
      active: true,
    },
  });

  // ----------------------------------------------------------------- pages
  const pages = [
    {
      id: "page_meeting_notes",
      title: "Meeting notes — website review",
      icon: "📝",
      favorite: true,
      content: {
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Decisions" }] },
          { type: "paragraph", content: [{ type: "text", text: "Ship the new case-study layout first; defer the blog migration." }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Contrast pass on dark surfaces" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Mobile navigation QA" }] }] },
          ] },
        ],
      },
      projectId: "proj_website",
    },
    {
      id: "page_savings_plan",
      title: "Emergency fund plan",
      icon: "💰",
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Target: six months of essential expenses (≈ ৳ 90,000)." }] },
          { type: "paragraph", content: [{ type: "text", text: "Automate a ৳ 5,000 transfer on the 2nd of each month." }] },
        ],
      },
      projectId: "proj_savings",
    },
    {
      id: "page_reading_list",
      title: "Reading list",
      icon: "📚",
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Deep Work — Cal Newport (in progress)" }] },
          { type: "paragraph", content: [{ type: "text", text: "The Design of Everyday Things — Don Norman" }] },
        ],
      },
    },
  ];
  for (const p of pages) {
    const { projectId: pPid, ...pRest } = p;
    const link = pPid ? { project: { connect: { id: pPid } } } : {};
    await prisma.page.upsert({ where: { id: p.id }, update: { ...pRest, ...link }, create: { ...pRest, ...link } });
  }

  // --------------------------------------------------------------- activity
  await prisma.activityLog.deleteMany({ where: { entityId: { startsWith: "seed_" } } });
  await prisma.activityLog.createMany({
    data: [
      { id: "seed_act_1", userId: "demo_user_001", entityType: "PAGE", entityId: "seed_page", action: "UPDATED", detail: { title: "Meeting notes — website review" }, createdAt: at(0, "08:15") },
      { id: "seed_act_2", userId: "demo_user_001", entityType: "EXPENSE", entityId: "seed_exp", action: "CREATED", detail: { amount: "320.00", category: "Groceries" }, createdAt: at(0, "07:30") },
      { id: "seed_act_3", userId: "demo_user_001", entityType: "TASK", entityId: "seed_task", action: "COMPLETED", detail: { title: "Pay mobile bill" }, createdAt: at(-1, "18:00") },
    ],
    skipDuplicates: true,
  });

  const counts = await Promise.all([
    prisma.task.count(),
    prisma.expense.count(),
    prisma.page.count(),
    prisma.calendarEvent.count(),
  ]);
  console.log(`Seed complete — ${counts[0]} tasks, ${counts[1]} expenses, ${counts[2]} pages, ${counts[3]} events.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
