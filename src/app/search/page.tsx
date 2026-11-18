"use client";

import { useDeferredValue, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  Calendar,
  CheckSquare,
  CreditCard,
  FileText,
  Search,
} from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, SearchInput } from "@/components/ui";
import { searchAll } from "@/app/actions/search";

type SearchResult = {
  kind: string;
  id: string;
  title: string;
  subtitle: string | null;
  url: string;
  [key: string]: unknown;
};

const ICONS: Record<string, React.ElementType> = {
  task: CheckSquare,
  event: Calendar,
  expense: CreditCard,
  note: FileText,
  project: Briefcase,
  file: FileText,
};

const LABELS: Record<string, string> = {
  task: "Task",
  event: "Event",
  expense: "Expense",
  note: "Note",
  project: "Project",
  file: "File",
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [state, setState] = useState<{ term: string; results: SearchResult[] }>({
    term: "",
    results: [],
  });

  const term = deferred.trim();

  useEffect(() => {
    if (!term) return;

    let cancelled = false;
    searchAll(term)
      .then((rows) => {
        if (!cancelled) setState({ term, results: rows });
      })
      .catch(() => {
        if (!cancelled) setState({ term, results: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [term]);

  const hasQuery = term.length > 0;
  const results = hasQuery ? state.results : [];
  const loading = hasQuery && state.term !== term;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Utilities"
        title="Search"
        description="Find anything across tasks, events, expenses, notes, projects, and files."
      />

      <Card className="p-3">
        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search everything…"
          autoFocus
          className="[&>input]:h-11 [&>input]:text-sm"
        />
      </Card>

      {!hasQuery ? (
        <Card>
          <EmptyState
            icon={Search}
            title="Start typing to search"
            description="Results update as you type and cover every module in the workspace."
          />
        </Card>
      ) : loading ? (
        <Card>
          <div className="space-y-3 p-5" aria-label="Searching">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="size-8 animate-pulse rounded-lg bg-surface-2" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-surface-2" />
                  <div className="h-2.5 w-1/5 animate-pulse rounded bg-surface-2" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <EmptyState
            icon={Search}
            title={`No results for “${query.trim()}”`}
            description="Try a shorter phrase, a different spelling, or search for a category."
          />
        </Card>
      ) : (
        <Card>
          <div className="border-b border-line px-5 py-3">
            <p className="text-xs text-ink-3">
              {results.length} result{results.length === 1 ? "" : "s"} for{" "}
              <span className="font-medium text-ink">“{query.trim()}”</span>
            </p>
          </div>
          <ul className="divide-y divide-line">
            {results.map((result) => {
              const Icon = ICONS[result.kind] ?? FileText;
              return (
                <li key={`${result.kind}-${result.id}`}>
                  <Link
                    href={result.url}
                    className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/50"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface-2 text-ink-3 transition-colors group-hover:text-accent">
                      <Icon size={14} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{result.title}</p>
                      {result.subtitle ? (
                        <p className="truncate text-[11px] text-ink-3">{result.subtitle}</p>
                      ) : null}
                    </div>
                    <Badge>{LABELS[result.kind] ?? result.kind}</Badge>
                    <ArrowUpRight
                      size={14}
                      className="shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
