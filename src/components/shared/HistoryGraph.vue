<script setup lang="ts">
/**
 * Grafo del historial del expediente.
 *
 * Una linea por medidor (Beso / Cita / Noche) a lo largo de los analisis, con
 * marcadores de riesgo y un tooltip por punto que muestra la lectura de ese
 * analisis. Debajo, la "lectura de trayectoria": Alfii lee la serie completa
 * (pendiente, puntos de giro, siguiente jugada) — se cachea en el backend.
 *
 * SVG a mano: 3 series, <= 120 puntos, sin libreria. Eje unico 0-100.
 */
import { ref, computed, onMounted } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import AlfiiRichText from '@/components/shared/AlfiiRichText.vue';
import api from '@/services/http';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{ targetId: string; displayName: string }>();
const toastStore = useToastStore();

interface Point {
  analysisId: string;
  at: string;
  sourceType: 'screenshot' | 'text';
  meters: { kiss: number; firstDate: number; firstNight: number };
  riskLevel: string;
  archetype: string | null;
  lead: string;
  waitMinutes: number | null;
  messages: number;
}
interface Reading {
  trend: 'SUBE' | 'ESTABLE' | 'BAJA' | 'VOLATIL';
  headline: string;
  reading: string;
  turningPoints: { index: number; label: string }[];
  strengths: string[];
  risks: string[];
  nextMove: string;
  confidence: number;
}

const points = ref<Point[]>([]);
const loading = ref(true);
const reading = ref<Reading | null>(null);
const readingBusy = ref(false);
const hover = ref<number | null>(null);

// Paleta validada (dark, CVD-safe con leyenda + etiquetas directas).
const SERIES = [
  { key: 'kiss', label: 'Beso', color: '#ef4f70' },
  { key: 'firstDate', label: 'Cita', color: '#22a7cf' },
  { key: 'firstNight', label: 'Noche', color: '#c99a10' },
] as const;

const W = 640, H = 220, PAD = { l: 34, r: 16, t: 14, b: 30 };
const innerW = W - PAD.l - PAD.r;
const innerH = H - PAD.t - PAD.b;

const xOf = (i: number) => PAD.l + (points.value.length <= 1 ? innerW / 2 : (i / (points.value.length - 1)) * innerW);
const yOf = (v: number) => PAD.t + innerH - (Math.max(0, Math.min(100, v)) / 100) * innerH;

const paths = computed(() =>
  SERIES.map((s) => ({
    ...s,
    d: points.value.map((p, i) => `${i ? 'L' : 'M'}${xOf(i).toFixed(1)},${yOf(p.meters[s.key]).toFixed(1)}`).join(' '),
    last: points.value.length ? points.value[points.value.length - 1]!.meters[s.key] : 0,
  })),
);

const selected = computed(() => (hover.value == null ? null : points.value[hover.value] ?? null));
const RISK_BAD = new Set(['ALTO', 'CRITICO', 'ROJO']);

const delta = computed(() => {
  if (points.value.length < 2) return null;
  const a = points.value[0]!.meters, b = points.value[points.value.length - 1]!.meters;
  const avg = (m: Point['meters']) => (m.kiss + m.firstDate + m.firstNight) / 3;
  return Math.round(avg(b) - avg(a));
});

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
}

function onMove(e: MouseEvent | TouchEvent) {
  if (!points.value.length) return;
  const svg = (e.currentTarget as SVGSVGElement);
  const rect = svg.getBoundingClientRect();
  const clientX = 'touches' in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
  const x = ((clientX - rect.left) / rect.width) * W;
  let best = 0, bestD = Infinity;
  points.value.forEach((_, i) => { const d = Math.abs(xOf(i) - x); if (d < bestD) { bestD = d; best = i; } });
  hover.value = best;
}

async function load() {
  loading.value = true;
  try {
    const res: any = await api.get(`/targets/${props.targetId}/timeline`);
    points.value = res.points || [];
    hover.value = points.value.length ? points.value.length - 1 : null;
  } catch (err: any) {
    toastStore.show(err.message || 'No pude cargar el historial.', 'error');
  } finally {
    loading.value = false;
  }
}

