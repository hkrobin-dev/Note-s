import { GlassPanel } from "@/components/glass/GlassPanel";

/** Honest placeholder shell for modules not yet implemented — replaced per-phase. */
export function ModuleShell({ title, phase, children }: { title: string; phase: number; children?: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <GlassPanel className="px-6 py-10 text-center">
        <p className="text-ink-2">This module is scheduled for Phase {phase}. The UI foundation you&apos;re seeing is part of Phase 1.</p>
        {children}
      </GlassPanel>
    </div>
  );
}
