import { cn } from "@/lib/utils";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/* 16px text + 40px height on phones: iOS Safari zooms the viewport when an
   input with a smaller font-size is focused, and 44px is the minimum
   comfortable touch target. Desktop keeps the compact 13px/36px look. */
const FIELD_BASE =
  "w-full rounded-lg border border-line bg-surface-2 text-[16px] text-ink transition-colors md:text-[13px] " +
  "placeholder:text-ink-3 focus:border-accent focus:bg-surface focus:outline-none " +
  "focus:ring-2 focus:ring-[color:var(--color-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD_BASE, "h-10 px-3 md:h-9", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(FIELD_BASE, "h-10 cursor-pointer pr-8 md:h-9", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(FIELD_BASE, "px-3 py-2.5 leading-relaxed md:py-2", className)} {...rest} />
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint ? <p className="text-[11px] text-ink-3">{hint}</p> : null}
    </div>
  );
}

export function CheckboxRow({
  id,
  label,
  description,
}: {
  id: string;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-5 rounded border-line bg-surface-2 text-accent accent-[var(--color-accent)] focus:ring-0"
      />
      <div>
        <label htmlFor={id} className="text-[13px] text-ink">
          {label}
        </label>
        {description ? <p className="text-[11px] text-ink-3">{description}</p> : null}
      </div>
    </div>
  );
}
