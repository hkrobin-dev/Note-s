"use client";

import { useEffect, useMemo, useState } from "react";

const PIN_HASH_KEY = "mylifeos_app_pin_hash";
const UNLOCKED_KEY = "mylifeos_unlocked";

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function PinLockGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const [mode, setMode] = useState<"enter" | "set1" | "set2">("enter");
  const [pin, setPin] = useState("");
  const [pinFirst, setPinFirst] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(PIN_HASH_KEY) : null;
    const isUnlocked = typeof window !== "undefined" ? sessionStorage.getItem(UNLOCKED_KEY) === "1" : false;
    setHasPin(!!stored);
    setUnlocked(isUnlocked);
    setMode(stored ? "enter" : "set1");
    setReady(true);
  }, []);

  const title = useMemo(() => {
    if (!hasPin) {
      if (mode === "set1") return "Set a 4-digit PIN";
      return "Confirm your PIN";
    }
    return "Enter PIN";
  }, [hasPin, mode]);

  function pressDigit(d: string) {
    setError(null);
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      void handleComplete(next);
    }
  }

  function backspace() {
    setError(null);
    setPin((p) => p.slice(0, -1));
  }

  async function handleComplete(value: string) {
    if (!hasPin) {
      if (mode === "set1") {
        setPinFirst(value);
        setPin("");
        setMode("set2");
        return;
      }
      // set2
      if (value !== pinFirst) {
        setError("PINs do not match. Try again.");
        setPin("");
        setPinFirst("");
        setMode("set1");
        return;
      }
      const hash = await sha256(value);
      localStorage.setItem(PIN_HASH_KEY, hash);
      sessionStorage.setItem(UNLOCKED_KEY, "1");
      setHasPin(true);
      setUnlocked(true);
      setPin("");
      return;
    }

    // enter mode
    const stored = localStorage.getItem(PIN_HASH_KEY) || "";
    const hash = await sha256(value);
    if (hash === stored) {
      sessionStorage.setItem(UNLOCKED_KEY, "1");
      setUnlocked(true);
      setPin("");
      setError(null);
    } else {
      setError("Incorrect PIN");
      setPin("");
    }
  }

  if (!ready) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-sm text-ink-3">Loading…</div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4 bg-[radial-gradient(1200px_600px_at_20%_0%,rgba(56,189,248,0.12),transparent_60%),radial-gradient(900px_500px_at_80%_10%,rgba(139,92,246,0.10),transparent_55%)]">
        <div className="w-full max-w-[360px]">
          <div className="glass rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] border border-white/10">
            <div className="text-center">
              <div className="mx-auto mb-3 h-11 w-11 rounded-2xl glass grid place-items-center text-accent font-semibold">🔒</div>
              <div className="text-xl font-semibold tracking-tight text-ink">{title}</div>
              <div className="mt-1 text-xs text-ink-3">
                {hasPin ? "Enter your 4-digit PIN to continue" : "Create a 4-digit PIN to lock this app"}
              </div>
            </div>

            <div className="mt-6 flex justify-center gap-4">
              {[0, 1, 2, 3].map((i) => {
                const filled = i < pin.length;
                return (
                  <div
                    key={i}
                    className={[
                      "h-3.5 w-3.5 rounded-full border transition-all duration-150",
                      filled ? "border-accent bg-accent scale-110 shadow-[0_0_0_6px_rgba(56,189,248,0.12)]" : "border-line/80 bg-transparent",
                    ].join(" ")}
                  />
                );
              })}
            </div>

            <div className={["mt-4 min-h-5 text-center text-xs", error ? "text-error" : "text-transparent"].join(" ")}>
              {error ?? "placeholder"}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, idx) => {
                if (k === "") return <div key={idx} aria-hidden="true" />;
                const isBack = k === "⌫";
                return (
                  <button
                    key={idx}
                    type="button"
                    className={[
                      "h-14 rounded-2xl border border-white/10 bg-white/5 backdrop-blur",
                      "hover:bg-white/10 active:scale-[0.98] transition",
                      "text-ink text-lg font-semibold select-none",
                      isBack ? "text-ink-2" : "",
                    ].join(" ")}
                    onClick={() => (isBack ? backspace() : pressDigit(k))}
                    aria-label={isBack ? "Backspace" : `Digit ${k}`}
                  >
                    {k}
                  </button>
                );
              })}
            </div>

            {!hasPin && (
              <div className="mt-5 text-[11px] leading-relaxed text-ink-3 text-center">
                Stored locally on this device (hashed). You can remove/change it in <span className="text-ink-2">Settings</span>.
              </div>
            )}
          </div>

          <div className="mt-4 text-center text-[11px] text-ink-3">
            My Life OS • Locked
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
