"use client";

import { useEffect, useRef, useState } from "react";
import { API_URL, api } from "@/lib/api";
import {
  Upload,
  File as FileIcon,
  Trash2,
  Download,
  Image as ImageIcon,
  FileText,
  FileArchive,
  Pencil,
  Eye,
  X,
  Check,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/components/toast/toaster";

type StoredFile = {
  id: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  createdAt: string;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.includes("zip") || mime.includes("tar") || mime.includes("rar")) return FileArchive;
  if (mime.includes("text") || mime.includes("pdf") || mime.includes("json")) return FileText;
  return FileIcon;
}

function isText(mime: string) {
  return mime.startsWith("text/") || mime.includes("json") || mime.includes("csv") || mime.includes("xml");
}

export default function FilesPage() {
  const { toast } = useToast();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [preview, setPreview] = useState<StoredFile | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const d = await api.files.list();
      setFiles((d.files ?? []) as StoredFile[]);
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let cancelled = false;
    setPreviewText(null);
    if (!preview || !isText(preview.mimeType)) return;
    setPreviewLoading(true);
    fetch(api.files.preview(preview.id), { credentials: "include" })
      .then((r) => r.text())
      .then((t) => { if (!cancelled) setPreviewText(t.slice(0, 20_000)); })
      .catch(() => { if (!cancelled) setPreviewText("Could not load preview."); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [preview]);

  async function upload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${API_URL}/api/files`, { method: "POST", body: form, credentials: "include" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Upload failed (${res.status})`);
        }
      }
      await load();
      toast({ title: fileList.length > 1 ? "Files uploaded" : "File uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(f: StoredFile) {
    if (!confirm(`Delete "${f.filename}"?`)) return;
    try {
      await api.files.remove(f.id);
      setFiles((list) => list.filter((x) => x.id !== f.id));
      if (preview?.id === f.id) setPreview(null);
      toast({ title: "File deleted" });
    } catch (err: any) {
      toast({ title: "Could not delete file", description: err?.message });
    }
  }

  function startRename(f: StoredFile) {
    setEditingId(f.id);
    setNameDraft(f.filename);
  }

  async function saveName(f: StoredFile) {
    const filename = nameDraft.trim();
    if (!filename || filename === f.filename) {
      setEditingId(null);
      return;
    }
    setSavingName(true);
    try {
      const d = await api.files.rename(f.id, filename);
      setFiles((list) => list.map((x) => (x.id === f.id ? { ...x, ...(d.file ?? {}) } : x)));
      setEditingId(null);
      toast({ title: "File renamed" });
    } catch (err: any) {
      toast({ title: "Could not rename file", description: err?.message });
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Files</h1>
          <p className="text-xs text-ink-3 mt-1">Upload and keep documents, images, and archives in one place.</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-primary text-sm inline-flex items-center gap-2"
        >
          <Upload size={16} /> {uploading ? "Uploading…" : "Upload file"}
        </button>
        <input ref={inputRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files); }}
        className={`glass rounded-2xl border-2 border-dashed p-8 text-center mb-5 transition ${dragging ? "border-accent bg-accent/10" : "border-white/10"}`}
      >
        <Upload className="mx-auto text-ink-3" size={22} />
        <div className="text-sm text-ink-2 mt-2">Drag & drop files here</div>
        <div className="text-[11px] text-ink-3 mt-1">or use the Upload button. Max size set by server (default 10 MB).</div>
      </div>

      <div className="glass rounded-2xl overflow-hidden border border-white/10">
        <div className="px-5 py-4 border-b border-white/10 text-[11px] font-semibold uppercase tracking-wider text-ink-2">
          {files.length} file{files.length === 1 ? "" : "s"}
        </div>
        {loading ? (
          <div className="p-6 text-sm text-ink-3">Loading…</div>
        ) : files.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-3">No files yet.</div>
        ) : (
          <div className="divide-y divide-white/10">
            {files.map((f) => {
              const Icon = iconFor(f.mimeType);
              const editing = editingId === f.id;
              return (
                <div key={f.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="size-9 rounded-lg bg-white/5 grid place-items-center text-accent shrink-0">
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {editing ? (
                      <form
                        onSubmit={(e) => { e.preventDefault(); saveName(f); }}
                        className="flex items-center gap-1.5"
                      >
                        <input
                          autoFocus
                          value={nameDraft}
                          onChange={(e) => setNameDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Escape") setEditingId(null); }}
                          maxLength={255}
                          className="flex-1 min-w-0 rounded-lg border border-line bg-transparent px-2 py-1 text-sm text-ink"
                        />
                        <button type="submit" disabled={savingName} className="size-7 grid place-items-center rounded-lg text-emerald-400 hover:bg-emerald-400/10 disabled:opacity-50" title="Save name">
                          <Check size={14} />
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} className="size-7 grid place-items-center rounded-lg text-ink-3 hover:text-ink" title="Cancel">
                          <X size={14} />
                        </button>
                      </form>
                    ) : (
                      <div className="text-sm text-ink truncate" title={f.filename}>{f.filename}</div>
                    )}
                    <div className="text-[11px] text-ink-3 tabular">
                      {formatBytes(f.byteSize)} · {new Date(f.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {!editing && (
                    <button
                      onClick={() => startRename(f)}
                      className="size-8 grid place-items-center rounded-lg text-ink-3 hover:text-ink"
                      title="Rename"
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => setPreview(f)}
                    className="size-8 grid place-items-center rounded-lg text-ink-3 hover:text-ink"
                    title="Preview"
                  >
                    <Eye size={15} />
                  </button>
                  <a
                    href={api.files.download(f.id)}
                    className="size-8 grid place-items-center rounded-lg text-ink-3 hover:text-ink"
                    title="Download"
                  >
                    <Download size={15} />
                  </a>
                  <button
                    onClick={() => remove(f)}
                    className="size-8 grid place-items-center rounded-lg text-ink-3 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
          <div
            className="w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 bg-[#0b0f1a] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink truncate">{preview.filename}</div>
                <div className="text-[10px] text-ink-3 tabular">
                  {preview.mimeType || "unknown"} · {formatBytes(preview.byteSize)}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={api.files.preview(preview.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="size-8 grid place-items-center rounded-lg text-ink-3 hover:text-ink"
                  title="Open in new tab"
                >
                  <ExternalLink size={15} />
                </a>
                <button onClick={() => setPreview(null)} className="size-8 grid place-items-center rounded-lg text-ink-3 hover:text-ink" title="Close">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex-1 grid place-items-center bg-black/20">
              {preview.mimeType.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={api.files.preview(preview.id)} alt={preview.filename} className="max-h-[70vh] max-w-full rounded-lg" />
              ) : preview.mimeType.includes("pdf") ? (
                <iframe src={api.files.preview(preview.id)} title={preview.filename} className="w-full h-[70vh] rounded-lg bg-white" />
              ) : isText(preview.mimeType) ? (
                previewLoading ? (
                  <div className="text-xs text-ink-3">Loading preview…</div>
                ) : (
                  <pre className="w-full max-h-[70vh] overflow-auto rounded-lg bg-black/30 p-3 text-[11px] leading-relaxed text-ink-2 whitespace-pre-wrap break-words">
                    {previewText || "(empty file)"}
                  </pre>
                )
              ) : (
                <div className="text-center text-xs text-ink-3 py-10">
                  No inline preview for this file type.
                  <div className="mt-2">
                    <a href={api.files.download(preview.id)} className="text-accent hover:underline inline-flex items-center gap-1">
                      <Download size={12} /> Download instead
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
