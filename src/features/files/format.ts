export function mimeIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("application/pdf")) return "📄";
  if (mimeType.startsWith("text/")) return "📝";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📽️";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.includes("zip") || mimeType.includes("archive")) return "📦";
  return "📎";
}

export function mimeLabel(mimeType: string): string {
  const parts = mimeType.split("/");
  return parts[parts.length - 1].toUpperCase();
}
