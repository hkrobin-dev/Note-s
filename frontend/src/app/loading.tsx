export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="glass rounded-2xl p-6 text-center">
        <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-ink-3">Loading…</p>
      </div>
    </div>
  );
}
