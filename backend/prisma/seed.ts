import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@mylifeos.com" },
    update: {},
    create: {
      email: "demo@mylifeos.com",
      username: "demo",
      passwordHash,
      theme: "light",
      timezone: "Asia/Dhaka",
      currency: "BDT",
      emailVerified: true,
    },
    include: { settings: true },
  });

  // Default expense categories
  const categories = ["Food", "Transport", "Shopping", "Bills", "Health", "Entertainment"];
  for (const name of categories) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name, color: "#6366f1", icon: "💸", order: categories.indexOf(name), userId: user.id },
    });
  }

  // Sample tags
  const tags = ["#uidesign", "#mobileapp", "#website", "#portfolio", "#posterdesign", "#socialmedia"];
  for (const name of tags) {
    await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name, color: "#a855f7", userId: user.id },
    });
  }

  // Sample project
  const project = await prisma.project.upsert({
    where: { id: "proj_demo_001" },
    update: {},
    create: {
      id: "proj_demo_001",
      name: "Ciro Mobile App",
      description: "Mobile banking app redesign",
      status: "ACTIVE",
      priority: "HIGH",
      accentColor: "#3b82f6",
      icon: "📱",
      userId: user.id,
    },
  });

  // Sample tasks
  await prisma.task.upsert({
    where: { id: "task_demo_001" },
    update: {},
    create: {
      id: "task_demo_001",
      title: "Create Lo-Fidelity Wireframe",
      description: "Low-fidelity wireframes for mobile banking app",
      status: "TODO",
      priority: "HIGH",
      dueDate: new Date(Date.now() + 86400000),
      userId: user.id,
      projectId: project.id,
    },
  });

  await prisma.task.upsert({
    where: { id: "task_demo_002" },
    update: {},
    create: {
      id: "task_demo_002",
      title: "Hi-Fidelity Landing Page UI",
      description: "Final UI design for landing page",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      dueDate: new Date(Date.now() + 172800000),
      userId: user.id,
      projectId: project.id,
    },
  });

  await prisma.task.upsert({
    where: { id: "task_demo_003" },
    update: {},
    create: {
      id: "task_demo_003",
      title: "Component UI Library",
      description: "Reusable UI components for design system",
      status: "DONE",
      priority: "LOW",
      completedAt: new Date(),
      userId: user.id,
      projectId: project.id,
    },
  });

  console.log("Seed complete:");
  console.log("  Email: demo@mylifeos.com");
  console.log("  Password: demo1234");
  console.log("  User ID:", user.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
