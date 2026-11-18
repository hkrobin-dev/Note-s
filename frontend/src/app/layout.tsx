import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ReminderNotifier } from "@/components/notifications/ReminderNotifier";
import { MobileNav } from "@/components/layout/Sidebar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { Toaster } from "@/components/toast/toaster";
import { PinLockGate } from "@/components/auth/PinLockGate";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "My Life OS",
  description: "Personal life management workspace — tasks, finance, notes, projects.",
  applicationName: "My Life OS",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "My Life OS",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a1220",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-full`}>
        {/* Apply theme before React hydration to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('mylifeos-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})()`,
          }}
        />
        <ThemeProvider>
          <PinLockGate>
            <div className="flex min-h-dvh flex-col">
              {children}
              <ReminderNotifier />
              <CommandPalette />
              <MobileNav />
              <Toaster />
              <ServiceWorkerRegister />
            </div>
          </PinLockGate>
        </ThemeProvider>
      </body>
    </html>
  );
}
