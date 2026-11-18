"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/toast/toaster";
import { cn } from "@/lib/utils";
import { Plus, FileText, Star, Trash2, Search, ArrowUpRight } from "lucide-react";

type Note = {
  id: string;
  title: string;
  content?: any;
  icon?: string | null;
  favorite: boolean;
  updatedAt: string;
};

function plainText(content: any): string {
  let text = "";
  if (typeof content === "string") text = content;
  else if (content && typeof content.html === "string") text = content.html;
  else if (content && typeof content.text === "string") text = content.text;
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function updatedLabel(iso: string) {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const d = await api.notes.list();
      setNotes(
        ((d.notes ?? []) as Note[]).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
      );
    } catch (err: any) {
      toast({ title: "Could not load notes", description: err?.message ?? "Check that the backend is running." });
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      if (favoritesOnly && !n.favorite) return false;
      if (!q) return true;
      return `${n.title} ${plainText(n.content)}`.toLowerCase().includes(q);
    });
  }, [notes, query, favoritesOnly]);

  async function createNote() {
    setCreating(true);
    try {
      const d = await api.pages.create({ title: "Untitled", content: { html: "" } });
      const id = d.page?.id;
      if (id) router.push(`/workspace?page=${id}`);
    } catch (err: any) {
      toast({ title: "Could not create note", description: err?.message ?? "Please try again." });
    } finally {
      setCreating(false);
    }
  }

  async function toggleFavorite(note: Note) {
    setNotes((list) => list.map((n) => (n.id === note.id ? { ...n, favorite: !n.favorite } : n)));
    try {
      await api.notes.update(note.id, { favorite: !note.favorite });
    } catch (err: any) {
      setNotes((list) => list.map((n) => (n.id === note.id ? { ...n, favorite: note.favorite } : n)));
      toast({ title: "Could not update note", description: err?.message ?? "Please try again." });
    }
  }

  async function archive(note: Note) {
    if (!confirm(`Archive "${note.title || "Untitled"}"?`)) return;
    try {
      await api.notes.remove(note.id);
      setNotes((list) => list.filter((n) => n.id !== note.id));
    } catch (err: any) {
      toast({ title: "Could not archive note", description: err?.message ?? "Please try again." });
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Notes</h1>
          <p className="text-xs text-ink-3 mt-1">
            {notes.length} note{notes.length === 1 ? "" : "s"} · same pages as Workspace.
          </p>
        </div>
        <button onClick={createNote} disabled={creating} className="btn-primary text-sm inline-flex items-center gap-2">
          <Plus size={16} /> {creating ? "Creating…" : "New note"}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="w-full rounded-lg border border-line bg-transparent pl-9 pr-3 py-2 text-sm text-ink"
          />
        </div>
        <button
          onClick={() => setFavoritesOnly((v) => !v)}
          className={cn(
            "text-xs px-3 py-2 rounded-lg border inline-flex items-center gap-1.5 whitespace-nowrap",
            favoritesOnly ? "border-accent/50 text-accent bg-accent/10" : "border-line text-ink-2 hover:bg-glass-hover",
          )}
        >
          <Star size={13} className={favoritesOnly ? "fill-accent" : ""} /> Favorites
        </button>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-6 text-sm text-ink-3">Loading notes…</div>
      ) : visible.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <FileText className="mx-auto text-ink-3" size={26} />
          <div className="text-sm text-ink-2 font-medium mt-2">
            {notes.length === 0 ? "No notes yet" : "Nothing matches"}
          </div>
          <div className="text-xs text-ink-3 mt-1">
            {notes.length === 0 ? "Create your first note to get started." : "Try a different search or filter."}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((n) => {
            const body = plainText(n.content);
            return (
              <div
                key={n.id}
                className="glass rounded-2xl border border-white/10 p-4 group flex flex-col hover:border-accent/40 transition-colors cursor-pointer"
                onClick={() => router.push(`/workspace?page=${n.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base leading-none">{n.icon || "📄"}</span>
                    <h2 className="text-sm font-semibold text-ink truncate">{n.title || "Untitled"}</h2>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(n); }}
                      className="size-6 grid place-items-center rounded-md"
                      title={n.favorite ? "Remove favorite" : "Favorite"}
                    >
                      <Star size={13} className={n.favorite ? "text-amber-400 fill-amber-400" : "text-ink-3 hover:text-ink"} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); archive(n); }}
                      className="size-6 grid place-items-center rounded-md text-ink-3 hover:text-red-400"
                      title="Archive"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className={cn("mt-2 text-[11px] leading-relaxed flex-1 line-clamp-4", body ? "text-ink-3" : "text-ink-3 italic")}>
                  {body || "Empty page"}
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px] text-ink-3">
                  <span>Edited {updatedLabel(n.updatedAt)}</span>
                  <span className="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 text-accent transition-opacity">
                    Open <ArrowUpRight size={11} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
