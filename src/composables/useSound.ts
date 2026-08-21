/**
 * Sonido de interfaz sobre cuelume (https://cuelume-site.pages.dev/docs/).
 *
 * Cada interaccion de la app se nombra por su significado (send, receive,
 * milestone...) y aqui se traduce al catalogo de cuelume. Asi cambiar "que
 * suena al recibir" es tocar una linea. cuelume no persiste volumen ni
 * encendido: eso vive en localStorage y se aplica al arrancar. Tambien
 * vibra en movil en los momentos grandes.
 */
import { ref, watch } from 'vue';
import { bind, play, setEnabled as cueEnabled, setVolume as cueVolume, type SoundName as CueName } from 'cuelume';

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
  | 'close'
  | 'arrival';

const MAP: Record<SoundName, { cue: CueName; volume?: number; haptic?: number | number[] }> = {
  send: { cue: 'release' },
  receive: { cue: 'chime', haptic: 12 },
  typing: { cue: 'tick', volume: 0.5 },
  analysis: { cue: 'ready', haptic: [15, 30, 30] },
  milestone: { cue: 'sparkle', haptic: [20, 40, 20, 40, 60] },
  copy: { cue: 'droplet' },
  upload: { cue: 'loading' },
  success: { cue: 'success', haptic: 12 },
  error: { cue: 'error', haptic: 50 },
  open: { cue: 'bloom', volume: 0.6 },
  close: { cue: 'whisper', volume: 0.6 },
  arrival: { cue: 'arrival', volume: 0.7 },
};

const KEY_ON = 'alfii_sound';
const KEY_VOL = 'alfii_sound_volume';

const enabled = ref(localStorage.getItem(KEY_ON) !== 'off');
const volume = ref(clamp(Number(localStorage.getItem(KEY_VOL) ?? 0.8)));

function clamp(v: number) {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.8;
}

// Estado inicial + delegacion de data-cuelume-* en todo el documento (hover,
// press, release, toggle sobre cualquier elemento marcado; idempotente).
cueEnabled(enabled.value);
cueVolume(volume.value);
if (typeof document !== 'undefined') bind();

watch(enabled, (v) => {
  cueEnabled(v);
  localStorage.setItem(KEY_ON, v ? 'on' : 'off');
});
watch(volume, (v) => {
  cueVolume(v);
  localStorage.setItem(KEY_VOL, String(v));
});

function haptic(pattern: number | number[]) {
  try {
    if (enabled.value && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch { /* sin soporte */ }
}

export function useSound() {
  function sound(name: SoundName) {
    if (!enabled.value) return;
    const m = MAP[name];
    try {
      play(m.cue, m.volume != null ? { volume: m.volume } : undefined);
      if (m.haptic) haptic(m.haptic);
    } catch { /* el sonido nunca rompe la UI */ }
  }
  function setEnabled(v: boolean) {
    enabled.value = v;
    if (v) sound('success');
  }
  function setVolume(v: number) {
    volume.value = clamp(v);
  }
  return { sound, enabled, volume, setEnabled, setVolume };
}
