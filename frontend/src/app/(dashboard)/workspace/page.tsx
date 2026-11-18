"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  ChevronRight,
  FileText,
  Plus,
  Save,
  Trash2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Code2,
  Star,
  Search,
  X,
  FolderInput,
} from "lucide-react";

type Page = {
  id: string;
  title: string;
  content?: any;
  parentId?: string | null;
  icon?: string | null;
  favorite?: boolean;
  updatedAt: string;
};

type SaveState = "idle" | "unsaved" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 1200;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pageHtml(content: any): string {
  if (!content) return "";
  if (typeof content === "string") return escapeHtml(content).replace(/\n/g, "<br/>");
  if (typeof content.html === "string") return content.html;
  if (typeof content.text === "string") return escapeHtml(content.text).replace(/\n/g, "<br/>");
  return "";
}

function wordsInHtml(html: string) {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(" ").length : 0;
}

function savedLabel(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function WorkspacePage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [initialHtml, setInitialHtml] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [words, setWords] = useState(0);
  const [query, setQuery] = useState("");

  const editorRef = useRef<HTMLDivElement>(null);
  const selectedIdRef = useRef<string | null>(null);
  const titleRef = useRef("");
  const dirtyRef = useRef(false);
  const versionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function scheduleSave() {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      persist();
    }, AUTOSAVE_MS);
  }

  function markDirty() {
    versionRef.current += 1;
    dirtyRef.current = true;
    setSaveState("unsaved");
    scheduleSave();
  }

  async function persist(force = false) {
    clearTimer();
    const id = selectedIdRef.current;
    if (!id) return;
    if (savingRef.current) {
      // A save is already in flight; run once more when it finishes.
      pendingRef.current = true;
      return;
    }
    if (!force && !dirtyRef.current) return;

    const version = versionRef.current;
    const html = editorRef.current?.innerHTML ?? "";
    const nextTitle = titleRef.current.trim() || "Untitled";

    savingRef.current = true;
    setSaveState("saving");
    try {
      const d = await api.pages.update(id, { title: nextTitle, content: { html } });
      const updated = d.page as Page;
      setPages((list) =>
        list.map((p) =>
          p.id === id
            ? { ...p, title: updated.title, updatedAt: updated.updatedAt, favorite: updated.favorite }
            : p,
        ),
      );
      if (versionRef.current === version) {
        dirtyRef.current = false;
        setSaveState("saved");
        setLastSaved(new Date());
      } else {
        setSaveState("unsaved");
      }
    } catch (err) {
      console.error(err);
      setSaveState("error");
    } finally {
      savingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        scheduleSave();
      } else if (dirtyRef.current && versionRef.current !== version) {
        scheduleSave();
      }
    }
  }

  function applyPage(p: Page) {
    selectedIdRef.current = p.id;
    titleRef.current = p.title;
    setSelectedId(p.id);
    setTitle(p.title);
    setFavorite(!!p.favorite);
    const html = pageHtml(p.content);
    setInitialHtml(html);
    setWords(wordsInHtml(html));
    dirtyRef.current = false;
    setSaveState("idle");
    setLastSaved(p.updatedAt ? new Date(p.updatedAt) : null);
  }

  function clearEditor() {
    selectedIdRef.current = null;
    titleRef.current = "";
    setSelectedId(null);
    setTitle("");
    setFavorite(false);
    setInitialHtml("");
    setWords(0);
    dirtyRef.current = false;
    setSaveState("idle");
    setLastSaved(null);
  }

  function expandTo(list: Page[], id: string) {
    const map = new Map(list.map((p) => [p.id, p]));
    const flags: Record<string, boolean> = {};
    let cursor = map.get(id)?.parentId ?? null;
    while (cursor) {
      flags[cursor] = true;
      cursor = map.get(cursor)?.parentId ?? null;
    }
    if (Object.keys(flags).length) setExpanded((e) => ({ ...e, ...flags }));
  }

  async function load(selectId?: string) {
    setLoading(true);
    try {
      const d = await api.pages.list();
      const list = (d.pages ?? []) as Page[];
      setPages(list);
      const next = selectId ?? selectedIdRef.current ?? list[0]?.id ?? null;
      const page = list.find((p) => p.id === next) ?? list[0] ?? null;
      if (page) {
        applyPage(page);
        expandTo(list, page.id);
      } else {
        clearEditor();
      }
    } catch (e) {
      console.error(e);
      setPages([]);
      clearEditor();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pageId = params.get("page") ?? undefined;
    load(pageId);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialHtml;
  }, [selectedId, initialHtml]);

  // Warn before leaving with unsaved edits; flush when the tab is hidden.
  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    function onVisibility() {
      if (document.visibilityState === "hidden" && dirtyRef.current) persist();
    }
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimer();
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  const byParent = useMemo(() => {
    const map = new Map<string, Page[]>();
    for (const p of pages) {
      const key = p.parentId ?? "root";
      map.set(key, [...(map.get(key) ?? []), p]);
    }
    return map;
  }, [pages]);

  const favorites = useMemo(
    () => pages.filter((p) => p.favorite).sort((a, b) => (a.title || "").localeCompare(b.title || "")),
    [pages],
  );

  const descendants = useMemo(() => {
    const set = new Set<string>();
    if (!selectedId) return set;
    const childMap = new Map<string, Page[]>();
    for (const p of pages) {
      if (!p.parentId) continue;
      childMap.set(p.parentId, [...(childMap.get(p.parentId) ?? []), p]);
    }
    const stack = [...(childMap.get(selectedId) ?? [])];
    while (stack.length) {
      const node = stack.pop()!;
      if (set.has(node.id)) continue;
      set.add(node.id);
      stack.push(...(childMap.get(node.id) ?? []));
    }
    return set;
  }, [pages, selectedId]);

  const selected = pages.find((p) => p.id === selectedId) ?? null;
  const moveTargets = pages.filter((p) => p.id !== selectedId && !descendants.has(p.id));

  const search = query.trim().toLowerCase();
  const searchResults = useMemo(() => {
    if (!search) return [];
    return pages.filter((p) => (p.title || "Untitled").toLowerCase().includes(search));
  }, [pages, search]);

  async function selectPage(p: Page) {
    if (p.id === selectedIdRef.current) return;
    if (dirtyRef.current) await persist(true);
    applyPage(p);
  }

  async function createPage(parentId?: string | null) {
    if (dirtyRef.current) await persist(true);
    try {
      const d = await api.pages.create({ title: "Untitled", content: { html: "" }, parentId: parentId ?? null });
      const id = d.page?.id;
      if (parentId) setExpanded((e) => ({ ...e, [parentId]: true }));
      await load(id);
    } catch (err: any) {
      alert(err?.message || "Failed to create page");
    }
  }

  async function remove() {
    const id = selectedIdRef.current;
    if (!id) return;
    if (!confirm("Archive this page? Any subpages will move up one level.")) return;
    try {
      await api.pages.remove(id);
      clearTimer();
      dirtyRef.current = false;
      selectedIdRef.current = null;
      await load();
    } catch (err: any) {
      alert(err?.message || "Failed to archive page");
    }
  }

  async function toggleFavorite() {
    const id = selectedIdRef.current;
    if (!id) return;
    const next = !favorite;
    setFavorite(next);
    setPages((list) => list.map((p) => (p.id === id ? { ...p, favorite: next } : p)));
    try {
      await api.pages.update(id, { favorite: next });
    } catch (err: any) {
      setFavorite(!next);
      setPages((list) => list.map((p) => (p.id === id ? { ...p, favorite: !next } : p)));
      alert(err?.message || "Failed to update favorite");
    }
  }

  async function moveTo(parentId: string) {
    const id = selectedIdRef.current;
    if (!id) return;
    if (dirtyRef.current) await persist(true);
    try {
      await api.pages.update(id, { parentId: parentId || null });
      setPages((list) => list.map((p) => (p.id === id ? { ...p, parentId: parentId || null } : p)));
      if (parentId) setExpanded((e) => ({ ...e, [parentId]: true }));
      setExpanded((e) => ({ ...e, [id]: true }));
    } catch (err: any) {
      alert(err?.message || "Failed to move page");
    }
  }

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    onEditorInput();
  }

  function onEditorInput() {
    setWords(wordsInHtml(editorRef.current?.innerHTML ?? ""));
    markDirty();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      persist(true);
    }
  }

  function renderTree(parentId: string | null, depth = 0): React.ReactNode {
    const items = byParent.get(parentId ?? "root") ?? [];
    if (items.length === 0) return null;
    return items.map((p) => {
      const children = byParent.get(p.id) ?? [];
      const isOpen = expanded[p.id] ?? true;
      return (
        <div key={p.id}>
          <div
            className={`group flex items-center gap-1 rounded-lg pr-2 hover:bg-glass-hover ${selectedId === p.id ? "bg-glass" : ""}`}
            style={{ paddingLeft: depth * 12 + 4 }}
          >
            <button
              onClick={() => setExpanded((e) => ({ ...e, [p.id]: !isOpen }))}
              className="size-5 grid place-items-center text-ink-3"
              aria-label="Expand"
              disabled={children.length === 0}
            >
              {children.length > 0 ? (
                <ChevronRight size={14} className={isOpen ? "rotate-90 transition-transform" : "transition-transform"} />
              ) : null}
            </button>
            <button onClick={() => selectPage(p)} className="flex-1 flex items-center gap-2 py-1.5 text-left min-w-0">
              {p.favorite ? (
                <Star size={13} className="text-amber-300 shrink-0" fill="currentColor" />
              ) : (
                <FileText size={14} className="text-ink-3 shrink-0" />
              )}
              <span className="text-sm text-ink truncate">{p.title || "Untitled"}</span>
            </button>
            <button
              onClick={() => createPage(p.id)}
              className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-ink text-xs px-1"
              title="New subpage"
            >
              +
            </button>
          </div>
          {isOpen && children.length > 0 && <div>{renderTree(p.id, depth + 1)}</div>}
        </div>
      );
    });
  }

  const saveBadge =
    saveState === "saving" ? (
      <span className="text-[11px] text-ink-3">Saving…</span>
    ) : saveState === "unsaved" ? (
      <span className="text-[11px] text-amber-300">Unsaved changes</span>
    ) : saveState === "error" ? (
      <span className="text-[11px] text-red-300">Save failed</span>
    ) : lastSaved ? (
      <span className="text-[11px] text-ink-3">Saved {savedLabel(lastSaved)}</span>
    ) : (
      <span className="text-[11px] text-ink-3">Autosaves as you type</span>
    );

  return (
    <div className="p-4 md:p-8 max-w-7xl" onKeyDown={onKeyDown}>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Workspace</h1>
          <p className="text-xs text-ink-3 mt-1">Notion-lite pages with nesting, favorites and autosave.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => createPage(null)} className="btn-primary text-sm inline-flex items-center gap-2">
            <Plus size={16} /> New page
          </button>
          {selectedId && (
            <button onClick={() => createPage(selectedId)} className="text-sm px-3 py-2 rounded-lg border border-line text-ink-2 hover:bg-glass-hover inline-flex items-center gap-2">
              <Plus size={16} /> Subpage
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="glass rounded-2xl border border-white/10 p-3 h-fit lg:sticky lg:top-6">
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a page…"
              className="w-full rounded-lg border border-line bg-transparent pl-7 pr-7 py-1.5 text-xs text-ink"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-2 px-2 py-2">
            {search ? `Results (${searchResults.length})` : "Pages"}
          </div>

          {loading ? (
            <div className="p-3 text-xs text-ink-3">Loading…</div>
          ) : search ? (
            searchResults.length === 0 ? (
              <div className="p-3 text-xs text-ink-3">No pages match “{query.trim()}”.</div>
            ) : (
              <div className="max-h-[65vh] overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectPage(p)}
                    className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-glass-hover ${selectedId === p.id ? "bg-glass" : ""}`}
                  >
                    {p.favorite ? (
                      <Star size={13} className="text-amber-300 shrink-0" fill="currentColor" />
                    ) : (
                      <FileText size={13} className="text-ink-3 shrink-0" />
                    )}
                    <span className="text-sm text-ink truncate">{p.title || "Untitled"}</span>
                  </button>
                ))}
              </div>
            )
          ) : pages.length === 0 ? (
            <div className="p-3 text-xs text-ink-3">No pages yet.</div>
          ) : (
            <div className="max-h-[65vh] overflow-y-auto">
              {favorites.length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] uppercase tracking-wider text-ink-3 px-2 py-1">Favorites</div>
                  {favorites.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPage(p)}
                      className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-glass-hover ${selectedId === p.id ? "bg-glass" : ""}`}
                    >
                      <Star size={13} className="text-amber-300 shrink-0" fill="currentColor" />
                      <span className="text-sm text-ink truncate">{p.title || "Untitled"}</span>
                    </button>
                  ))}
                  <div className="border-t border-white/10 my-2" />
                </div>
              )}
              {renderTree(null)}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl border border-white/10 overflow-hidden">
          {!selectedId ? (
            <div className="p-10 text-center">
              <div className="text-sm text-ink-2 font-medium">Select or create a page</div>
              <div className="text-xs text-ink-3 mt-1">Pages can contain subpages.</div>
            </div>
          ) : (
            <div>
              <div className="px-5 py-4 border-b border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleFavorite}
                    className={`size-8 grid place-items-center rounded-lg shrink-0 ${favorite ? "text-amber-300" : "text-ink-3 hover:text-ink"}`}
                    title={favorite ? "Remove from favorites" : "Add to favorites"}
                    aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Star size={16} fill={favorite ? "currentColor" : "none"} />
                  </button>
                  <input
                    value={title}
                    onChange={(e) => {
                      titleRef.current = e.target.value;
                      setTitle(e.target.value);
                      markDirty();
                    }}
                    onBlur={() => {
                      if (!title.trim()) {
                        titleRef.current = "Untitled";
                        setTitle("Untitled");
                        markDirty();
                      }
                    }}
                    className="flex-1 bg-transparent text-lg font-semibold text-ink outline-none min-w-0"
                    placeholder="Untitled"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {saveBadge}
                  <div className="flex items-center gap-1 text-ink-3">
                    <FolderInput size={13} />
                    <select
                      value={selected?.parentId ?? ""}
                      onChange={(e) => moveTo(e.target.value)}
                      className="bg-transparent text-[11px] text-ink-2 border border-line rounded-lg px-1.5 py-1 max-w-[160px]"
                      title="Move under another page"
                    >
                      <option value="" className="bg-[#0b0f1a]">Root (no parent)</option>
                      {moveTargets.map((p) => (
                        <option key={p.id} value={p.id} className="bg-[#0b0f1a]">
                          {p.title || "Untitled"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => persist(true)} disabled={saveState === "saving"} className="btn-primary text-xs inline-flex items-center gap-1.5">
                      <Save size={14} /> {saveState === "saving" ? "Saving…" : "Save"}
                    </button>
                    <button onClick={remove} className="size-8 grid place-items-center rounded-lg border border-line text-ink-3 hover:text-red-400" title="Archive">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1 border-b border-white/10 px-3 py-2">
                <ToolbarButton onClick={() => exec("bold")} label="Bold"><Bold size={14} /></ToolbarButton>
                <ToolbarButton onClick={() => exec("italic")} label="Italic"><Italic size={14} /></ToolbarButton>
                <ToolbarButton onClick={() => exec("underline")} label="Underline"><Underline size={14} /></ToolbarButton>
                <ToolbarButton onClick={() => exec("strikeThrough")} label="Strikethrough"><Strikethrough size={14} /></ToolbarButton>
                <span className="w-px h-5 bg-white/10 mx-1" />
                <ToolbarButton onClick={() => exec("formatBlock", "<h1>")} label="Heading 1"><Heading1 size={14} /></ToolbarButton>
                <ToolbarButton onClick={() => exec("formatBlock", "<h2>")} label="Heading 2"><Heading2 size={14} /></ToolbarButton>
                <span className="w-px h-5 bg-white/10 mx-1" />
                <ToolbarButton onClick={() => exec("insertUnorderedList")} label="Bullet list"><List size={14} /></ToolbarButton>
                <ToolbarButton onClick={() => exec("insertOrderedList")} label="Numbered list"><ListOrdered size={14} /></ToolbarButton>
                <ToolbarButton onClick={() => exec("formatBlock", "<blockquote>")} label="Quote"><Quote size={14} /></ToolbarButton>
                <ToolbarButton onClick={() => exec("formatBlock", "<pre>")} label="Code block"><Code2 size={14} /></ToolbarButton>
              </div>

              <div
                key={selectedId}
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={onEditorInput}
                className="workspace-editor w-full min-h-[60vh] bg-transparent p-5 text-sm text-ink outline-none"
                data-placeholder="Start writing…"
              />

              <div className="flex items-center justify-between px-5 py-2 border-t border-white/10 text-[10px] text-ink-3">
                <span>
                  {words} {words === 1 ? "word" : "words"}
                </span>
                <span>Ctrl/⌘ + S saves · autosave is on</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="size-8 grid place-items-center rounded-lg text-ink-2 hover:bg-glass-hover"
    >
      {children}
    </button>
  );
}
