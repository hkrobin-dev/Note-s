"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  FileText,
  Pencil,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import {
  fetchNotes,
  createNote,
  updateNote,
  deleteNote,
  type NoteDTO,
  type NotePayload,
} from "@/features/notes/api";
import { noteDate } from "@/features/notes/format";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  SearchInput,
  Segmented,
  StatCard,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/utils";

type Mode = "active" | "favorites" | "archived";

function docToText(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const blocks = (content as { content?: unknown[] }).content ?? [];
  const lines: string[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const inner = (block as { content?: unknown[] }).content ?? [];
    const text = inner
      .map((node) =>
        node && typeof node === "object" && "text" in node
          ? String((node as { text: string }).text)
          : "",
      )
      .join("");
    lines.push(text);
  }
  return lines.join("\n\n").trim();
}

function textToDoc(text: string): unknown {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  return {
    type: "doc",
    content: paragraphs.map((paragraph) => ({
      type: "paragraph",
      content: paragraph ? [{ type: "text", text: paragraph }] : [],
    })),
  };
}

function preview(content: unknown): string {
  return docToText(content).replace(/\s+/g, " ").slice(0, 140);
}

function blankForm(): Partial<NoteDTO> {
  return {
    title: "",
    content: null,
    icon: null,
    coverImage: null,
    favorite: false,
    order: 0,
    archivedAt: null,
    projectId: null,
    parentId: null,
  };
}

