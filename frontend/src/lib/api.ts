// The browser always calls the API same-origin at /api/* — the root vercel.json
// routes that prefix to the backend service. Server-side code can additionally
// use the BACKEND_URL service binding declared on the frontend service.
// Bindings are injected at runtime in functions only, never into the browser.
const isServer = typeof window === "undefined";
const boundBackendUrl = isServer
  ? (process.env.BACKEND_URL ?? "").replace(/\/+$/, "")
  : "";
const API_URL =
  boundBackendUrl ||
  (process.env.NODE_ENV === "production"
    ? ""
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100");

// A single stalled endpoint must never keep the whole UI in a loading state.
// Vercel kills an invocation at 60s, so fail clearly before that.
const REQUEST_TIMEOUT_MS = 15_000;

async function request(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers as Record<string, string>) };
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;

  const res = await fetch(`${API_URL}${path}`, { ...opts, headers, credentials: "include", signal });
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      const p = window.location.pathname;
      if (p !== "/login" && p !== "/register") window.location.href = "/login";
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body: any) => request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path: string, body: any) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: "DELETE" } as RequestInit),

  // Resources
  tasks: {
    list: (params?: any) => api.get("/api/tasks" + (params ? `?${new URLSearchParams(params)}` : "")),
    get: (id: string) => api.get(`/api/tasks/${id}`),
    create: (body: any) => api.post("/api/tasks", body),
    update: (id: string, body: any) => api.patch(`/api/tasks/${id}`, body),
    remove: (id: string) => api.delete(`/api/tasks/${id}`),
    comments: {
      list: (taskId: string) => api.get(`/api/tasks/${taskId}/comments`),
      create: (taskId: string, body: { body: string }) => api.post(`/api/tasks/${taskId}/comments`, body),
      remove: (taskId: string, commentId: string) => api.delete(`/api/tasks/${taskId}/comments/${commentId}`),
    },
  },
  projects: {
    list: () => api.get("/api/projects"),
    get: (id: string) => api.get(`/api/projects/${id}`),
    create: (body: any) => api.post("/api/projects", body),
    update: (id: string, body: any) => api.patch(`/api/projects/${id}`, body),
    remove: (id: string) => api.delete(`/api/projects/${id}`),
  },
  notes: {
    list: () => api.get("/api/notes"),
    get: (id: string) => api.get(`/api/notes/${id}`),
    create: (body: any) => api.post("/api/notes", body),
    update: (id: string, body: any) => api.patch(`/api/notes/${id}`, body),
    remove: (id: string) => api.delete(`/api/notes/${id}`),
  },
  goals: {
    list: (params?: any) => api.get("/api/goals" + (params ? `?${new URLSearchParams(params)}` : "")),
    create: (body: any) => api.post("/api/goals", body),
    update: (id: string, body: any) => api.patch(`/api/goals/${id}`, body),
    remove: (id: string) => api.delete(`/api/goals/${id}`),
  },
  search: (q: string) => api.get(`/api/search?q=${encodeURIComponent(q)}`),
  ai: {
    status: () => api.get("/api/ai/status"),
    ask: (question: string, topK?: number) => api.post("/api/ai/ask", { question, topK }),
    reindex: (opts?: { limit?: number; offset?: number }) => api.post("/api/ai/reindex", opts ?? {}),
  },
  analytics: {
    summary: () => api.get("/api/analytics/summary"),
  },
  snippets: {
    list: (q?: string) => api.get("/api/snippets" + (q ? `?q=${encodeURIComponent(q)}` : "")),
    create: (body: any) => api.post("/api/snippets", body),
    update: (id: string, body: any) => api.patch(`/api/snippets/${id}`, body),
    remove: (id: string) => api.delete(`/api/snippets/${id}`),
  },
  bookmarks: {
    list: (q?: string) => api.get("/api/bookmarks" + (q ? `?q=${encodeURIComponent(q)}` : "")),
    create: (body: any) => api.post("/api/bookmarks", body),
    update: (id: string, body: any) => api.patch(`/api/bookmarks/${id}`, body),
    remove: (id: string) => api.delete(`/api/bookmarks/${id}`),
  },
  meetings: {
    list: (scope?: "upcoming" | "past" | "all") => api.get("/api/meetings" + (scope ? `?scope=${scope}` : "")),
    create: (body: any) => api.post("/api/meetings", body),
    update: (id: string, body: any) => api.patch(`/api/meetings/${id}`, body),
    remove: (id: string) => api.delete(`/api/meetings/${id}`),
    actionItems: {
      create: (meetingId: string, body: any) => api.post(`/api/meetings/${meetingId}/action-items`, body),
      update: (meetingId: string, itemId: string, body: any) =>
        api.patch(`/api/meetings/${meetingId}/action-items/${itemId}`, body),
      remove: (meetingId: string, itemId: string) =>
        api.delete(`/api/meetings/${meetingId}/action-items/${itemId}`),
    },
  },
  pages: {
    list: () => api.get("/api/pages"),
    get: (id: string) => api.get(`/api/pages/${id}`),
    create: (body: any) => api.post("/api/pages", body),
    update: (id: string, body: any) => api.patch(`/api/pages/${id}`, body),
    remove: (id: string) => api.delete(`/api/pages/${id}`),
  },
  calendar: {
    list: (params?: any) => api.get("/api/calendar" + (params ? `?${new URLSearchParams(params)}` : "")),
    get: (id: string) => api.get(`/api/calendar/${id}`),
    create: (body: any) => api.post("/api/calendar", body),
    update: (id: string, body: any) => api.patch(`/api/calendar/${id}`, body),
    remove: (id: string) => api.delete(`/api/calendar/${id}`),
  },
  reminders: {
    list: (params?: any) => api.get("/api/reminders" + (params ? `?${new URLSearchParams(params)}` : "")),
    create: (body: any) => api.post("/api/reminders", body),
    update: (id: string, body: any) => api.patch(`/api/reminders/${id}`, body),
    remove: (id: string) => api.delete(`/api/reminders/${id}`),
  },
  routines: {
    list: (params?: any) => api.get("/api/routines" + (params ? `?${new URLSearchParams(params)}` : "")),
    get: (id: string) => api.get(`/api/routines/${id}`),
    create: (body: any) => api.post("/api/routines", body),
    update: (id: string, body: any) => api.patch(`/api/routines/${id}`, body),
    remove: (id: string) => api.delete(`/api/routines/${id}`),
  },
  habits: {
    list: () => api.get("/api/habits"),
    create: (body: any) => api.post("/api/habits", body),
    checkin: (id: string) => api.post(`/api/habits/${id}/checkin`, {}),
    uncheckin: (id: string) => api.delete(`/api/habits/${id}/checkin`),
    remove: (id: string) => api.delete(`/api/habits/${id}`),
  },
  timeEntries: {
    list: (params?: any) => api.get("/api/time-entries" + (params ? `?${new URLSearchParams(params)}` : "")),
    get: (id: string) => api.get(`/api/time-entries/${id}`),
    create: (body: any) => api.post("/api/time-entries", body),
    update: (id: string, body: any) => api.patch(`/api/time-entries/${id}`, body),
    remove: (id: string) => api.delete(`/api/time-entries/${id}`),
    summary: (params?: any) => api.get("/api/time-entries/summary/daily" + (params ? `?${new URLSearchParams(params)}` : "")),
  },
  expenses: {
    list: (params?: any) => api.get("/api/expenses" + (params ? `?${new URLSearchParams(params)}` : "")),
    create: (body: any) => api.post("/api/expenses", body),
    update: (id: string, body: any) => api.patch(`/api/expenses/${id}`, body),
    remove: (id: string) => api.delete(`/api/expenses/${id}`),
    categories: () => api.get("/api/expenses/categories"),
    createCategory: (body: any) => api.post("/api/expenses/categories", body),
    recurring: {
      list: () => api.get("/api/expenses/recurring"),
      create: (body: any) => api.post("/api/expenses/recurring", body),
      update: (id: string, body: any) => api.patch(`/api/expenses/recurring/${id}`, body),
      remove: (id: string) => api.delete(`/api/expenses/recurring/${id}`),
      log: (id: string) => api.post(`/api/expenses/recurring/${id}/log`, {}),
    },
  },
  income: {
    list: (params?: any) => api.get("/api/income" + (params ? `?${new URLSearchParams(params)}` : "")),
    create: (body: any) => api.post("/api/income", body),
    update: (id: string, body: any) => api.patch(`/api/income/${id}`, body),
    remove: (id: string) => api.delete(`/api/income/${id}`),
  },
  budgets: {
    list: () => api.get("/api/budgets"),
    upsert: (body: any) => api.post("/api/budgets", body),
    remove: (id: string) => api.delete(`/api/budgets/${id}`),
  },
  reports: {
    dashboard: (params?: any) => api.get("/api/reports/dashboard" + (params ? `?${new URLSearchParams(params)}` : "")),
    activity: (params?: any) => api.get("/api/reports/activity" + (params ? `?${new URLSearchParams(params)}` : "")),
  },
  settings: {
    get: () => api.get("/api/settings"),
    patch: (body: any) => api.patch("/api/settings", body),
    exportUrl: () => `${API_URL}/api/settings/export`,
  },
  notifications: {
    list: (params?: any) => api.get("/api/notifications" + (params ? `?${new URLSearchParams(params)}` : "")),
    markRead: (id: string) => api.patch(`/api/notifications/${id}/read`, {}),
    markReadAll: () => api.patch("/api/notifications/read-all", {}),
    remove: (id: string) => api.delete(`/api/notifications/${id}`),
  },
  files: {
    list: () => api.get("/api/files"),
    remove: (id: string) => api.delete(`/api/files/${id}`),
    rename: (id: string, filename: string) => api.patch(`/api/files/${id}`, { filename }),
    download: (id: string) => `${API_URL}/api/files/${id}/download`,
    preview: (id: string) => `${API_URL}/api/files/${id}/preview`,
  },
};

export { API_URL };
