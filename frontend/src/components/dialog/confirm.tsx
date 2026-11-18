"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type ConfirmState = Required<ConfirmOptions> & {
  description: string;
  resolve: (value: boolean) => void;
};

let pending: ConfirmState | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function settle(value: boolean) {
  const current = pending;
  pending = null;
  emit();
  current?.resolve(value);
}

/** Ask for confirmation with an in-app dialog instead of the browser popup. */
export function confirmDialog(description: string, options: ConfirmOptions = {}): Promise<boolean> {
  if (pending) pending.resolve(false);
  return new Promise((resolve) => {
    pending = {
      description,
      title: options.title ?? "Are you sure?",
      confirmLabel: options.confirmLabel ?? "Confirm",
      cancelLabel: options.cancelLabel ?? "Cancel",
      destructive: options.destructive ?? true,
      resolve,
    };
    emit();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => pending;

export function useConfirm() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function ConfirmDialog() {
  const state = useConfirm();

  React.useEffect(() => {
    if (!state) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") settle(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [state]);

  if (!state) return null;

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
        onClick={() => settle(false)}
        aria-label="Cancel confirmation"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl border",
              state.destructive
                ? "border-error/30 bg-error/10 text-error"
                : "border-accent/30 bg-accent-soft text-accent",
            )}
          >
            <TriangleAlert size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="text-sm font-semibold text-ink">{state.title}</h2>
            <p id="confirm-description" className="mt-1 text-xs leading-relaxed text-ink-3">{state.description}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => settle(false)}
            className="rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-xs font-medium text-ink-2 transition-colors hover:border-accent hover:text-ink"
          >
            {state.cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => settle(true)}
            className={cn(
              "rounded-xl px-3.5 py-2 text-xs font-semibold transition-all hover:brightness-110",
              state.destructive ? "bg-error text-white" : "bg-accent text-accent-ink",
            )}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
