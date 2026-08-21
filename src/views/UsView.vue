<script setup lang="ts">
/**
 * "Nosotros" (/chat/:id/nosotros): la relacion como un todo, a pantalla
 * completa.
 *
 * Arriba el score del vinculo con su evolucion; luego la dinamica, las areas
 * de mejora de EL con su estado respecto a la lectura anterior (eso es lo que
 * convierte esto en progreso y no en una foto), las senales de ella y la
 * siguiente jugada. Abajo, fotos de la salida: se suben aqui y Alfii lee como
 * les fue; quedan tambien en el hilo del chat.
 */
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import ExpedienteSidebar from '@/components/shared/ExpedienteSidebar.vue';
import AlfiiRichText from '@/components/shared/AlfiiRichText.vue';
import RiskBadge from '@/components/shared/RiskBadge.vue';
import api from '@/services/http';
import { useToastStore } from '@/stores/toast';

const route = useRoute();
const router = useRouter();
const toastStore = useToastStore();
const targetId = computed(() => (Array.isArray(route.params.id) ? route.params.id[0] : route.params.id) || '');

interface Improvement { area: string; advice: string; status: 'NUEVO' | 'MEJORO' | 'IGUAL' | 'EMPEORO' | 'LOGRADO' }
interface Reading {
  score: number; headline: string; dynamic: string; hisStrengths: string[];
  improvements: Improvement[]; herSignals: string[]; nextStep: string; confidence: number;
}
interface HistoryItem { generatedAt: string; score: number; headline: string }
interface PhotoItem { _id: string; imageUrl: string | null; createdAt: string; reading?: string }

const target = ref<any | null>(null);
const reading = ref<Reading | null>(null);
const previous = ref<Reading | null>(null);
const history = ref<HistoryItem[]>([]);
const generatedAt = ref<string | null>(null);
const loading = ref(true);
const readingBusy = ref(false);
const photos = ref<PhotoItem[]>([]);

const STATUS_META: Record<Improvement['status'], { label: string; cls: string; icon: string }> = {
  NUEVO: { label: 'Nuevo', cls: 'new', icon: 'plus' },
  MEJORO: { label: 'Mejoró', cls: 'up', icon: 'arrowUp' },
  IGUAL: { label: 'Igual', cls: 'flat', icon: 'forward' },
  EMPEORO: { label: 'Empeoró', cls: 'down', icon: 'risk' },
  LOGRADO: { label: 'Logrado', cls: 'done', icon: 'check' },
};

const delta = computed(() => {
  if (history.value.length < 2) return null;
  return Math.round(history.value[history.value.length - 1]!.score - history.value[history.value.length - 2]!.score);
});
const scoreTone = computed(() => {
  const s = reading.value?.score ?? 0;
  return s >= 70 ? 'good' : s >= 40 ? 'mid' : 'low';
});
const ring = computed(() => {
  const s = reading.value?.score ?? 0;
  const r = 54, c = 2 * Math.PI * r;
  return { r, c, off: c - (c * s) / 100 };
});

// Sparkline del historial de scores
const SW = 240, SH = 56;
const spark = computed(() => {
  const h = history.value;
  if (h.length < 2) return '';
  return h.map((p, i) => `${i ? 'L' : 'M'}${(i / (h.length - 1)) * SW},${SH - 4 - (p.score / 100) * (SH - 8)}`).join(' ');
});

