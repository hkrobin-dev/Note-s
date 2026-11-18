import { formatDateTime } from "@/lib/dates";

export function noteDate(iso: string | null): string {
  if (!iso) return "—";
  return formatDateTime(iso, false);
}

export function contentPreview(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const doc = content as { content?: unknown[] };
  const blocks = doc.content ?? [];
  const texts: string[] = [];
  for (const block of blocks) {
    if (block && typeof block === "object" && "content" in block) {
      const inner = (block as { content?: unknown[] }).content ?? [];
      for (const node of inner) {
        if (node && typeof node === "object" && "text" in node) {
          texts.push(String((node as { text: string }).text));
        }
      }
    }
  }
  return texts.join(" ").slice(0, 120);
}

export function favoriteStar(favorite: boolean): string {
  return favorite ? "★" : "☆";
}
