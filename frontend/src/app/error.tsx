"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-6">
      <div className="glass rounded-2xl p-8 text-center max-w-md w-full">
        <RefreshCw size={28} className="text-accent mb-3" />
        <h2 className="text-lg font-bold text-ink">Something went wrong</h2>
        <p className="text-xs text-ink-3 mb-4">We ran into an issue while loading this page.</p>
        <button
          onClick={() => reset()}
          className="btn-primary text-sm w-full mb-3"
        >
          <RefreshCw size={14} className="mr-2" /> Try again
        </button>
        <Link href="/" className="btn-ghost text-sm w-full">
          <ArrowLeft size={14} className="mr-2" /> Back to home
        </Link>
        {showDetails && <pre className="mt-4 text-[10px] text-ink-3 overflow-auto max-h-40">{error.message}</pre>}
        {!showDetails && (
          <button
            onClick={() => setShowDetails(true)}
            className="text-[10px] text-accent underline underline-offset-4 mt-2 hover:text-accent-2"
          >
            Show details
          </button>
        )}
      </div>
    </div>
  );
}