function fmt(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function load() {
  loading.value = true;
  try {
    const [t, us, msgs]: any[] = await Promise.all([
      api.get(`/targets/${targetId.value}`),
      api.get(`/targets/${targetId.value}/us`),
      api.get(`/targets/${targetId.value}/messages`),
    ]);
    target.value = t.target;
    reading.value = us.reading;
    history.value = us.history || [];
    generatedAt.value = us.generatedAt;
    // Fotos: cada mensaje 'photo' + la lectura de Alfii que le sigue.
    const list: any[] = msgs.messages || [];
    const found: PhotoItem[] = [];
    list.forEach((m, i) => {
      if (m.kind !== 'photo') return;
      const next = list[i + 1];
      found.push({
        _id: String(m._id),
        imageUrl: m.imageUrl ?? null,
        createdAt: String(m.createdAt ?? ''),
        reading: next?.role === 'alfii' && next?.kind === 'text' ? String(next.content) : undefined,
      });
    });
    photos.value = found.reverse();
  } catch (err: any) {
    toastStore.show(err.message || 'No pude cargar Nosotros.', 'error');
  } finally {
    loading.value = false;
  }
}

async function generate(force = false) {
  if (readingBusy.value) return;
  readingBusy.value = true;
  try {
    const res: any = await api.post(`/targets/${targetId.value}/us${force ? '?force=1' : ''}`);
    reading.value = res.reading;
    previous.value = res.previous || null;
    history.value = res.history || history.value;
    generatedAt.value = res.generatedAt;
    if (res.cached) toastStore.show('Sin novedades desde la última lectura. Sube algo nuevo y vuelve a leer.', 'success');
  } catch (err: any) {
    toastStore.show(err.message || 'No pude leer el vínculo.', 'error');
  } finally {
    readingBusy.value = false;
  }
}

// ---------------------------------------------------------------------------
// Fotos
// ---------------------------------------------------------------------------
const photoInput = ref<HTMLInputElement | null>(null);
const photoNote = ref('');
const photoBusy = ref(false);
const dragOver = ref(false);
const pendingUrl = ref<string | null>(null);

function pickPhoto() { photoInput.value?.click(); }

async function onPhotoInput(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  if (f) await uploadPhoto(f);
  input.value = '';
}
async function onDrop(e: DragEvent) {
  dragOver.value = false;
  const f = e.dataTransfer?.files?.[0];
  if (f) await uploadPhoto(f);
}

async function uploadPhoto(file: File) {
  if (!file.type.startsWith('image/')) { toastStore.show('Necesito una imagen (JPG, PNG, WEBP o HEIC).', 'error'); return; }
  if (file.size > 8 * 1024 * 1024) { toastStore.show('La foto pesa más de 8 MB.', 'error'); return; }
  photoBusy.value = true;
  pendingUrl.value = URL.createObjectURL(file);
  try {
    const fd = new FormData();
    fd.append('screenshot', file);
    if (photoNote.value.trim()) fd.append('note', photoNote.value.trim());
    const res: any = await api.post(`/targets/${targetId.value}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    photos.value.unshift({ _id: res.photoMessageId, imageUrl: res.imageUrl || pendingUrl.value, createdAt: new Date().toISOString(), reading: res.text });
    photoNote.value = '';
    toastStore.show('Foto leída. También quedó en el chat.', 'success');
  } catch (err: any) {
    toastStore.show(err.message || 'No pude leer la foto.', 'error');
  } finally {
    photoBusy.value = false;
    pendingUrl.value = null;
  }
}

onMounted(load);
watch(targetId, load);
</script>

<template>
  <div class="us-view">
    <ExpedienteSidebar class="desktop-only" :active-id="targetId" />

    <div class="us-column">
      <header class="us-header">
        <button class="back-btn" type="button" @click="router.push(`/chat/${targetId}`)">
          <BaseIcon name="back" size="sm" color="cream" />
        </button>
        <div class="us-header__text">
          <h1>Nosotros</h1>
          <span class="sub">{{ target ? `Tú y ${target.displayName}` : 'Cargando…' }}<template v-if="generatedAt"> · última lectura {{ fmt(generatedAt) }}</template></span>
        </div>
        <RiskBadge v-if="target" :level="(target.risk?.level as any) || 'LIMPIO'" />
        <button class="gen-btn" type="button" :disabled="readingBusy || loading" @click="generate(!!reading)">
          <BaseIcon :name="readingBusy ? 'spinner' : (reading ? 'rotate' : 'subtext')" :spin="readingBusy" size="xs" color="cream" />
          <span>{{ readingBusy ? 'Leyendo…' : reading ? 'Volver a leer' : 'Leer el vínculo' }}</span>
        </button>
      </header>

      <div class="us-scroll">
        <div v-if="loading" class="us-loading"><BaseIcon name="spinner" spin size="lg" color="muted" /></div>

        <div v-else class="us-body">
          <!-- Sin lectura todavia -->
          <section v-if="!reading" class="empty-hero">
            <div class="empty-mark">
              <span>{{ (target?.displayName || '?').charAt(0) }}</span><i>+</i><span>tú</span>
            </div>
            <h2>Alfii todavía no ha leído el vínculo</h2>
            <p>Con todo lo que hay en el expediente (capturas, chat importado, conversación, hitos y fotos), Alfii arma una lectura de ustedes dos: cómo van, qué haces bien, qué mejorar y la siguiente jugada. Cada lectura se guarda y la siguiente marca qué mejoró.</p>
            <button class="btn-primary" type="button" :disabled="readingBusy" @click="generate()">
              <BaseIcon :name="readingBusy ? 'spinner' : 'subtext'" :spin="readingBusy" size="sm" color="cream" />
              <span>{{ readingBusy ? 'Leyendo el expediente…' : 'Leer el vínculo ahora' }}</span>
            </button>
          </section>

          <template v-else>
            <!-- Hero: score + headline + evolucion -->
            <section class="hero" :class="scoreTone">
              <div class="ring-wrap">
                <svg viewBox="0 0 128 128" class="ring">
                  <circle cx="64" cy="64" :r="ring.r" class="track" />
                  <circle cx="64" cy="64" :r="ring.r" class="fill" :stroke-dasharray="ring.c" :stroke-dashoffset="ring.off" />
                </svg>
                <div class="ring-num"><strong>{{ Math.round(reading.score) }}</strong><small>vínculo</small></div>
              </div>
              <div class="hero-text">
                <span class="eyebrow">Lectura de nosotros · confianza {{ Math.round(reading.confidence * 100) }}%</span>
                <h2>{{ reading.headline }}</h2>
                <div class="hero-meta">
                  <span v-if="delta !== null" class="delta" :class="{ up: delta > 0, down: delta < 0 }">
                    <BaseIcon :name="delta >= 0 ? 'arrowUp' : 'arrowRight'" size="xs" color="cream" />{{ delta > 0 ? '+' : '' }}{{ delta }} vs lectura anterior
                  </span>
                  <span class="count">{{ history.length }} {{ history.length === 1 ? 'lectura' : 'lecturas' }} guardadas</span>
                </div>
                <svg v-if="spark" :viewBox="`0 0 ${SW} ${SH}`" class="spark" aria-label="Evolución del vínculo">
                  <path :d="spark" />
                  <circle v-for="(p, i) in history" :key="i" :cx="(i / (history.length - 1)) * SW" :cy="SH - 4 - (p.score / 100) * (SH - 8)" r="3.5" />
                </svg>
              </div>
            </section>

            <div class="grid">
              <!-- Dinamica -->
              <section class="card span2">
                <h3><BaseIcon name="subtext" size="xs" color="sage" /> La dinámica entre ustedes</h3>
                <p class="prose">{{ reading.dynamic }}</p>
              </section>

              <!-- Mejoras con estado -->
              <section class="card span2">
                <h3><BaseIcon name="bolt" size="xs" color="red" /> Tus mejoras <small>marcadas contra la lectura anterior</small></h3>
                <ul class="improvements">
                  <li v-for="im in reading.improvements" :key="im.area" :class="STATUS_META[im.status].cls">
                    <span class="status"><BaseIcon :name="(STATUS_META[im.status].icon as any)" size="xs" color="cream" /> {{ STATUS_META[im.status].label }}</span>
                    <div class="im-text">
                      <strong>{{ im.area }}</strong>
                      <p>{{ im.advice }}</p>
                    </div>
                  </li>
                </ul>
              </section>

              <section class="card">
                <h3><BaseIcon name="check" size="xs" color="sage" /> Lo que haces bien</h3>
                <ul class="plain"><li v-for="s in reading.hisStrengths" :key="s">{{ s }}</li></ul>
              </section>

              <section class="card">
                <h3><BaseIcon name="archetype" size="xs" color="sage" /> Señales de {{ target?.displayName }}</h3>
                <ul class="plain"><li v-for="s in reading.herSignals" :key="s">{{ s }}</li></ul>
              </section>

              <section class="card next span2">
                <BaseIcon name="bolt" size="sm" color="cream" />
                <div><span class="eyebrow">Siguiente jugada</span><p>{{ reading.nextStep }}</p></div>
              </section>
            </div>
          </template>

          <!-- Fotos -->
          <section class="photos">
            <header class="ph-head">
              <div>
                <span class="eyebrow">Fotos de la salida</span>
                <h3>Sube una foto y Alfii lee cómo les fue</h3>
              </div>
            </header>

            <input ref="photoInput" type="file" accept="image/*" class="hidden" @change="onPhotoInput" />
            <div class="ph-uploader">
              <div
                class="ph-drop"
                :class="{ over: dragOver, busy: photoBusy }"
                role="button"
                tabindex="0"
                @click="pickPhoto"
                @keydown.enter.prevent="pickPhoto"
                @dragover.prevent="dragOver = true"
                @dragleave="dragOver = false"
                @drop.prevent="onDrop"
              >
                <img v-if="pendingUrl" :src="pendingUrl" alt="" class="ph-pending" />
                <template v-else>
                  <span class="ph-icon"><BaseIcon name="image" size="lg" color="cream" /></span>
                  <strong>Arrastra o toca para subir</strong>
                  <p>De ustedes dos, del lugar, de la mesa… Alfii lee lenguaje corporal, cercanía y energía.</p>
                </template>
                <span v-if="photoBusy" class="ph-scan"><i></i><b><BaseIcon name="spinner" spin size="xs" color="cream" /> Leyendo la foto…</b></span>
              </div>
              <textarea v-model="photoNote" rows="2" maxlength="400" placeholder="Contexto opcional: “fue la segunda cita, ella eligió el lugar”"></textarea>
            </div>

            <div v-if="photos.length" class="ph-list">
              <article v-for="p in photos" :key="p._id" class="ph-item">
                <div class="ph-img"><img v-if="p.imageUrl" :src="p.imageUrl" alt="Foto de la salida" loading="lazy" /><span v-else class="ph-noimg"><BaseIcon name="image" size="lg" color="muted" /></span></div>
                <div class="ph-read">
                  <span class="when">{{ fmt(p.createdAt) }}</span>
                  <AlfiiRichText v-if="p.reading" :content="p.reading" />
                  <p v-else class="muted">Sin lectura guardada.</p>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.us-view { @include row(0, stretch); height: 100dvh; width: 100%; }
.desktop-only { display: none !important; }
@media (min-width: 1024px) { .desktop-only { display: flex !important; } }
.us-column { @include stack(0); flex: 1; min-width: 0; height: 100%; }
.hidden { display: none; }

$pad: clamp(16px, 3vw, 32px);

.us-header {
  @include row(12px, center);
  flex: 0 0 auto;
  padding: 12px $pad;
  background-color: rgba($alfii-plum, 0.9);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba($alfii-cream, 0.08);
  .back-btn { padding: 6px; }
  &__text { @include stack(2px); flex: 1; min-width: 0; h1 { font-size: $fs-md; font-weight: $fw-bold; } .sub { font-size: $fs-2xs; color: rgba($alfii-cream, 0.6); } }
  .gen-btn {
    @include row(6px);
    padding: 9px 14px;
    border-radius: 999px;
    background-color: $alfii-red;
    color: $alfii-cream;
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    white-space: nowrap;
    &:disabled { opacity: 0.6; }
  }
}

.us-scroll { @include scroll-y; flex: 1; min-height: 0; padding: 20px $pad 48px; }
.us-loading { @include center; padding: 80px 0; }
.us-body { @include stack(22px); max-width: 1100px; margin: 0 auto; }
.eyebrow { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: $fw-bold; color: rgba($alfii-cream, 0.55); }

.empty-hero {
  @include stack(14px, center);
  text-align: center;
  padding: clamp(28px, 6vw, 56px) 20px;
  border-radius: 24px;
  background: radial-gradient(70% 60% at 50% 0%, rgba($alfii-red, 0.2), transparent 70%), rgba($alfii-plum, 0.5);
  border: 1px solid rgba($alfii-cream, 0.1);
  .empty-mark {
    @include row(10px, center);
    span { @include center; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, $alfii-red, #ff3b5c); font-family: var(--font-display); font-weight: 800; font-size: $fs-lg; }
    span:last-child { background: linear-gradient(135deg, $alfii-sage, #7fc29b); font-size: $fs-sm; }
    i { font-style: normal; font-size: $fs-xl; color: rgba($alfii-cream, 0.5); }
  }
  h2 { font-family: var(--font-display); font-weight: 800; font-size: clamp(22px, 3.4vw, 30px); letter-spacing: -0.02em; }
  p { max-width: 560px; font-size: $fs-xs; line-height: $lh-relaxed; color: rgba($alfii-cream, 0.7); }
}

.btn-primary {
  @include row(8px, center, center);
  padding: 14px 22px;
  border-radius: 14px;
  background-color: $alfii-red;
  color: $alfii-cream;
  font-size: $fs-sm;
  font-weight: $fw-bold;
  box-shadow: 0 6px 22px rgba($alfii-red, 0.4);
  &:disabled { opacity: 0.6; }
}

.hero {
  @include row(clamp(16px, 3vw, 32px), center);
  flex-wrap: wrap;
  padding: clamp(18px, 3vw, 28px);
  border-radius: 24px;
  border: 1px solid rgba($alfii-cream, 0.12);
  background: radial-gradient(60% 80% at 0% 50%, rgba($alfii-red, 0.22), transparent 70%), rgba($alfii-plum, 0.55);
  &.good { --ring: #{$alfii-sage}; }
  &.mid { --ring: #c99a10; }
  &.low { --ring: #{$alfii-red}; }

  .ring-wrap { position: relative; width: 128px; height: 128px; flex-shrink: 0; }
  .ring { width: 100%; height: 100%; transform: rotate(-90deg); }
  .track { fill: none; stroke: rgba($alfii-cream, 0.1); stroke-width: 10; }
  .fill { fill: none; stroke: var(--ring); stroke-width: 10; stroke-linecap: round; transition: stroke-dashoffset 1.1s $ease-out; filter: drop-shadow(0 0 8px var(--ring)); }
  .ring-num { position: absolute; inset: 0; @include stack(0, center); justify-content: center; strong { font-family: var(--font-display); font-weight: 800; font-size: 34px; line-height: 1; } small { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba($alfii-cream, 0.55); } }

  .hero-text { @include stack(8px); flex: 1; min-width: 240px; }
  h2 { font-family: var(--font-display); font-weight: 800; font-size: clamp(22px, 3vw, 30px); line-height: $lh-tight; letter-spacing: -0.02em; }
  .hero-meta { @include row(10px, center); flex-wrap: wrap; font-size: $fs-2xs; color: rgba($alfii-cream, 0.6); }
  .delta { @include row(4px); padding: 4px 10px; border-radius: 999px; border: 1px solid rgba($alfii-cream, 0.2); color: $alfii-cream; font-weight: $fw-bold; &.up { background-color: rgba($alfii-sage, 0.25); } &.down { background-color: rgba($alfii-red, 0.25); } }
  .spark { width: 240px; max-width: 100%; height: 56px; path { fill: none; stroke: var(--ring); stroke-width: 2; } circle { fill: var(--ring); stroke: $alfii-navy; stroke-width: 2; } }
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  @media (min-width: 820px) { grid-template-columns: 1fr 1fr; .span2 { grid-column: span 2; } }
}

.card {
  @include stack(12px);
  padding: 18px 20px;
  border-radius: 18px;
  background-color: rgba($alfii-plum, 0.5);
  border: 1px solid rgba($alfii-cream, 0.1);
  h3 { @include row(8px); font-size: $fs-sm; font-weight: $fw-bold; small { font-weight: $fw-normal; font-size: $fs-2xs; color: rgba($alfii-cream, 0.5); } }
  .prose { font-size: $fs-sm; line-height: $lh-relaxed; color: rgba($alfii-cream, 0.9); }
  .plain { @include stack(8px); padding-left: 0; list-style: none; li { position: relative; padding-left: 18px; font-size: $fs-xs; line-height: $lh-relaxed; color: rgba($alfii-cream, 0.85); &::before { content: ''; position: absolute; left: 2px; top: 0.6em; width: 7px; height: 7px; border-radius: 50%; background-color: $alfii-sage; } } }
  &.next { @include row(12px, flex-start); background: linear-gradient(135deg, rgba($alfii-red, 0.25), rgba($alfii-plum, 0.6)); border-color: rgba($alfii-red, 0.45); p { font-size: $fs-md; font-weight: $fw-bold; line-height: $lh-snug; margin-top: 2px; } }
}

.improvements {
  @include stack(8px);
  list-style: none;
  padding: 0;
  li {
    @include row(12px, flex-start);
    padding: 12px 14px;
    border-radius: 14px;
    background-color: rgba($alfii-navy, 0.45);
    border: 1px solid rgba($alfii-cream, 0.1);
    border-left-width: 3px;
    &.new { border-left-color: #22a7cf; }
    &.up { border-left-color: $alfii-sage; }
    &.flat { border-left-color: rgba($alfii-cream, 0.35); }
    &.down { border-left-color: $alfii-red; }
    &.done { border-left-color: #c99a10; opacity: 0.8; .im-text strong { text-decoration: line-through; } }
    .status { @include row(4px); flex-shrink: 0; padding: 4px 9px; border-radius: 999px; font-size: 10px; font-weight: $fw-bold; letter-spacing: 0.08em; text-transform: uppercase; background-color: rgba($alfii-cream, 0.1); margin-top: 2px; }
    &.new .status { background-color: rgba(#22a7cf, 0.3); }
    &.up .status { background-color: rgba($alfii-sage, 0.35); }
    &.down .status { background-color: rgba($alfii-red, 0.4); }
    &.done .status { background-color: rgba(#c99a10, 0.35); }
    .im-text { @include stack(3px); strong { font-size: $fs-sm; } p { font-size: $fs-xs; line-height: $lh-relaxed; color: rgba($alfii-cream, 0.75); } }
  }
}

.photos {
  @include stack(14px);
  padding: 18px 20px 22px;
  border-radius: 20px;
  border: 1px solid rgba($alfii-cream, 0.1);
  background-color: rgba($alfii-plum, 0.35);
  .ph-head h3 { font-family: var(--font-display); font-weight: 800; font-size: $fs-lg; letter-spacing: -0.01em; margin-top: 2px; }
}

.ph-uploader {
  display: grid;
  gap: 10px;
  @media (min-width: 820px) { grid-template-columns: 1.4fr 1fr; align-items: stretch; }
  textarea { width: 100%; min-height: 100%; padding: 12px 14px; border-radius: 14px; background-color: rgba($alfii-cream, 0.04); border: 1px solid rgba($alfii-cream, 0.14); color: $alfii-cream; font-size: $fs-xs; resize: vertical; &:focus { outline: none; border-color: $alfii-sage; } }
}

.ph-drop {
  @include stack(6px, center);
  position: relative;
  min-height: 150px;
  padding: 22px 18px;
  border-radius: 16px;
  border: 2px dashed rgba($alfii-cream, 0.25);
  background-color: rgba($alfii-cream, 0.03);
  text-align: center;
  cursor: pointer;
  overflow: hidden;
  transition: border-color $dur-fast $ease-out, background-color $dur-fast $ease-out;
  &:hover, &.over { border-color: $alfii-sage; background-color: rgba($alfii-sage, 0.08); }
  &.busy { pointer-events: none; }
  .ph-icon { @include center; width: 48px; height: 48px; border-radius: 50%; background-color: rgba($alfii-red, 0.2); border: 1px solid rgba($alfii-red, 0.4); }
  strong { font-size: $fs-sm; }
  p { font-size: $fs-2xs; color: rgba($alfii-cream, 0.55); max-width: 360px; }
  .ph-pending { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: saturate(0.7) brightness(0.7); }
  .ph-scan { position: absolute; inset: 0; i { position: absolute; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, $alfii-sage, transparent); box-shadow: 0 0 14px $alfii-sage; animation: scan 1.8s $ease-in-out infinite; } b { position: absolute; left: 12px; bottom: 12px; @include row(6px); padding: 5px 10px; border-radius: 999px; background-color: rgba($alfii-navy, 0.85); font-size: 11px; font-weight: $fw-semibold; } }
}
@keyframes scan { 0% { top: 0; } 50% { top: calc(100% - 2px); } 100% { top: 0; } }

.ph-list { @include stack(12px); }
.ph-item {
  display: grid;
  gap: 14px;
  padding: 12px;
  border-radius: 16px;
  background-color: rgba($alfii-navy, 0.45);
  border: 1px solid rgba($alfii-cream, 0.1);
  @media (min-width: 720px) { grid-template-columns: 260px 1fr; }
  .ph-img { border-radius: 12px; overflow: hidden; background-color: #000; aspect-ratio: 4 / 3; img { width: 100%; height: 100%; object-fit: cover; display: block; } .ph-noimg { @include center; height: 100%; } }
  .ph-read { @include stack(8px); .when { font-size: 11px; color: rgba($alfii-cream, 0.5); } .muted { font-size: $fs-2xs; color: rgba($alfii-cream, 0.5); } }
}
</style>