async function readTrajectory(force = false) {
  if (readingBusy.value) return;
  readingBusy.value = true;
  try {
    const res: any = await api.post(`/targets/${props.targetId}/trajectory${force ? '?force=1' : ''}`);
    reading.value = res.reading;
  } catch (err: any) {
    toastStore.show(err.message || 'No pude leer la trayectoria.', 'error');
  } finally {
    readingBusy.value = false;
  }
}

const TREND_META: Record<Reading['trend'], { label: string; icon: string; cls: string }> = {
  SUBE: { label: 'Va subiendo', icon: 'arrowUp', cls: 'up' },
  ESTABLE: { label: 'Estable', icon: 'forward', cls: 'flat' },
  BAJA: { label: 'Va bajando', icon: 'arrowRight', cls: 'down' },
  VOLATIL: { label: 'Volátil', icon: 'bolt', cls: 'vol' },
};

const readingAsText = computed(() => {
  const r = reading.value;
  if (!r) return '';
  const tp = r.turningPoints.map((t) => `• Análisis #${t.index}: ${t.label}`).join('\n');
  const st = r.strengths.map((s) => `• ${s}`).join('\n');
  const rk = r.risks.map((s) => `• ${s}`).join('\n');
  return [
    r.reading,
    tp ? `**Puntos de giro**\n${tp}` : '',
    st ? `**A tu favor**\n${st}` : '',
    rk ? `**Ojo con**\n${rk}` : '',
    `➜ ${r.nextMove}`,
  ].filter(Boolean).join('\n\n');
});

onMounted(load);
</script>

