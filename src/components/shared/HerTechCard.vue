<script setup lang="ts">
/**
 * Ficha tecnica de ella: carta de personaje con todo lo que el expediente
 * sabe de la chica. Misma familia visual que PowerCard (la carta del usuario):
 * nivel, clase, seis stats con barra, y los bloques de juego (le gusta,
 * evitar, odia, su jugada, como se gana).
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import StatBar from '@/components/shared/StatBar.vue';
import api from '@/services/http';
import type { IconName } from '@/config/icons';

export type HerStatKey = 'AFE' | 'EXI' | 'INI' | 'JUE' | 'RIE' | 'RIT';

export interface HerCard {
  level: number;
  tagline: string;
  stats: { key: HerStatKey; label: string; value: number; hint: string }[];
  likes: string[];
  avoid: string[];
  hates: string[];
  winConditions: string[];
  specialMove: { name: string; description: string } | null;
  confidence: number;
  archetype: { primary: string; label: string } | null;
  generatedAt: string;
  version: number;
  stale: boolean;
}

const props = defineProps<{
  targetId: string;
  displayName: string;
  avatarInitial?: string;
  accentColor?: string;
  riskLevel?: string;
  herAge?: number | null;
  herOccupation?: string | null;
  /** Cambia cuando el expediente cambia: dispara la recarga de la ficha. */
  version?: number;
}>();

const card = ref<HerCard | null>(null);
const loading = ref(false);
const reason = ref<string | null>(null);
const hintAbierto = ref<HerStatKey | null>(null);

const ICONO_POR_STAT: Record<HerStatKey, IconName> = {
  AFE: 'handHoldingHeart',
  EXI: 'gavel',
  INI: 'bolt',
  JUE: 'subtext',
  RIE: 'risk',
  RIT: 'timing',
};

// ---------- conteo animado (misma receta que PowerCard) ----------
const valoresVisibles = ref<Record<string, number>>({});
const levelVisible = ref(0);
let rafId = 0;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function animar(): void {
  if (rafId) cancelAnimationFrame(rafId);
  const c = card.value;
  if (!c) return;
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const hasta: Record<string, number> = {};
  for (const s of c.stats) hasta[s.key] = s.value;
  if (reduce) {
    valoresVisibles.value = hasta;
    levelVisible.value = c.level;
    return;
  }
  const inicio = performance.now();
  const paso = (ahora: number) => {
    const e = easeOutCubic(Math.min(1, (ahora - inicio) / 900));
    const next: Record<string, number> = {};
    for (const k of Object.keys(hasta)) next[k] = Math.round((hasta[k] ?? 0) * e);
    valoresVisibles.value = next;
    levelVisible.value = Math.round(c.level * e);
    if (e < 1) rafId = requestAnimationFrame(paso);
    else rafId = 0;
  };
  rafId = requestAnimationFrame(paso);
}

const columnaIzq = computed(() => card.value?.stats.slice(0, 3) ?? []);
const columnaDer = computed(() => card.value?.stats.slice(3, 6) ?? []);

// Tier por nivel: misma escala visual que la carta del usuario.
const tier = computed(() => {
  const l = card.value?.level ?? 0;
  if (l >= 85) return 'leyenda';
  if (l >= 65) return 'oro';
  if (l >= 40) return 'plata';
  return 'bronce';
});

const claseCodigo = computed(() => card.value?.archetype?.primary?.replace('_', ' ') ?? 'SIN CLASE');

const subtitulo = computed(() => {
  const partes: string[] = [];
  if (props.herAge) partes.push(`${props.herAge} años`);
  if (props.herOccupation) partes.push(props.herOccupation);
  return partes.join(' · ');
});

const confianzaPct = computed(() => Math.round((card.value?.confidence ?? 0) * 100));

async function cargar(refresh = false) {
  loading.value = true;
  try {
    const res: any = await api.get(`/targets/${props.targetId}/card${refresh ? '?refresh=1' : ''}`);
    card.value = res.card ?? null;
    reason.value = res.reason ?? null;
    if (card.value) animar();
  } catch {
    reason.value = 'error';
  } finally {
    loading.value = false;
  }
}

function alternarHint(key: HerStatKey) {
  hintAbierto.value = hintAbierto.value === key ? null : key;
}