export function NotesView() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("active");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NoteDTO | null>(null);
  const [form, setForm] = useState<Partial<NoteDTO>>(blankForm());
  const [body, setBody] = useState("");

  const query = useQuery({
    queryKey: ["notes"],
    queryFn: () => fetchNotes({}),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notes"] });

  const createMutation = useMutation({
    mutationFn: (payload: NotePayload & { title: string }) => createNote(payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: NotePayload }) => updateNote(id, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: invalidate,
  });

  const notes = useMemo(() => query.data?.notes ?? [], [query.data]);
  const activeNotes = notes.filter((note) => !note.archivedAt);
  const favoriteCount = activeNotes.filter((note) => note.favorite).length;
  const archivedCount = notes.length - activeNotes.length;

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return notes
      .filter((note) => {
        if (mode === "archived") return Boolean(note.archivedAt);
        if (note.archivedAt) return false;
        if (mode === "favorites") return note.favorite;
        return true;
      })
      .filter((note) => {
        if (!needle) return true;
        return (
          note.title.toLowerCase().includes(needle) ||
          preview(note.content).toLowerCase().includes(needle) ||
          (note.project?.name ?? "").toLowerCase().includes(needle)
        );
      });
  }, [notes, mode, q]);

  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error;

  function openCreate() {
    setEditing(null);
    setForm(blankForm());
    setBody("");
    setOpen(true);
  }

  function openEdit(note: NoteDTO) {
    setEditing(note);
    setForm({
      title: note.title,
      content: note.content,
      icon: note.icon,
      coverImage: note.coverImage,
      favorite: note.favorite,
      order: note.order,
      archivedAt: note.archivedAt,
      projectId: note.projectId,
      parentId: note.parentId,
    });
    setBody(docToText(note.content));
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title?.trim()) return;
    const payload: NotePayload & { title: string } = {
      title: form.title.trim(),
      content: body.trim() ? textToDoc(body) : null,
      icon: form.icon ?? null,
      coverImage: form.coverImage ?? null,
      favorite: Boolean(form.favorite),
      order: form.order ?? 0,
      archivedAt: form.archivedAt ?? null,
      projectId: form.projectId || null,
      parentId: form.parentId || null,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setOpen(false);
      setEditing(null);
    } catch {
      // Error surfaced in the modal.
    }
  }

  async function toggleArchive(note: NoteDTO) {
    try {
      await updateMutation.mutateAsync({
        id: note.id,
        payload: { archivedAt: note.archivedAt ? null : new Date().toISOString() },
      });
    } catch {
      // Error surfaced in the view.
    }
  }

  async function handleDelete(note: NoteDTO) {
    if (!window.confirm(`Delete “${note.title}”?`)) return;
    try {
      await deleteMutation.mutateAsync(note.id);
    } catch {
      // Error surfaced in the view.
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Work"
        title="Notes"
        description="A lightweight knowledge base for ideas, meeting notes, and reference material."
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus size={15} aria-hidden /> New note
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Notes" value={String(activeNotes.length)} icon={BookOpen} />
        <StatCard label="Favorites" value={String(favoriteCount)} tone="accent" icon={Star} />
        <StatCard label="Archived" value={String(archivedCount)} icon={Archive} />
        <StatCard label="Showing" value={String(visible.length)} icon={FileText} />
      </section>

      {mutationError ? <Alert>{mutationError.message}</Alert> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          ariaLabel="Filter notes"
          options={[
            { value: "active", label: "All notes", count: activeNotes.length },
            { value: "favorites", label: "Favorites", count: favoriteCount },
            { value: "archived", label: "Archived", count: archivedCount },
          ]}
          value={mode}
          onChange={setMode}
        />
        <SearchInput
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search notes…"
          className="w-full sm:w-64"
        />
      </div>

      {query.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} className="h-40 animate-pulse bg-surface-2" />
          ))}
        </div>
      ) : query.isError ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title="Could not load notes"
            description={query.error.message}
            action={
              <Button size="sm" onClick={() => query.refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title={q ? "No notes match your search" : mode === "archived" ? "Nothing archived" : "No notes yet"}
            description={
              q
                ? "Try a different phrase."
                : mode === "archived"
                  ? "Archived notes will appear here."
                  : "Write your first note to start building your knowledge base."
            }
            action={
              q ? (
                <Button size="sm" variant="secondary" onClick={() => setQ("")}>
                  Clear search
                </Button>
              ) : mode === "active" ? (
                <Button size="sm" variant="primary" onClick={openCreate}>
                  <Plus size={14} aria-hidden /> New note
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((note) => (
            <Card key={note.id} className="group flex flex-col p-4 transition-colors hover:border-line-strong">
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(note)}
                  className="min-w-0 flex-1 text-left"
                >
                  <h3 className="truncate text-[13px] font-semibold text-ink" title={note.title}>
                    {note.title}
                  </h3>
                </button>
                {note.favorite ? (
                  <Star size={14} className="mt-0.5 shrink-0 fill-warning text-warning" aria-label="Favorite" />
                ) : null}
                {note.archivedAt ? <Badge tone="warning">Archived</Badge> : null}
              </div>

              <p className="mt-1.5 line-clamp-2 min-h-8 text-xs text-ink-3">
                {preview(note.content) || "Empty note"}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {note.project?.name ? <Badge>{note.project.name}</Badge> : null}
                {(note.taggedWith ?? []).slice(0, 3).map((tag) => (
                  <Badge key={tag.tag.id}>{tag.tag.name}</Badge>
                ))}
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <span className="text-[10px] text-ink-3">Updated {noteDate(note.updatedAt)}</span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => toggleArchive(note)}
                    aria-label={note.archivedAt ? "Restore note" : "Archive note"}
                    className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    {note.archivedAt ? <ArchiveRestore size={13} aria-hidden /> : <Archive size={13} aria-hidden />}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(note)}
                    aria-label={`Edit ${note.title}`}
                    className={cn(
                      "grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    <Pencil size={13} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(note)}
                    aria-label={`Delete ${note.title}`}
                    className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-error-soft hover:text-error"
                  >
                    <Trash2 size={13} aria-hidden />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit note" : "New note"}
        description="Write in plain text — paragraphs are preserved when you save."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="note-form"
              variant="primary"
              disabled={!form.title?.trim()}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? "Save changes" : "Create note"}
            </Button>
          </>
        }
      >
        <form id="note-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Title" htmlFor="note-title">
            <Input
              id="note-title"
              value={form.title ?? ""}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="e.g. Meeting notes — website review"
              maxLength={200}
              autoFocus
            />
          </Field>

          <Field label="Body" htmlFor="note-body">
            <Textarea
              id="note-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={10}
              placeholder="Start writing…"
              className="min-h-48"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project ID" htmlFor="note-project" hint="Optional — link this note to a project.">
              <Input
                id="note-project"
                value={form.projectId ?? ""}
                onChange={(event) => setForm({ ...form, projectId: event.target.value })}
                placeholder="e.g. proj_website"
              />
            </Field>
            <Field label="Parent note ID" htmlFor="note-parent" hint="Optional — nest under another note.">
              <Input
                id="note-parent"
                value={form.parentId ?? ""}
                onChange={(event) => setForm({ ...form, parentId: event.target.value })}
                placeholder="e.g. page_meeting_notes"
              />
            </Field>
          </div>

          <div className="flex items-center gap-2.5">
            <input
              id="note-favorite"
              type="checkbox"
              checked={Boolean(form.favorite)}
              onChange={(event) => setForm({ ...form, favorite: event.target.checked })}
              className="size-4 rounded border-line bg-surface-2 accent-[var(--color-accent)]"
            />
            <label htmlFor="note-favorite" className="text-[13px] text-ink-2">
              Mark as favorite
            </label>
          </div>

          {mutationError ? <Alert>{mutationError.message}</Alert> : null}
        </form>
      </Modal>
    </div>
  );
}
