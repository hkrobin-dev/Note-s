/** Plays a short pleasant notification chime using Web Audio API (no external file needed). */
export function playNotificationSound() {
  if (typeof window === "undefined") return;

  const audioWindow = window as Window &
    typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const AudioCtx = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();

  const now = ctx.currentTime;

  // Main chime tone
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, now);
  osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.15);
  osc1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.2);

  // Soft harmonic
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1174.66, now);
  osc2.connect(ctx.destination);
  osc2.start(now);
  osc2.stop(now + 0.2);

  // Gentle decay via gain
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  ctx.close().catch(() => {});
}