function valor(key: HerStatKey): number {
  return valoresVisibles.value[key] ?? 0;
}

onMounted(() => cargar());
watch(
  () => [props.targetId, props.version],
  ([id, v], [prevId, prevV]) => {
    if (id !== prevId || v !== prevV) void cargar();
  }
);
onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId);
});
</script>

<template>
  <article class="her-card" :class="[`tier-${tier}`, `accent-${accentColor || 'red'}`]">
    <div class="hc-glow" aria-hidden="true"></div>

    <!-- Cargando -->
    <div v-if="loading && !card" class="hc-loading">
      <BaseIcon name="thinking" size="sm" color="red" spin />
      <span>Alfii está armando su ficha…</span>
    </div>

    <!-- Sin evidencia -->
    <div v-else-if="!card" class="hc-empty">
      <div class="hc-empty__portrait">{{ avatarInitial || displayName.charAt(0).toUpperCase() }}</div>
      <strong>{{ displayName }}</strong>
      <p v-if="reason === 'not_enough_evidence'">
        Ficha bloqueada. Sube una captura o importa el chat para que Alfii la desbloquee.
      </p>
      <p v-else>No pude armar la ficha ahora mismo.</p>
      <button v-if="reason !== 'not_enough_evidence'" type="button" class="hc-retry" @click="cargar(true)">
        <BaseIcon name="rotate" size="xs" color="cream" />
        Reintentar
      </button>
    </div>

    <template v-else>
      <header class="hc-head">
        <div class="hc-head__id">
          <span class="hc-level">{{ levelVisible }}</span>
          <span class="hc-level__label">NIVEL</span>
          <span class="hc-class">{{ claseCodigo }}</span>
        </div>
        <div class="hc-portrait">
          <span class="hc-portrait__initial">{{ avatarInitial || displayName.charAt(0).toUpperCase() }}</span>
          <span v-if="riskLevel && riskLevel !== 'LIMPIO'" class="hc-portrait__risk" :class="`risk-${riskLevel}`">
            <BaseIcon name="flag" size="xs" color="cream" />
          </span>
        </div>
      </header>

      <div class="hc-band">
        <span class="hc-band__name">{{ displayName }}</span>
        <span class="hc-band__role">
          {{ card.archetype?.label || 'Sin arquetipo' }}<template v-if="subtitulo"> · {{ subtitulo }}</template>
        </span>
        <p class="hc-band__tagline">"{{ card.tagline }}"</p>
      </div>

      <div class="hc-stats">
        <ul class="hc-col">
          <li v-for="s in columnaIzq" :key="s.key" class="hc-stat">
            <button type="button" class="hc-stat__row" :class="{ 'is-open': hintAbierto === s.key }" @click="alternarHint(s.key)">
              <BaseIcon :name="ICONO_POR_STAT[s.key]" size="xs" color="muted" />
              <span class="hc-stat__key">{{ s.key }}</span>
              <span class="hc-stat__value">{{ valor(s.key) }}</span>
            </button>
            <StatBar :value="valor(s.key)" :tone="s.key === 'RIE' ? 'red' : 'cream'" />
            <p v-if="hintAbierto === s.key" class="hc-hint"><strong>{{ s.label }}.</strong> {{ s.hint }}</p>
          </li>
        </ul>
        <ul class="hc-col">
          <li v-for="s in columnaDer" :key="s.key" class="hc-stat">
            <button type="button" class="hc-stat__row" :class="{ 'is-open': hintAbierto === s.key }" @click="alternarHint(s.key)">
              <BaseIcon :name="ICONO_POR_STAT[s.key]" size="xs" color="muted" />
              <span class="hc-stat__key">{{ s.key }}</span>
              <span class="hc-stat__value">{{ valor(s.key) }}</span>
            </button>
            <StatBar :value="valor(s.key)" :tone="s.key === 'RIE' ? 'red' : 'cream'" />
            <p v-if="hintAbierto === s.key" class="hc-hint"><strong>{{ s.label }}.</strong> {{ s.hint }}</p>
          </li>
        </ul>
      </div>

      <!-- Jugada especial -->
      <section v-if="card.specialMove" class="hc-move">
        <span class="hc-move__label">
          <BaseIcon name="bolt" size="xs" color="red" />
          SU JUGADA
        </span>
        <strong class="hc-move__name">{{ card.specialMove.name }}</strong>
        <p class="hc-move__desc">{{ card.specialMove.description }}</p>
      </section>

      <!-- Bloques de juego -->
      <div class="hc-blocks">
        <section v-if="card.likes.length" class="hc-block tone-sage">
          <h4><BaseIcon name="handHoldingHeart" size="xs" color="sage" /> Le gusta</h4>
          <ul><li v-for="(x, i) in card.likes" :key="`l${i}`">{{ x }}</li></ul>
        </section>
        <section v-if="card.avoid.length" class="hc-block tone-cream">
          <h4><BaseIcon name="hand" size="xs" color="cream" /> Evita</h4>
          <ul><li v-for="(x, i) in card.avoid" :key="`a${i}`">{{ x }}</li></ul>
        </section>
        <section v-if="card.hates.length" class="hc-block tone-red">
          <h4><BaseIcon name="risk.ALTO" size="xs" color="red" /> Odia</h4>
          <ul><li v-for="(x, i) in card.hates" :key="`h${i}`">{{ x }}</li></ul>
        </section>
      </div>

      <section v-if="card.winConditions.length" class="hc-win">
        <h4><BaseIcon name="check" size="xs" color="sage" /> Cómo se gana</h4>
        <ol>
          <li v-for="(x, i) in card.winConditions" :key="`w${i}`">{{ x }}</li>
        </ol>
      </section>

      <footer class="hc-foot">
        <div class="hc-confidence">
          <div class="hc-confidence__head">
            <span>Evidencia</span>
            <span class="hc-confidence__val">{{ confianzaPct }}%</span>
          </div>
          <StatBar :value="confianzaPct" tone="sage" :height="3" />
        </div>
        <button type="button" class="hc-refresh" :disabled="loading" :title="card.stale ? 'Hay datos nuevos' : 'Regenerar ficha'" @click="cargar(true)">
          <BaseIcon name="rotate" size="xs" :color="card.stale ? 'sage' : 'muted'" :spin="loading" />
          <span>{{ card.stale ? 'Actualizar ficha' : 'Regenerar' }}</span>
        </button>
      </footer>
    </template>
  </article>
