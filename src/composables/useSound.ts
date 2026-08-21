/**
 * Sonido de interfaz, sintetizado con WebAudio (sin archivos, sin red).
 *
 * Cada interaccion tiene su firma: enviar es un tic seco, recibir un acorde
 * calido de dos notas, un analisis listo una triada que sube, un hito una
 * fanfarria corta, error un golpe grave. Se respeta el interruptor del
 * usuario (localStorage) y la politica de autoplay: el AudioContext se crea
 * en el primer gesto y se reanuda si el navegador lo suspendio.
 */
import { ref } from 'vue';

export type SoundName =
  | 'send'
  | 'receive'
  | 'typing'
  | 'analysis'
  | 'milestone'
  | 'copy'
  | 'upload'
  | 'success'
  | 'error'
  | 'open'
  | 'close';

const STORAGE_KEY = 'alfii_sound';
const enabled = ref(localStorage.getItem(STORAGE_KEY) !== 'off');
let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Desbloqueo en el primer gesto: sin esto Safari/Chrome silencian todo. */
function unlock() {
  if (unlocked) return;
  unlocked = true;
  const c = getCtx();
  if (!c) return;
  const buffer = c.createBuffer(1, 1, 22050);
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.connect(c.destination);
  src.start(0);
}
if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) {
    window.addEventListener(ev, unlock, { once: true, passive: true });
  }
}

interface Note {
  freq: number;
  at: number; // s desde el inicio
  dur: number; // s
  gain?: number;
  type?: OscillatorType;
}

function play(notes: Note[], master = 0.16) {
  if (!enabled.value) return;
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime;
  const out = c.createGain();
  out.gain.value = master;
  out.connect(c.destination);
  for (const n of notes) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.setValueAtTime(n.freq, t0 + n.at);
    g.gain.setValueAtTime(0.0001, t0 + n.at);
    g.gain.exponentialRampToValueAtTime(n.gain ?? 1, t0 + n.at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur);
    osc.connect(g);
    g.connect(out);
    osc.start(t0 + n.at);
    osc.stop(t0 + n.at + n.dur + 0.02);
  }
}

const LIB: Record<SoundName, () => void> = {
  send: () => play([{ freq: 880, at: 0, dur: 0.08, type: 'triangle' }, { freq: 1320, at: 0.05, dur: 0.09, type: 'triangle', gain: 0.6 }], 0.12),
  receive: () => play([{ freq: 660, at: 0, dur: 0.16 }, { freq: 990, at: 0.09, dur: 0.22 }], 0.14),
  typing: () => play([{ freq: 520, at: 0, dur: 0.05, type: 'triangle', gain: 0.5 }], 0.06),
  analysis: () => play([
    { freq: 523, at: 0, dur: 0.18 },
    { freq: 659, at: 0.1, dur: 0.18 },
    { freq: 784, at: 0.2, dur: 0.3 },
    { freq: 1047, at: 0.32, dur: 0.45, gain: 0.8 },
  ], 0.15),
  milestone: () => play([
    { freq: 523, at: 0, dur: 0.14, type: 'triangle' },
    { freq: 659, at: 0.12, dur: 0.14, type: 'triangle' },
    { freq: 784, at: 0.24, dur: 0.14, type: 'triangle' },
    { freq: 1047, at: 0.36, dur: 0.5, type: 'triangle' },
    { freq: 1319, at: 0.36, dur: 0.5, type: 'sine', gain: 0.5 },
  ], 0.17),
  copy: () => play([{ freq: 1200, at: 0, dur: 0.05, type: 'square', gain: 0.35 }, { freq: 1600, at: 0.04, dur: 0.06, type: 'square', gain: 0.25 }], 0.08),
  upload: () => play([{ freq: 440, at: 0, dur: 0.1, type: 'triangle' }, { freq: 660, at: 0.08, dur: 0.12, type: 'triangle' }, { freq: 880, at: 0.16, dur: 0.18, type: 'triangle' }], 0.12),
  success: () => play([{ freq: 784, at: 0, dur: 0.12 }, { freq: 1175, at: 0.1, dur: 0.28 }], 0.13),
  error: () => play([{ freq: 220, at: 0, dur: 0.18, type: 'sawtooth', gain: 0.6 }, { freq: 165, at: 0.12, dur: 0.28, type: 'sawtooth', gain: 0.5 }], 0.1),
  open: () => play([{ freq: 740, at: 0, dur: 0.08, type: 'triangle', gain: 0.5 }], 0.07),
  close: () => play([{ freq: 520, at: 0, dur: 0.08, type: 'triangle', gain: 0.5 }], 0.07),
};

function haptic(pattern: number | number[]) {
  try {
    if (enabled.value && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch { /* sin soporte */ }
}

export function useSound() {
  function sound(name: SoundName) {
    try {
      LIB[name]?.();
      if (name === 'milestone') haptic([20, 40, 20, 40, 60]);
      else if (name === 'analysis') haptic([15, 30, 30]);
      else if (name === 'error') haptic(50);
      else if (name === 'receive' || name === 'success') haptic(12);
    } catch { /* el sonido nunca rompe la UI */ }
  }
  function setEnabled(v: boolean) {
    enabled.value = v;
    localStorage.setItem(STORAGE_KEY, v ? 'on' : 'off');
    if (v) sound('success');
  }
  return { sound, enabled, setEnabled };
}
