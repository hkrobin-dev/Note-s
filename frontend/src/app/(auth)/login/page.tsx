"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Login failed");
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  }

  return (
    <main className="page-wrap flex min-h-dvh items-center justify-center py-16">
      <form onSubmit={submit} className="glass-elevated w-full max-w-sm rounded-3xl p-8">
        <div className="mb-6 text-center">
          <div className="text-3xl">🌿</div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-ink">Welcome back</h1>
          <p className="mt-1 text-xs text-ink-3">Sign in to your My Life OS workspace</p>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Email</span>
          <input
            className="input-glass w-full"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Password</span>
          <input
            className="input-glass w-full"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </label>

        {error && <p className="mb-4 text-xs text-error">{error}</p>}

        <button className="btn-primary w-full" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="mt-5 text-center text-xs text-ink-3">
          No account?{" "}
          <Link href="/register" className="text-accent-ink underline underline-offset-2">
            Create one
          </Link>
        </p>
      </form>
    </main>
  );
}
