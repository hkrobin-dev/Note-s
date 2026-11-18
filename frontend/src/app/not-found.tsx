export default function NotFound() {
  return (
    <div className="page-wrap py-24 flex flex-col items-center justify-center text-center">
      <div className="glass-elevated p-12 rounded-3xl border-b-0 border-r-0 max-w-md">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-xl font-bold text-ink tracking-tight">Page not found</h1>
        <p className="text-xs text-ink-3 mt-2">The page you are looking for does not exist.</p>
      </div>
    </div>
  );
}