<template>
  <section class="graph">
    <header class="g-head">
      <div>
        <span class="eyebrow">Historial · {{ points.length }} análisis</span>
        <h3>Cómo va con {{ displayName }}</h3>
      </div>
      <span v-if="delta !== null" class="delta" :class="{ up: delta > 0, down: delta < 0 }">
        <BaseIcon :name="delta >= 0 ? 'arrowUp' : 'arrowRight'" size="xs" color="cream" />
        {{ delta > 0 ? '+' : '' }}{{ delta }} pts desde el inicio
      </span>
    </header>

    <div v-if="loading" class="empty"><BaseIcon name="spinner" spin size="lg" color="muted" /></div>

    <div v-else-if="points.length < 1" class="empty">
      <BaseIcon name="history" size="lg" color="muted" />
      <p>Todavía no hay análisis. Sube una captura o el chat de WhatsApp y aquí verás la curva.</p>
    </div>

    <template v-else>
      <div class="legend" role="list">
        <span v-for="s in SERIES" :key="s.key" role="listitem">
          <i :style="{ background: s.color }"></i>{{ s.label }}
        </span>
        <span class="legend-risk"><i class="risk-dot"></i>Riesgo alto</span>
      </div>

      <div class="svg-wrap">
        <svg :viewBox="`0 0 ${W} ${H}`" class="chart" @mousemove="onMove" @touchmove.passive="onMove" @mouseleave="hover = points.length - 1">
          <!-- grid -->
          <g class="grid">
            <template v-for="v in [0, 25, 50, 75, 100]" :key="v">
              <line :x1="PAD.l" :x2="W - PAD.r" :y1="yOf(v)" :y2="yOf(v)" />
              <text :x="PAD.l - 6" :y="yOf(v) + 4">{{ v }}</text>
            </template>
          </g>
          <!-- fechas -->
          <g class="xaxis">
            <template v-for="(p, i) in points" :key="p.analysisId">
              <text v-if="points.length <= 8 || i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0" :x="xOf(i)" :y="H - 8" text-anchor="middle">{{ fmtDate(p.at) }}</text>
            </template>
          </g>
          <!-- cursor -->
          <line v-if="hover != null" class="cursor" :x1="xOf(hover)" :x2="xOf(hover)" :y1="PAD.t" :y2="PAD.t + innerH" />
          <!-- series -->
          <g v-for="s in paths" :key="s.key">
            <path :d="s.d" :stroke="s.color" class="line" />
            <circle v-for="(p, i) in points" :key="i" :cx="xOf(i)" :cy="yOf(p.meters[s.key])" :r="hover === i ? 5 : 3.5" :fill="s.color" class="dot" />
            <text :x="W - PAD.r + 2" :y="yOf(s.last) + 4" class="direct" :fill="s.color">{{ s.last }}</text>
          </g>
          <!-- riesgo -->
          <g v-for="(p, i) in points" :key="'r' + i">
            <polygon v-if="RISK_BAD.has(p.riskLevel)" class="risk-mark" :points="`${xOf(i)},${PAD.t - 2} ${xOf(i) - 5},${PAD.t + 7} ${xOf(i) + 5},${PAD.t + 7}`" />
          </g>
        </svg>
      </div>

      <div v-if="selected" class="tip">
        <div class="tip-head">
          <strong>Análisis #{{ (hover ?? 0) + 1 }}</strong>
          <span>{{ new Date(selected.at).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }}</span>
          <span class="chip">{{ selected.sourceType === 'text' ? 'Chat importado' : 'Captura' }} · {{ selected.messages }} msgs</span>
          <span class="chip" :class="{ bad: RISK_BAD.has(selected.riskLevel) }">Riesgo {{ selected.riskLevel }}</span>
          <span v-if="selected.archetype" class="chip">{{ selected.archetype }}</span>
        </div>
        <p class="tip-lead">{{ selected.lead }}</p>
        <div class="tip-meters">
          <span v-for="s in SERIES" :key="s.key"><i :style="{ background: s.color }"></i>{{ s.label }} <b>{{ selected.meters[s.key] }}</b></span>
          <span v-if="selected.waitMinutes != null"><BaseIcon name="timing" size="xs" color="muted" /> espera {{ selected.waitMinutes }} min</span>
        </div>
      </div>

      <!-- Lectura global -->
      <div class="reading">
        <div v-if="!reading" class="reading-cta">
          <div>
            <strong>Lectura de la trayectoria</strong>
            <p>Alfii lee los {{ points.length }} análisis como una sola historia: pendiente, puntos de giro y la jugada ahora.</p>
          </div>
          <button type="button" class="btn-primary" :disabled="readingBusy" @click="readTrajectory()">
            <BaseIcon v-if="readingBusy" name="spinner" spin size="sm" color="cream" />
            <BaseIcon v-else name="subtext" size="sm" color="cream" />
            <span>{{ readingBusy ? 'Leyendo…' : 'Leer trayectoria' }}</span>
          </button>
        </div>
        <template v-else>
          <div class="reading-head">
            <span class="trend" :class="TREND_META[reading.trend].cls">
              <BaseIcon :name="(TREND_META[reading.trend].icon as any)" size="xs" color="cream" />
              {{ TREND_META[reading.trend].label }}
            </span>
            <span class="conf">confianza {{ Math.round(reading.confidence * 100) }}%</span>
            <button type="button" class="refresh" :disabled="readingBusy" title="Volver a leer" @click="readTrajectory(true)">
              <BaseIcon :name="readingBusy ? 'spinner' : 'rotate'" :spin="readingBusy" size="xs" color="muted" />
            </button>
          </div>
          <h4>{{ reading.headline }}</h4>
          <AlfiiRichText :content="readingAsText" />
        </template>
      </div>
    </template>
  </section>
</template>

<style lang="scss" scoped>
.graph {
  @include stack(12px);
  padding: 14px 16px 16px;
  border-radius: 18px;
  background-color: rgba($alfii-plum, 0.55);
  border: 1px solid rgba($alfii-cream, 0.1);
}

.g-head {
  @include row(10px, flex-start, space-between);

  .eyebrow { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba($alfii-cream, 0.55); font-weight: $fw-bold; }
  h3 { font-family: var(--font-display); font-weight: 800; font-size: $fs-lg; letter-spacing: -0.02em; margin-top: 2px; }

  .delta {
    @include row(5px);
    padding: 5px 10px;
    border-radius: 999px;
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    border: 1px solid rgba($alfii-cream, 0.18);
    color: $alfii-cream;
    white-space: nowrap;
    &.up { background-color: rgba($alfii-sage, 0.2); border-color: rgba($alfii-sage, 0.5); }
    &.down { background-color: rgba($alfii-red, 0.2); border-color: rgba($alfii-red, 0.5); }
  }
}