</template>

<style lang="scss" scoped>
.her-card {
  @include stack(12px);
  position: relative;
  width: 100%;
  max-width: 380px;
  padding: 18px 16px 16px;
  border-radius: 22px;
  border: 1px solid rgba($alfii-cream, 0.14);
  background: linear-gradient(160deg, rgba($alfii-plum, 0.96) 0%, rgba($alfii-navy, 0.98) 100%);
  box-shadow: 0 18px 40px rgba($alfii-navy, 0.55);
  overflow: hidden;
  isolation: isolate;
  color: $alfii-cream;
}

.hc-glow {
  position: absolute;
  top: -30%;
  right: -25%;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba($alfii-cream, 0.16) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.hc-loading,
.hc-empty {
  @include stack(10px, center);
  position: relative;
  z-index: 1;
  padding: 28px 8px;
  text-align: center;
  font-size: $fs-xs;
  color: rgba($alfii-cream, 0.65);

  strong { font-size: $fs-lg; color: $alfii-cream; letter-spacing: 0.04em; text-transform: uppercase; }
  p { margin: 0; line-height: $lh-snug; max-width: 26ch; }
}

.hc-loading { @include row(8px, center, center); }

.hc-empty__portrait {
  @include center;
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background-color: rgba($alfii-cream, 0.08);
  border: 1px dashed rgba($alfii-cream, 0.3);
  font-size: $fs-xl;
  font-weight: $fw-extrabold;
}

.hc-retry {
  @include row(6px, center);
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba($alfii-cream, 0.2);
  background: rgba($alfii-cream, 0.06);
  color: $alfii-cream;
  font-size: $fs-2xs;
  font-weight: $fw-semibold;
  cursor: pointer;
}

.hc-head {
  @include row(12px, flex-start, space-between);
  position: relative;
  z-index: 1;
}

.hc-head__id { @include stack(0, flex-start); }

.hc-level {
  font-size: $fs-3xl;
  font-weight: $fw-extrabold;
  line-height: $lh-tight;
  font-variant-numeric: tabular-nums;
}

.hc-level__label {
  font-size: 10px;
  font-weight: $fw-bold;
  letter-spacing: 0.2em;
  color: rgba($alfii-cream, 0.55);
}

.hc-class {
  margin-top: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba($alfii-cream, 0.25);
  font-size: $fs-2xs;
  font-weight: $fw-bold;
  letter-spacing: 0.12em;
  color: rgba($alfii-cream, 0.8);
}

.hc-portrait {
  position: relative;
  @include center;
  width: 84px;
  height: 84px;
  border-radius: 24px;
  font-size: 40px;
  font-weight: $fw-extrabold;
  flex-shrink: 0;

  &__risk {
    position: absolute;
    right: -6px;
    bottom: -6px;
    @include center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background-color: $alfii-red;
    border: 2px solid $alfii-navy;
    &.risk-VIGILAR { background-color: rgba($alfii-cream, 0.75); }
  }
}

.accent-red .hc-portrait { background-color: rgba($alfii-red, 0.3); border: 1px solid $alfii-red; }
.accent-sage .hc-portrait { background-color: rgba($alfii-sage, 0.3); border: 1px solid $alfii-sage; }
.accent-cream .hc-portrait { background-color: rgba($alfii-cream, 0.2); border: 1px solid $alfii-cream; }
.accent-plum .hc-portrait { background-color: rgba($alfii-plum, 0.9); border: 1px solid rgba($alfii-cream, 0.2); }
.accent-navy .hc-portrait { background-color: rgba($alfii-navy, 0.8); border: 1px solid rgba($alfii-cream, 0.2); }

.hc-band {
  @include stack(3px, center);
  position: relative;
  z-index: 1;
  padding: 8px 10px;
  border-top: 1px solid rgba($alfii-cream, 0.16);
  border-bottom: 1px solid rgba($alfii-cream, 0.16);
  text-align: center;

  &__name {
    font-size: $fs-xl;
    font-weight: $fw-extrabold;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  &__role {
    font-size: $fs-2xs;
    font-weight: $fw-semibold;
    letter-spacing: 0.08em;
    color: $alfii-sage;
  }
  &__tagline {
    margin: 4px 0 0;
    font-size: $fs-xs;
    line-height: $lh-snug;
    font-style: italic;
    color: rgba($alfii-cream, 0.75);
  }
}

.hc-stats {
  @include row(14px, flex-start, space-between);
  position: relative;
  z-index: 1;
}

.hc-col {
  @include stack(10px);
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.hc-stat { @include stack(4px); }

.hc-stat__row {
  @include row(6px, center);
  width: 100%;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  text-align: left;
  &:hover { opacity: 0.85; }
  &.is-open .hc-stat__key { color: $alfii-cream; }
}

.hc-stat__key {
  font-size: $fs-2xs;
  font-weight: $fw-bold;
  letter-spacing: 0.1em;
  color: rgba($alfii-cream, 0.65);
}

.hc-stat__value {
  margin-left: auto;
  font-size: $fs-md;
  font-weight: $fw-extrabold;
  font-variant-numeric: tabular-nums;
}

.hc-hint {
  margin: 0;
  font-size: $fs-2xs;
  line-height: $lh-snug;
  color: rgba($alfii-cream, 0.62);
  strong { color: rgba($alfii-cream, 0.85); }
}

.hc-move {
  @include stack(4px);
  position: relative;
  z-index: 1;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba($alfii-red, 0.1);
  border: 1px solid rgba($alfii-red, 0.35);

  &__label {
    @include row(6px, center);
    font-size: 10px;
    font-weight: $fw-extrabold;
    letter-spacing: 0.2em;
    color: $alfii-red;
  }
  &__name {
    font-size: $fs-sm;
    font-weight: $fw-extrabold;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  &__desc {
    margin: 0;
    font-size: $fs-2xs;
    line-height: $lh-snug;
    color: rgba($alfii-cream, 0.78);
  }
}

.hc-blocks {
  @include stack(8px);
  position: relative;
  z-index: 1;
}

.hc-block,
.hc-win {
  @include stack(6px);
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba($alfii-cream, 0.1);
  background: rgba($alfii-navy, 0.4);

  h4 {
    @include row(6px, center);
    margin: 0;
    font-size: 11px;
    font-weight: $fw-extrabold;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  ul, ol {
    margin: 0;
    padding: 0;
    list-style: none;
    @include row(6px, center);
    flex-wrap: wrap;
  }

  li {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: $fs-2xs;
    font-weight: $fw-semibold;
    line-height: $lh-snug;
    border: 1px solid rgba($alfii-cream, 0.14);
    background: rgba($alfii-cream, 0.05);
  }

  &.tone-sage { h4 { color: $alfii-sage; } li { border-color: rgba($alfii-sage, 0.4); background: rgba($alfii-sage, 0.1); } }
  &.tone-cream { h4 { color: $alfii-cream; } }
  &.tone-red { h4 { color: $alfii-red; } li { border-color: rgba($alfii-red, 0.4); background: rgba($alfii-red, 0.1); } }
}

.hc-win {
  position: relative;
  z-index: 1;
  border-color: rgba($alfii-sage, 0.3);
  h4 { color: $alfii-sage; }
  ol {
    @include stack(6px);
    counter-reset: win;
  }
  li {
    @include row(8px, baseline);
    border: none;
    background: none;
    padding: 0;
    border-radius: 0;
    font-weight: $fw-medium;
    color: rgba($alfii-cream, 0.85);
    &::before {
      counter-increment: win;
      content: counter(win);
      @include center;
      flex: 0 0 18px;
      width: 18px;
      height: 18px;
      border-radius: 6px;
      background: rgba($alfii-sage, 0.2);
      color: $alfii-sage;
      font-size: 10px;
      font-weight: $fw-extrabold;
    }
  }
}

.hc-foot {
  @include row(12px, flex-end, space-between);
  position: relative;
  z-index: 1;
}

.hc-confidence {
  @include stack(4px);
  flex: 1;
  &__head {
    @include row(8px, center, space-between);
    font-size: $fs-2xs;
    font-weight: $fw-medium;
    color: rgba($alfii-cream, 0.6);
  }
  &__val { font-weight: $fw-bold; color: $alfii-sage; }
}

.hc-refresh {
  @include row(6px, center);
  padding: 7px 10px;
  border-radius: 10px;
  border: 1px solid rgba($alfii-cream, 0.16);
  background: rgba($alfii-cream, 0.05);
  color: rgba($alfii-cream, 0.8);
  font-size: $fs-2xs;
  font-weight: $fw-semibold;
  cursor: pointer;
  white-space: nowrap;
  &:hover { border-color: rgba($alfii-cream, 0.35); }
  &:disabled { opacity: 0.5; cursor: default; }
}

// Tiers: misma escala que la carta del usuario. El nivel alto se lee como
// "jefe final": mas luz y mas presencia de red.
.tier-bronce { .hc-glow { opacity: 0.35; } }
.tier-plata {
  border-color: rgba($alfii-cream, 0.24);
  box-shadow: 0 18px 40px rgba($alfii-navy, 0.6), inset 0 1px 0 rgba($alfii-cream, 0.16);
  .hc-glow { opacity: 0.6; }
}
.tier-oro {
  border-color: rgba($alfii-cream, 0.45);
  background: linear-gradient(160deg, rgba($alfii-red, 0.22) 0%, rgba($alfii-plum, 0.96) 45%, rgba($alfii-navy, 0.98) 100%);
  box-shadow: 0 20px 44px rgba($alfii-navy, 0.65), 0 0 22px rgba($alfii-red, 0.16), inset 0 1px 0 rgba($alfii-cream, 0.3);
  .hc-glow { opacity: 0.85; }
}
.tier-leyenda {
  border-color: rgba($alfii-cream, 0.72);
  background: linear-gradient(160deg, rgba($alfii-red, 0.42) 0%, rgba($alfii-plum, 0.94) 40%, rgba($alfii-navy, 1) 100%);
  box-shadow: 0 24px 54px rgba($alfii-navy, 0.75), 0 0 34px rgba($alfii-red, 0.3), inset 0 1px 0 rgba($alfii-cream, 0.45);
  .hc-glow { opacity: 1; }
}

@media (min-width: 768px) {
  .her-card { padding: 22px 20px 20px; }
  .hc-level { font-size: 44px; }
}
</style>
