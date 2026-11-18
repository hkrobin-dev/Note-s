import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, MobileNav } from "@/components/layout/Sidebar";
import { ReminderNotifier } from "@/components/notifications/ReminderNotifier";
import { Providers } from "./providers";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SWRegister } from "@/components/pwa/SWRegister";
import { MobileBottomTab } from "@/components/pwa/MobileBottomTab";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "My Life OS",
    template: "%s · My Life OS",
  },
  description: "Personal life management workspace — tasks, finance, notes, projects.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "My Life OS",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0d11" },
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
  ],
  width: "device-width",
  initialScale: 1,
  // Notch-friendly layout + resize (not overlay) when the on-screen keyboard opens.
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-base font-sans text-ink">
        <ThemeProvider>
          <Providers>
            <div className="flex min-h-dvh">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col">
                <MobileNav />
                <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pt-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 lg:px-10 lg:pt-8 lg:pb-12">
                  {children}
                </main>
              </div>
              <ReminderNotifier />
              <MobileBottomTab />
            </div>
            <SWRegister />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
