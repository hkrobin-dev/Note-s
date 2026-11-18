"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Clock,
  Download,
  File,
  FileText,
  Files,
  Film,
  Image as ImageIcon,
  Link2,
  Music,
  Pencil,
  Plus,
  Sheet,
  Trash2,
} from "lucide-react";
import {
  fetchFiles,
  createFile,
  updateFile,
  deleteFile,
  type FileDTO,
  type FilePayload,
  fileSummary,
  formatBytes,
} from "@/features/files/api";
import { mimeLabel } from "@/features/files/format";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  ListSkeleton,
  Modal,
  PageHeader,
  SearchInput,
  StatCard,
} from "@/components/ui";

function iconFor(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.startsWith("application/pdf")) return FileText;
  if (mimeType.startsWith("text/")) return FileText;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return Sheet;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return File;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.startsWith("video/")) return Film;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return Archive;
  return File;
}

function blankForm(): Partial<FileDTO> {
  return {
    filename: "",
    safeFilename: "",
    storagePath: "",
    mimeType: "application/octet-stream",
    byteSize: 0,
    checksum: null,
  };
}

export function FilesView() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FileDTO | null>(null);
  const [form, setForm] = useState<Partial<FileDTO>>(blankForm());

  const query = useQuery({
    queryKey: ["files"],
    queryFn: () => fetchFiles({}),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["files"] });

  const createMutation = useMutation({
    mutationFn: (
      payload: FilePayload & {
        filename: string;
        safeFilename: string;
        storagePath: string;
        mimeType: string;
        byteSize: number;
      },
    ) => createFile(payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FilePayload }) => updateFile(id, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFile(id),
    onSuccess: invalidate,
  });

  const files = useMemo(() => query.data?.files ?? [], [query.data]);
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return files;
    return files.filter(
      (file) =>
        file.filename.toLowerCase().includes(needle) ||
        file.mimeType.toLowerCase().includes(needle),
    );
  }, [files, q]);

  const summaries = files.map(fileSummary);
  const totalBytes = summaries.reduce((sum, summary) => sum + summary.byteSize, 0);
  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error;

  function openCreate() {
    setEditing(null);
    setForm(blankForm());
    setOpen(true);
  }

  function openEdit(file: FileDTO) {
    setEditing(file);
    setForm({
      filename: file.filename,
      safeFilename: file.safeFilename,
      storagePath: file.storagePath,
      mimeType: file.mimeType,
      byteSize: file.byteSize,
      checksum: file.checksum,
    });
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.filename?.trim()) return;
    const payload: FilePayload & {
      filename: string;
      safeFilename: string;
      storagePath: string;
      mimeType: string;
      byteSize: number;
    } = {
      filename: form.filename.trim(),
      safeFilename: form.safeFilename ?? "",
      storagePath: form.storagePath ?? "",
      mimeType: form.mimeType || "application/octet-stream",
      byteSize: Number(form.byteSize) || 0,
      checksum: form.checksum ?? null,
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

  async function handleDelete(file: FileDTO) {
    if (!window.confirm(`Delete “${file.filename}”?`)) return;
    try {
      await deleteMutation.mutateAsync(file.id);
    } catch {
      // Error surfaced in the view.
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Utilities"
        title="Files"
        description="Stored documents and the records they are attached to."
        actions={
          <Button variant="primary" onClick={openCreate}>
            <Plus size={15} aria-hidden /> Add file
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Files" value={String(files.length)} icon={Files} />
        <StatCard label="Total size" value={formatBytes(totalBytes)} icon={Download} />
        <StatCard
          label="Linked records"
          value={String(summaries.reduce((sum, summary) => sum + summary.linkCount, 0))}
          icon={Link2}
        />
        <StatCard label="Types" value={String(new Set(files.map((file) => file.mimeType)).size)} icon={File} />
      </section>

      {mutationError ? <Alert>{mutationError.message}</Alert> : null}

      <Card>
        <CardHeader
          title="Library"
          description={`${visible.length} file${visible.length === 1 ? "" : "s"}`}
          action={
            <SearchInput
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search files…"
              className="w-44 sm:w-56"
            />
          }
        />
        {query.isPending ? (
          <ListSkeleton rows={4} />
        ) : query.isError ? (
          <EmptyState
            icon={Files}
            title="Could not load files"
            description={query.error.message}
            action={
              <Button size="sm" onClick={() => query.refetch()}>
                Try again
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Files}
            title={q ? "No matching files" : "No files yet"}
            description={
              q ? "Try a different name or type." : "Add a file record to keep related documents together."
            }
            action={
              q ? (
                <Button size="sm" variant="secondary" onClick={() => setQ("")}>
                  Clear search
                </Button>
              ) : (
                <Button size="sm" variant="primary" onClick={openCreate}>
                  <Plus size={14} aria-hidden /> Add file
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {visible.map((file) => {
              const Icon = iconFor(file.mimeType);
              const summary = fileSummary(file);
              return (
                <li
                  key={file.id}
                  className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-2/40"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-ink-3">
                    <Icon size={16} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink" title={file.filename}>
                      {file.filename}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-ink-3">
                      <span>{mimeLabel(file.mimeType)}</span>
                      <span aria-hidden>·</span>
                      <span className="tabular">{formatBytes(file.byteSize)}</span>
                      <span aria-hidden>·</span>
                      <span>{summary.linkCount} link{summary.linkCount === 1 ? "" : "s"}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} aria-hidden />
                        {new Date(file.createdAt).toLocaleDateString("en-GB", {
                          timeZone: "Asia/Dhaka",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => openEdit(file)}
                      aria-label={`Edit ${file.filename}`}
                      className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Pencil size={13} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(file)}
                      aria-label={`Delete ${file.filename}`}
                      className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-error-soft hover:text-error sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 size={13} aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit file" : "New file record"}
        description="Register a stored file so it can be linked to tasks, notes, events, and expenses."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="file-form"
              variant="primary"
              disabled={!form.filename?.trim()}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editing ? "Save changes" : "Add file"}
            </Button>
          </>
        }
      >
        <form id="file-form" onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Filename" htmlFor="file-name" className="sm:col-span-2">
            <Input
              id="file-name"
              value={form.filename ?? ""}
              onChange={(event) => setForm({ ...form, filename: event.target.value })}
              placeholder="e.g. receipt.pdf"
              maxLength={300}
              autoFocus
            />
          </Field>

          <Field label="MIME type" htmlFor="file-mime">
            <Input
              id="file-mime"
              value={form.mimeType ?? ""}
              onChange={(event) => setForm({ ...form, mimeType: event.target.value })}
              maxLength={100}
              placeholder="application/pdf"
            />
          </Field>

          <Field label="Byte size" htmlFor="file-size">
            <Input
              id="file-size"
              value={form.byteSize ?? ""}
              onChange={(event) => setForm({ ...form, byteSize: Number(event.target.value) || 0 })}
              type="number"
              min="0"
            />
          </Field>

          <Field label="Safe filename" htmlFor="file-safe" hint="Sanitized name used on disk.">
            <Input
              id="file-safe"
              value={form.safeFilename ?? ""}
              onChange={(event) => setForm({ ...form, safeFilename: event.target.value })}
              maxLength={300}
            />
          </Field>

          <Field label="Checksum" htmlFor="file-checksum" hint="Optional SHA-256.">
            <Input
              id="file-checksum"
              value={form.checksum ?? ""}
              onChange={(event) => setForm({ ...form, checksum: event.target.value })}
              maxLength={128}
              placeholder="a3f5…"
            />
          </Field>

          <Field label="Storage path" htmlFor="file-path" className="sm:col-span-2">
            <Input
              id="file-path"
              value={form.storagePath ?? ""}
              onChange={(event) => setForm({ ...form, storagePath: event.target.value })}
              maxLength={500}
              placeholder="/storage/files/…"
            />
          </Field>

          {mutationError ? <Alert className="sm:col-span-2">{mutationError.message}</Alert> : null}
        </form>
      </Modal>
    </div>
  );
}