.empty {
  @include stack(10px, center);
  padding: 28px 12px;
  text-align: center;
  p { font-size: $fs-xs; color: rgba($alfii-cream, 0.6); max-width: 360px; }
}

.legend {
  @include row(14px, center);
  flex-wrap: wrap;
  font-size: $fs-2xs;
  color: rgba($alfii-cream, 0.75);
  span { @include row(6px); }
  i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; }
  .risk-dot { width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 10px solid $alfii-red; border-radius: 0; }
}

.svg-wrap { width: 100%; overflow: hidden; }
.chart { width: 100%; height: auto; display: block; touch-action: pan-y; }

.grid line { stroke: rgba($alfii-cream, 0.08); stroke-width: 1; }
.grid text, .xaxis text { fill: rgba($alfii-cream, 0.45); font-size: 10px; text-anchor: end; }
.xaxis text { text-anchor: middle; }
.cursor { stroke: rgba($alfii-cream, 0.35); stroke-width: 1; stroke-dasharray: 3 3; }
.line { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.dot { stroke: $alfii-navy; stroke-width: 2; transition: r $dur-fast $ease-out; }
.direct { font-size: 11px; font-weight: 700; }
.risk-mark { fill: $alfii-red; }

.tip {
  @include stack(8px);
  padding: 12px 14px;
  border-radius: 14px;
  background-color: rgba($alfii-navy, 0.6);
  border: 1px solid rgba($alfii-cream, 0.1);

  .tip-head {
    @include row(8px, center);
    flex-wrap: wrap;
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.6);
    strong { color: $alfii-cream; }
  }
  .chip {
    padding: 3px 8px;
    border-radius: 999px;
    background-color: rgba($alfii-cream, 0.08);
    color: rgba($alfii-cream, 0.8);
    &.bad { background-color: rgba($alfii-red, 0.25); color: $alfii-cream; }
  }
  .tip-lead { font-size: $fs-xs; line-height: $lh-relaxed; color: $alfii-cream; }
  .tip-meters {
    @include row(14px, center);
    flex-wrap: wrap;
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.7);
    span { @include row(5px); }
    i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; }
    b { color: $alfii-cream; }
  }
}

.reading {
  @include stack(10px);
  padding: 14px;
  border-radius: 14px;
  background: linear-gradient(150deg, rgba($alfii-red, 0.14), rgba($alfii-plum, 0.3));
  border: 1px solid rgba($alfii-red, 0.35);

  .reading-cta {
    @include row(14px, center, space-between);
    flex-wrap: wrap;
    strong { font-size: $fs-sm; }
    p { font-size: $fs-2xs; color: rgba($alfii-cream, 0.65); max-width: 420px; margin-top: 2px; }
  }

  .btn-primary {
    @include row(8px, center, center);
    padding: 11px 16px;
    border-radius: 12px;
    background-color: $alfii-red;
    color: $alfii-cream;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    white-space: nowrap;
    &:disabled { opacity: 0.6; }
  }

  .reading-head {
    @include row(8px, center);
    .trend {
      @include row(5px);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: $fw-bold;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background-color: rgba($alfii-cream, 0.1);
      &.up { background-color: rgba($alfii-sage, 0.3); }
      &.down { background-color: rgba($alfii-red, 0.35); }
      &.vol { background-color: rgba(#c99a10, 0.35); }
    }
    .conf { font-size: $fs-2xs; color: rgba($alfii-cream, 0.55); }
    .refresh { margin-left: auto; padding: 6px; border-radius: 50%; background-color: rgba($alfii-cream, 0.06); }
  }

  h4 { font-family: var(--font-display); font-weight: 800; font-size: $fs-md; line-height: $lh-snug; letter-spacing: -0.01em; }
}
</style>
