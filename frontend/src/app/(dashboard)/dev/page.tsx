"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/toast/toaster";
import { confirmDialog } from "@/components/dialog/confirm";
import {
  Code2,
  Plus,
  Search,
  Star,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Bookmark as BookmarkIcon,
  X,
  Pencil,
} from "lucide-react";

type Snippet = {
  id: string;
  title: string;
  description?: string | null;
  language: string;
  code: string;
  tags: string[];
  favorite: boolean;
  updatedAt: string;
};

type Bookmark = {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  category: string;
  tags: string[];
  favorite: boolean;
  updatedAt: string;
};

const LANGUAGES = ["text", "typescript", "javascript", "tsx", "python", "sql", "bash", "json", "css", "html", "other"];
const CATEGORIES = ["GENERAL", "DOCS", "TOOLS", "LEARNING", "DESIGN", "INSPIRATION"];

export default function DevWorkspacePage() {
  const [tab, setTab] = useState<"snippets" | "bookmarks">("snippets");
  const [query, setQuery] = useState("");
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [onlyFav, setOnlyFav] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<string | null>(null);
  const [editingBookmark, setEditingBookmark] = useState<string | null>(null);

  const [snippetForm, setSnippetForm] = useState<{ open: boolean; title: string; language: string; code: string; tags: string; description: string }>({
    open: false,
    title: "",
    language: "typescript",
    code: "",
    tags: "",
    description: "",
  });

  const [bookmarkForm, setBookmarkForm] = useState<{ open: boolean; title: string; url: string; category: string; tags: string; description: string }>({
    open: false,
    title: "",
    url: "",
    category: "GENERAL",
    tags: "",
    description: "",
  });

  async function load(q = query) {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([api.snippets.list(q), api.bookmarks.list(q)]);
      setSnippets((s.snippets ?? []) as Snippet[]);
      setBookmarks((b.bookmarks ?? []) as Bookmark[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(""); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), 250);
    return () => clearTimeout(t);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [query]);

  const tagCount = useMemo(() => {
    const set = new Set<string>();
    for (const s of snippets) s.tags.forEach((t) => set.add(t));
    for (const b of bookmarks) b.tags.forEach((t) => set.add(t));
    return set.size;
  }, [snippets, bookmarks]);

  const visibleSnippets = onlyFav ? snippets.filter((s) => s.favorite) : snippets;
  const visibleBookmarks = onlyFav ? bookmarks.filter((b) => b.favorite) : bookmarks;

  function parseTags(s: string) {
    return s.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8);
  }

  async function saveSnippet(e: React.FormEvent) {
    e.preventDefault();
    if (!snippetForm.title.trim() || !snippetForm.code.trim()) return;
    const body = {
      title: snippetForm.title.trim(),
      language: snippetForm.language,
      code: snippetForm.code,
      description: snippetForm.description.trim() || null,
      tags: parseTags(snippetForm.tags),
    };
    try {
      if (editingSnippet) await api.snippets.update(editingSnippet, body);
      else await api.snippets.create(body);
      setSnippetForm({ open: false, title: "", language: "typescript", code: "", tags: "", description: "" });
      setEditingSnippet(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save snippet");
    }
  }

  async function saveBookmark(e: React.FormEvent) {
    e.preventDefault();
    if (!bookmarkForm.title.trim() || !bookmarkForm.url.trim()) return;
    let url = bookmarkForm.url.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    const body = {
      title: bookmarkForm.title.trim(),
      url,
      category: bookmarkForm.category,
      description: bookmarkForm.description.trim() || null,
      tags: parseTags(bookmarkForm.tags),
    };
    try {
      if (editingBookmark) await api.bookmarks.update(editingBookmark, body);
      else await api.bookmarks.create(body);
      setBookmarkForm({ open: false, title: "", url: "", category: "GENERAL", tags: "", description: "" });
      setEditingBookmark(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save bookmark");
    }
  }

  function openSnippetEdit(s: Snippet) {
    setEditingSnippet(s.id);
    setSnippetForm({
      open: true,
      title: s.title,
      language: s.language,
      code: s.code,
      tags: s.tags.join(", "),
      description: s.description ?? "",
    });
  }

  function openBookmarkEdit(b: Bookmark) {
    setEditingBookmark(b.id);
    setBookmarkForm({
      open: true,
      title: b.title,
      url: b.url,
      category: b.category,
      tags: b.tags.join(", "),
      description: b.description ?? "",
    });
  }

  async function toggleFavorite(kind: "snippet" | "bookmark", id: string, favorite: boolean) {
    try {
      if (kind === "snippet") await api.snippets.update(id, { favorite: !favorite });
      else await api.bookmarks.update(id, { favorite: !favorite });
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update");
    }
  }

  async function remove(kind: "snippet" | "bookmark", id: string) {
    if (!(await confirmDialog(`Delete this ${kind}?`))) return;
    try {
      if (kind === "snippet") await api.snippets.remove(id);
      else await api.bookmarks.remove(id);
      load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  }

  async function copy(snippet: Snippet) {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(snippet.id);
      setTimeout(() => setCopied((c) => (c === snippet.id ? null : c)), 1500);
    } catch {
      toast.error("Clipboard unavailable");
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dev Workspace</h1>
          <p className="text-xs text-ink-3 mt-1">Snippets and bookmarks for things you will need again.</p>
        </div>
        <button
          onClick={() => {
            if (tab === "snippets") {
              setEditingSnippet(null);
              setSnippetForm({ open: true, title: "", language: "typescript", code: "", tags: "", description: "" });
            } else {
              setEditingBookmark(null);
              setBookmarkForm({ open: true, title: "", url: "", category: "GENERAL", tags: "", description: "" });
            }
          }}
          className="btn-primary text-sm inline-flex items-center gap-2"
        >
          <Plus size={16} /> New {tab === "snippets" ? "snippet" : "bookmark"}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="flex gap-1 rounded-xl border border-line p-1 bg-glass w-fit">
          <button
            onClick={() => setTab("snippets")}
            className={`px-3 py-1.5 text-xs rounded-lg inline-flex items-center gap-1.5 ${tab === "snippets" ? "bg-accent text-white" : "text-ink-2 hover:bg-glass-hover"}`}
          >
            <Code2 size={13} /> Snippets ({snippets.length})
          </button>
          <button
            onClick={() => setTab("bookmarks")}
            className={`px-3 py-1.5 text-xs rounded-lg inline-flex items-center gap-1.5 ${tab === "bookmarks" ? "bg-accent text-white" : "text-ink-2 hover:bg-glass-hover"}`}
          >
            <BookmarkIcon size={13} /> Bookmarks ({bookmarks.length})
          </button>
        </div>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${tab}…`}
            className="w-full rounded-lg border border-line bg-transparent pl-9 pr-3 py-2 text-sm text-ink"
          />
        </div>
        <span className="text-[11px] text-ink-3 whitespace-nowrap">{tagCount} tags</span>
        <button
          onClick={() => setOnlyFav((v) => !v)}
          className={`text-[11px] px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-1 whitespace-nowrap ${
            onlyFav ? "border-yellow-400/50 text-yellow-300 bg-yellow-400/10" : "border-line text-ink-3 hover:text-ink"
          }`}
          title="Show favorites only"
        >
          <Star size={12} className={onlyFav ? "fill-yellow-400 text-yellow-400" : ""} /> Favorites
        </button>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-6 text-sm text-ink-3">Loading…</div>
      ) : tab === "snippets" ? (
        visibleSnippets.length === 0 ? (
          <Empty label={onlyFav ? "No favorite snippets" : "No snippets yet"} hint={onlyFav ? "Star a snippet to pin it here." : "Save reusable code you keep rewriting."} />
        ) : (
          <div className="grid gap-3">
            {visibleSnippets.map((s) => (
              <div key={s.id} className="glass rounded-2xl border border-white/10 overflow-hidden">
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-ink truncate">{s.title}</h2>
                      <span className="text-[10px] uppercase tracking-wider rounded-full border border-line px-2 py-0.5 text-ink-3">{s.language}</span>
                    </div>
                    {s.description && <p className="text-[11px] text-ink-3 mt-0.5">{s.description}</p>}
                    {s.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.tags.map((t) => <span key={t} className="text-[10px] text-accent bg-accent/10 rounded px-1.5 py-0.5">#{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => copy(s)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" title="Copy code">
                      {copied === s.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    <button onClick={() => toggleFavorite("snippet", s.id, s.favorite)} className="size-7 grid place-items-center rounded-lg" title="Favorite">
                      <Star size={14} className={s.favorite ? "text-yellow-400 fill-yellow-400" : "text-ink-3 hover:text-ink"} />
                    </button>
                    <button onClick={() => openSnippetEdit(s)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" title="Edit snippet">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => remove("snippet", s.id)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-red-400" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <pre className="border-t border-white/10 bg-black/40 px-4 py-3 text-[11px] leading-relaxed text-ink-2 overflow-x-auto max-h-56">
                  <code>{s.code}</code>
                </pre>
              </div>
            ))}
          </div>
        )
      ) : visibleBookmarks.length === 0 ? (
        <Empty label={onlyFav ? "No favorite bookmarks" : "No bookmarks yet"} hint={onlyFav ? "Star a bookmark to pin it here." : "Keep docs, tools and references one click away."} />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {visibleBookmarks.map((b) => (
            <div key={b.id} className="glass rounded-2xl border border-white/10 p-4 flex flex-col gap-1.5">
              <div className="flex items-start justify-between gap-2">
                <a href={b.url} target="_blank" rel="noreferrer" className="min-w-0 group">
                  <div className="text-sm font-semibold text-ink truncate group-hover:text-accent inline-flex items-center gap-1">
                    {b.title} <ExternalLink size={11} className="shrink-0 opacity-60" />
                  </div>
                  <div className="text-[11px] text-ink-3 truncate">{b.url.replace(/^https?:\/\//, "")}</div>
                </a>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleFavorite("bookmark", b.id, b.favorite)} className="size-7 grid place-items-center rounded-lg" title="Favorite">
                    <Star size={14} className={b.favorite ? "text-yellow-400 fill-yellow-400" : "text-ink-3 hover:text-ink"} />
                  </button>
                  <button onClick={() => openBookmarkEdit(b)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" title="Edit bookmark">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => remove("bookmark", b.id)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-red-400" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {b.description && <p className="text-[11px] text-ink-3 line-clamp-2">{b.description}</p>}
              <div className="flex flex-wrap items-center gap-1 mt-auto">
                <span className="text-[10px] uppercase tracking-wider text-ink-3 border border-line rounded-full px-2 py-0.5">{b.category}</span>
                {b.tags.map((t) => <span key={t} className="text-[10px] text-accent bg-accent/10 rounded px-1.5 py-0.5">#{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {snippetForm.open && (
        <Modal title={editingSnippet ? "Edit snippet" : "New snippet"} onClose={() => { setSnippetForm((f) => ({ ...f, open: false })); setEditingSnippet(null); }}>
          <form onSubmit={saveSnippet} className="space-y-3">
            <div className="grid sm:grid-cols-[1fr_140px] gap-3">
              <input
                autoFocus
                value={snippetForm.title}
                onChange={(e) => setSnippetForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Title"
                className="input-glass text-sm"
              />
              <select
                value={snippetForm.language}
                onChange={(e) => setSnippetForm((f) => ({ ...f, language: e.target.value }))}
                className="input-glass text-sm"
              >
                {LANGUAGES.map((l) => <option key={l} value={l} className="bg-[#0b0f1a]">{l}</option>)}
              </select>
            </div>
            <input
              value={snippetForm.description}
              onChange={(e) => setSnippetForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description (optional)"
              className="input-glass text-sm"
            />
            <textarea
              value={snippetForm.code}
              onChange={(e) => setSnippetForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="Paste code…"
              rows={9}
              className="input-glass text-xs font-mono resize-y"
            />
            <input
              value={snippetForm.tags}
              onChange={(e) => setSnippetForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="Tags, comma separated"
              className="input-glass text-sm"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setSnippetForm((f) => ({ ...f, open: false })); setEditingSnippet(null); }} className="btn-ghost text-sm">Cancel</button>
              <button type="submit" className="btn-primary text-sm">{editingSnippet ? "Save changes" : "Save snippet"}</button>
            </div>
          </form>
        </Modal>
      )}

      {bookmarkForm.open && (
        <Modal title={editingBookmark ? "Edit bookmark" : "New bookmark"} onClose={() => { setBookmarkForm((f) => ({ ...f, open: false })); setEditingBookmark(null); }}>
          <form onSubmit={saveBookmark} className="space-y-3">
            <input
              autoFocus
              value={bookmarkForm.title}
              onChange={(e) => setBookmarkForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Title"
              className="input-glass text-sm"
            />
            <input
              value={bookmarkForm.url}
              onChange={(e) => setBookmarkForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://example.com"
              className="input-glass text-sm"
            />
            <div className="grid sm:grid-cols-[1fr_160px] gap-3">
              <input
                value={bookmarkForm.description}
                onChange={(e) => setBookmarkForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)"
                className="input-glass text-sm"
              />
              <select
                value={bookmarkForm.category}
                onChange={(e) => setBookmarkForm((f) => ({ ...f, category: e.target.value }))}
                className="input-glass text-sm"
              >
                {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#0b0f1a]">{c}</option>)}
              </select>
            </div>
            <input
              value={bookmarkForm.tags}
              onChange={(e) => setBookmarkForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="Tags, comma separated"
              className="input-glass text-sm"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setBookmarkForm((f) => ({ ...f, open: false })); setEditingBookmark(null); }} className="btn-ghost text-sm">Cancel</button>
              <button type="submit" className="btn-primary text-sm">{editingBookmark ? "Save changes" : "Save bookmark"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Empty({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="glass rounded-2xl p-10 text-center">
      <Code2 className="mx-auto text-ink-3" size={26} />
      <div className="text-sm text-ink-2 font-medium mt-2">{label}</div>
      <div className="text-xs text-ink-3 mt-1">{hint}</div>
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[10vh] overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b0f1a] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
