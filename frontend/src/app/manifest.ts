import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Life OS",
    short_name: "Life OS",
    description: "Personal life & developer OS — tasks, calendar, notes, finance, habits and more.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0f1a",
    theme_color: "#0b0f1a",
    categories: ["productivity", "lifestyle", "finance"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Dashboard", url: "/" },
      { name: "Tasks", url: "/tasks" },
      { name: "Calendar", url: "/calendar" },
      { name: "Workspace", url: "/workspace" },
    ],
  };
}
