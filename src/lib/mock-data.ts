// ⚠️ PHASE 1 UI PROTOTYPE ONLY — explicitly NOT production data.
// Phase 2+ replaces every consumer of this file with real Prisma-backed data
// (PROJECT_SPEC §21 Phase 6: "Remove ... temporary mock data").
// Nothing here writes anywhere; it exists solely to preview the glass UI.

import type { TaskStatus } from "@/types";

export const MOCK = {
  tasksToday: [
    { id: "m1", title: "Review monthly spending summary", status: "IN_PROGRESS" as TaskStatus, priority: "HIGH", due: "11:00" },
    { id: "m2", title: "Confirm ISP bill payment", status: "TODO" as TaskStatus, priority: "MEDIUM", due: "18:00" },
    { id: "m3", title: "30 min reading session", status: "DONE" as TaskStatus, priority: "LOW", due: null },
    { id: "m4", title: "Backup project files", status: "TODO" as TaskStatus, priority: "URGENT", due: "20:00" },
  ],
  eventsToday: [
    { id: "e1", title: "Family lunch", time: "1:00 pm" },
    { id: "e2", title: "Project deadline: Website redesign", time: "All day" },
  ],
  nextReminder: { at: "Oct 27, 7:30 pm", message: "Pay electricity bill" },
  finance: { monthTotal: 18450, budget: 25000, remaining: 6550, pct: 74 },
  projects: [
    { id: "p1", name: "Website redesign", progress: 62, deadline: "Nov 15" },
    { id: "p2", name: "Personal savings plan", progress: 34, deadline: "Dec 1" },
    { id: "p3", name: "Home office setup", progress: 88, deadline: "Oct 30" },
  ],
  activity: [
    { id: "a1", kind: "note", text: "Edited “Meeting notes — Oct 26”", when: "2 h ago" },
    { id: "a2", kind: "expense", text: "Added expense ৳ 320 · Groceries", when: "5 h ago" },
    { id: "a3", kind: "task", text: "Completed “Pay mobile bill”", when: "Yesterday" },
    { id: "a4", kind: "file", text: "Uploaded “receipt-oct.pdf”", when: "Yesterday" },
  ],
};
