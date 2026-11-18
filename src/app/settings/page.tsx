"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, Save, Settings2, Trash2 } from "lucide-react";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  ListSkeleton,
  PageHeader,
} from "@/components/ui";
import { getSettings, upsertSetting, deleteSetting, type AppSetting } from "@/app/actions/settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const loadSettings = useCallback(() => {
    getSettings()
      .then((rows) => {
        setSettings(rows);
        setError("");
        setLoaded(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load settings");
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function handleDelete(key: string) {
    if (!window.confirm(`Delete the “${key}” setting?`)) return;
    setSaving((prev) => new Set([...prev, key]));
    try {
      await deleteSetting(key);
      setError("");
      loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete setting");
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!newKey.trim()) return;
    const key = newKey.trim();
    setSaving((prev) => new Set([...prev, key]));
    try {
      let parsed: unknown = newValue;
      try {
        parsed = JSON.parse(newValue);
      } catch {
        parsed = newValue;
      }
      await upsertSetting(key, parsed);
      setNewKey("");
      setNewValue("");
      setError("");
      loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add setting");
    } finally {
      setSaving((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  function formatValue(value: unknown): string {
    if (value === null) return "null";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  }

  const loading = !loaded;
  const busy = saving.size > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Application key-value settings stored in PostgreSQL."
      />

      {error ? <Alert>{error}</Alert> : null}

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Add setting" description="Keys are unique. Values may be JSON." />
          <form onSubmit={handleAdd} className="space-y-4 px-5 pb-5">
            <Field label="Key" htmlFor="setting-key">
              <Input
                id="setting-key"
                value={newKey}
                onChange={(event) => setNewKey(event.target.value)}
                placeholder="e.g. app_name"
              />
            </Field>
            <Field label="Value" htmlFor="setting-value" hint="Strings, numbers, or JSON are accepted.">
              <Input
                id="setting-value"
                value={newValue}
                onChange={(event) => setNewValue(event.target.value)}
                placeholder='"My Life OS"'
              />
            </Field>
            <Button
              type="submit"
              variant="primary"
              disabled={!newKey.trim() || saving.has(newKey.trim())}
              loading={saving.has(newKey.trim())}
            >
              <Plus size={14} aria-hidden /> Add setting
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader
            title="All settings"
            description={loading ? "Loading…" : `${settings.length} key${settings.length === 1 ? "" : "s"}`}
            action={
              <Button size="sm" variant="ghost" onClick={loadSettings} disabled={busy}>
                <RefreshCw size={13} className={busy ? "animate-spin" : undefined} aria-hidden />
                Refresh
              </Button>
            }
          />
          {loading ? (
            <ListSkeleton rows={3} />
          ) : settings.length === 0 ? (
            <EmptyState
              icon={Settings2}
              title="No settings yet"
              description="Add your first key-value setting to configure the app."
            />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {settings.map((setting) => (
                <li key={setting.key} className="flex items-start gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-ink">{setting.key}</span>
                      {saving.has(setting.key) ? (
                        <Save size={12} className="animate-pulse text-ink-3" aria-hidden />
                      ) : null}
                    </div>
                    <pre className="mt-1.5 max-h-28 overflow-auto rounded-md border border-line bg-surface-2 px-2.5 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-ink-2">
                      {formatValue(setting.value)}
                    </pre>
                    <p className="mt-1.5 text-[10px] text-ink-3">
                      Updated{" "}
                      {new Date(setting.updatedAt).toLocaleString("en-GB", {
                        timeZone: "Asia/Dhaka",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(setting.key)}
                    disabled={saving.has(setting.key)}
                    aria-label={`Delete ${setting.key}`}
                    className="text-ink-3 hover:bg-error-soft hover:text-error"
                  >
                    <Trash2 size={13} aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
