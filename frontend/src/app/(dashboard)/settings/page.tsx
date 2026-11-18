"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "@/components/toast/toaster";
import { confirmDialog } from "@/components/dialog/confirm";
import { GlassPanel, SectionTitle } from "@/components/glass/GlassPanel";
import { useTheme } from "@/components/theme/ThemeProvider";
import { Bell, Mail, CheckCircle2, AlertCircle, Lock, Download } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<any>(null);
  const [notifications, setNotifications] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission>("default");

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasPin(!!localStorage.getItem("mylifeos_app_pin_hash"));
      if ("Notification" in window) setBrowserPerm(Notification.permission);
    }
  }, []);
  async function enableBrowser() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.warning("This browser does not support notifications.");
      return;
    }
    const p = await Notification.requestPermission();
    setBrowserPerm(p);
    if (p === "granted") {
      try {
        new Notification("My Life OS", { body: "Browser notifications are on.", icon: "/icon-192.png" });
      } catch { /* ignore */ }
    }
  }
  async function load() {
    try {
      const d = await api.settings.get();
      setSettings(d.settings);
      if (d.settings?.theme === "light" || d.settings?.theme === "dark") setTheme(d.settings.theme);
      setNotifications(!!d.settings.notificationsEnabled);
      setEmailNotif(!!d.settings.emailNotifications);
    } catch {
      /* keep local preferences when the backend is unavailable */
    }
  }
  async function chooseTheme(next: "light" | "dark") {
    setTheme(next);
    try {
      await api.settings.patch({ theme: next });
      setSettings((s: any) => (s ? { ...s, theme: next } : s));
    } catch {
      /* theme still applies locally via ThemeProvider */
    }
  }
  async function save() {
    setSaving(true);
    try { await api.settings.patch({ theme, notificationsEnabled: notifications, emailNotifications: emailNotif }); await load(); } catch { toast.error("Failed to save"); } finally { setSaving(false); }
  }
  async function removePin() {
    if (!(await confirmDialog("Remove PIN lock? You will no longer need a PIN to open the app."))) return;
    localStorage.removeItem("mylifeos_app_pin_hash");
    sessionStorage.removeItem("mylifeos_unlocked");
    setHasPin(false);
    toast.success("PIN removed", "Reload the app to set a new PIN if you want.");
  }

  return (
    <div className="page-wrap py-8">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-ink tracking-tight">Settings</h1>
        <p className="text-xs text-ink-3">Personalize your My Life OS experience.</p>
      </div>

      <GlassPanel className="p-0 rounded-2xl overflow-hidden">
        <div className="border-b border-line/60 px-6 py-4">
          <h2 className="text-sm font-semibold text-ink-2 uppercase tracking-wider">Appearance</h2>
        </div>
        <div className="divide-y divide-line/60 p-0">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-ink">Theme</div>
              <div className="text-[10px] text-ink-3">Choose light or dark mode</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => chooseTheme("light")} className={cnBtn("glass-interactive px-3 py-2 rounded-lg text-xs text-ink-2", theme === "light")}>Light</button>
              <button onClick={() => chooseTheme("dark")} className={cnBtn("glass-interactive px-3 py-2 rounded-lg text-xs text-ink-2", theme === "dark")}>Dark</button>
            </div>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="mt-6 p-0 rounded-2xl overflow-hidden">
        <div className="border-b border-line/60 px-6 py-4">
          <h2 className="text-sm font-semibold text-ink-2 uppercase tracking-wider">Notifications</h2>
        </div>
        <div className="divide-y divide-line/60 p-0">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="glass-interactive size-9 rounded-xl place-items-center text-accent"><Bell size={18} /></div>
              <div>
                <div className="text-sm font-medium text-ink">Reminder notifications</div>
                <div className="text-[10px] text-ink-3">Get notified when reminders are due</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 rounded-full bg-glass border border-line/60 peer-checked:bg-accent after:absolute after:left-[2px] after:top-[2px] after:w-5 after:h-5 after:rounded-full after:bg-white after:transition-all after:peer-checked:translate-x-5"></div>
              </label>
            </div>
            <span className="text-xs text-ink-3">{notifications ? "On" : "Off"}</span>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="glass-interactive size-9 rounded-xl place-items-center text-accent-2"><Mail size={18} /></div>
              <div>
                <div className="text-sm font-medium text-ink">Email notifications</div>
                <div className="text-[10px] text-ink-3">Receive updates by email</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={emailNotif} onChange={(e) => setEmailNotif(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 rounded-full bg-glass border border-line/60 peer-checked:bg-accent after:absolute after:left-[2px] after:top-[2px] after:w-5 after:h-5 after:rounded-full after:bg-white after:transition-all after:peer-checked:translate-x-5"></div>
              </label>
            </div>
            <span className="text-xs text-ink-3">{emailNotif ? "On" : "Off"}</span>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="glass-interactive size-9 rounded-xl place-items-center text-accent"><Bell size={18} /></div>
              <div>
                <div className="text-sm font-medium text-ink">Browser notifications</div>
                <div className="text-[10px] text-ink-3">Desktop alerts when a reminder is due</div>
              </div>
            </div>
            {browserPerm === "granted" ? (
              <span className="text-xs text-positive inline-flex items-center gap-1"><CheckCircle2 size={13} /> Enabled</span>
            ) : browserPerm === "denied" ? (
              <span className="text-xs text-ink-3 inline-flex items-center gap-1"><AlertCircle size={13} /> Blocked in browser</span>
            ) : (
              <button onClick={enableBrowser} className="text-xs px-3 py-2 rounded-lg border border-line text-ink-2 hover:bg-glass-hover">
                Enable
              </button>
            )}
          </div>
        </div>
      </GlassPanel>

      <GlassPanel className="mt-6 p-0 rounded-2xl overflow-hidden">
        <div className="border-b border-line/60 px-6 py-4">
          <h2 className="text-sm font-semibold text-ink-2 uppercase tracking-wider">App lock (PIN)</h2>
        </div>
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="glass-interactive size-9 rounded-xl place-items-center text-accent"><Lock size={18} /></div>
            <div>
              <div className="text-sm font-medium text-ink">Number lock (like phone)</div>
              <div className="text-[10px] text-ink-3">
                {hasPin ? "PIN is enabled. On app open you’ll enter a 4-digit PIN." : "No PIN set. Set it by reloading/visiting the app (you’ll be prompted)."}
              </div>
            </div>
          </div>
          {hasPin && (
            <button onClick={removePin} className="text-xs px-3 py-2 rounded-lg border border-line text-ink-2 hover:bg-glass-hover">
              Remove PIN
            </button>
          )}
        </div>
      </GlassPanel>

      <GlassPanel className="mt-6 p-0 rounded-2xl overflow-hidden">
        <div className="border-b border-line/60 px-6 py-4">
          <h2 className="text-sm font-semibold text-ink-2 uppercase tracking-wider">Data</h2>
        </div>
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="glass-interactive size-9 rounded-xl grid place-items-center text-accent"><Download size={18} /></div>
            <div>
              <div className="text-sm font-medium text-ink">Export your data</div>
              <div className="text-[10px] text-ink-3">
                Download tasks, pages, finance, habits, goals, files metadata and more as JSON.
              </div>
            </div>
          </div>
          <a
            href={api.settings.exportUrl()}
            className="text-xs px-3 py-2 rounded-lg border border-line text-ink-2 hover:bg-glass-hover whitespace-nowrap"
          >
            Download data
          </a>
        </div>
      </GlassPanel>

      <div className="mt-6 flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary text-sm px-6">{saving ? "Saving…" : "Save changes"}</button>
      </div>
    </div>
  );
}

function cnBtn(base: string, active: boolean) {
  return `${base} ${active ? "text-accent border border-accent/40" : "hover:text-ink hover:bg-glass-hover"}`;
}
