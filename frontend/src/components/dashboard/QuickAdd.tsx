"use client";

import { Plus, Clock, Mail, Pin } from "lucide-react";
import { api } from "@/lib/api";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  message: z.string().min(1).max(500),
  scheduledAt: z.string().datetime(),
  channel: z.enum(["APP", "BROWSER", "EMAIL"]),
  taskId: z.string().optional().nullable(),
  eventId: z.string().optional().nullable(),
});

export function QuickAddReminder() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { message: "", scheduledAt: "", channel: "APP", taskId: null, eventId: null },
  });

  async function onSubmit(data: z.infer<typeof schema>) {
    setSubmitting(true);
    setError("");
    try {
      await api.reminders.create({ ...data, taskId: data.taskId || undefined, eventId: data.eventId || undefined });
      setOpen(false);
      form.reset();
    } catch (e: any) {
      setError(e.message || "Failed to create reminder");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(true)} className="btn-ghost">
        <Plus size={16} /> Reminder
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto glass-elevated w-full max-w-md rounded-2xl p-6 border-b-0 border-r-0 overflow-hidden">
            <h3 className="text-sm font-semibold text-ink mb-4">New Reminder</h3>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <label className="block text-xs text-ink-2 mb-1">Message</label>
                <input {...form.register("message")} className="input-glass" placeholder="e.g. Call the doctor" />
                {form.formState.errors.message && <p className="text-[10px] text-error mt-1">{form.formState.errors.message.message}</p>}
              </div>
              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Date & time</label>
                  <input type="datetime-local" {...form.register("scheduledAt")} className="input-glass" />
                  {form.formState.errors.scheduledAt && <p className="text-[10px] text-error mt-1">{form.formState.errors.scheduledAt.message}</p>}
                </div>
                <div>
                  <label className="block text-xs text-ink-2 mb-1">Channel</label>
                  <select {...form.register("channel")} className="input-glass">
                    <option value="APP">In-app</option>
                    <option value="BROWSER">Browser</option>
                    <option value="EMAIL">Email</option>
                  </select>
                  {form.formState.errors.channel && <p className="text-[10px] text-error mt-1">{form.formState.errors.channel.message}</p>}
                </div>
              </div>
              {error && <p className="text-[10px] text-error">{error}</p>}
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => { setOpen(false); form.reset(); }} className="btn-ghost text-xs">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs">
                  {submitting ? <Clock size={14} className="mr-1.5 animate-spin" /> : "Create reminder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
