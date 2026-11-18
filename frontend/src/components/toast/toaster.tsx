"use client";

import * as React from "react";
import { CheckCircle2, CircleAlert, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "destructive" | "success" | "info" | "warning";

type ToastOptions = {
  id?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
};

type ToastItem = ToastOptions & {
  id: string;
  variant: ToastVariant;
  duration: number;
  createdAt: number;
};

const TOAST_LIMIT = 5;
const DEFAULT_DURATION = 4000;

let toasts: ToastItem[] = [];
let sequence = 0;
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setToasts(next: ToastItem[]) {
  toasts = next;
  emit();
}

function dismiss(id: string) {
  setToasts(toasts.filter((item) => item.id !== id));
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

function push(options: ToastOptions) {
  const id = options.id ?? `toast-${++sequence}`;
  const duration = options.duration ?? DEFAULT_DURATION;
  const item: ToastItem = {
    ...options,
    id,
    variant: options.variant ?? "default",
    duration,
    createdAt: Date.now(),
  };

  setToasts([item, ...toasts].slice(0, TOAST_LIMIT));

  if (duration > 0) {
    timers.set(id, setTimeout(() => dismiss(id), duration));
  }
  return id;
}

type ToastFn = ((options: ToastOptions) => string) & {
  dismiss: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
};

export const toast: ToastFn = Object.assign(
  (options: ToastOptions) => push(options),
  {
    dismiss,
    success: (title: string, description?: string) => push({ title, description, variant: "success" }),
    error: (title: string, description?: string) => push({ title, description, variant: "destructive" }),
    info: (title: string, description?: string) => push({ title, description, variant: "info" }),
    warning: (title: string, description?: string) => push({ title, description, variant: "warning" }),
  },
);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => toasts;

export function useToast() {
  const list = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return React.useMemo(() => ({ toast, toasts: list }), [list]);
}

/* Kept for compatibility with older imports. */
export const ToastProvider = React.createContext<{ toast: ToastFn; toasts: ToastItem[] }>({ toast, toasts: [] });

export const ToastAction = React.forwardRef<HTMLElement, { children?: React.ReactNode }>(
  ({ children }, ref) => <span ref={ref}>{children}</span>,
);
ToastAction.displayName = "ToastAction";

const VARIANTS: Record<ToastVariant, { icon: React.ElementType; tone: string }> = {
  default: { icon: Info, tone: "text-accent bg-accent-soft border-accent/30" },
  info: { icon: Info, tone: "text-accent bg-accent-soft border-accent/30" },
  success: { icon: CheckCircle2, tone: "text-positive bg-positive/10 border-positive/30" },
  destructive: { icon: CircleAlert, tone: "text-error bg-error/10 border-error/30" },
  warning: { icon: TriangleAlert, tone: "text-warning bg-warning/10 border-warning/30" },
};

export const Toast = React.forwardRef<
  HTMLDivElement,
  ToastOptions & { className?: string }
>(({ className, title, description, action, variant = "default", duration = DEFAULT_DURATION, id }, ref) => {
  const { icon: Icon, tone } = VARIANTS[variant];
  return (
    <div
      ref={ref}
      role="status"
      className={cn(
        "toast-enter pointer-events-auto relative overflow-hidden rounded-xl border border-line bg-surface p-4 pr-10 shadow-xl",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg border", tone)}>
          <Icon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          {title && <h3 className="text-sm font-semibold leading-snug text-ink">{title}</h3>}
          {description && <p className="mt-1 text-xs leading-relaxed text-ink-3">{description}</p>}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </div>
      <button
        onClick={() => id && dismiss(id)}
        className="absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
      {duration > 0 && id && (
        <span
          className="toast-progress absolute bottom-0 left-0 h-0.5 w-full bg-accent/60"
          style={{ animationDuration: `${duration}ms` }}
        />
      )}
    </div>
  );
});
Toast.displayName = "Toast";

export function Toaster() {
  const { toasts: list } = useToast();
  return (
    <div
      className="pointer-events-none fixed bottom-24 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5 lg:bottom-6 lg:right-6"
      aria-live="polite"
    >
      {list.map((item) => (
        <Toast key={item.id} {...item} />
      ))}
    </div>
  );
}
