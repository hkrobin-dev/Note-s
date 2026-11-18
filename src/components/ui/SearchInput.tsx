import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

export function SearchInput({
  className,
  placeholder = "Search…",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("relative block", className)}>
      <Search
        size={15}
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3"
        aria-hidden
      />
      <input
        type="search"
        placeholder={placeholder}
        /* 16px + h-10 on phones: prevents iOS focus-zoom and gives a proper
           touch target (see Field.tsx for the full rationale). */
        className="h-10 w-full rounded-lg border border-line bg-surface-2 pr-3 pl-9 text-[16px] text-ink transition-colors placeholder:text-ink-3 focus:border-accent focus:bg-surface focus:ring-2 focus:ring-[color:var(--color-accent-soft)] focus:outline-none md:h-9 md:text-[13px]"
        {...rest}
      />
    </label>
  );
}
