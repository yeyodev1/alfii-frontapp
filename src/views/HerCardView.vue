<script setup lang="ts">
/**
 * Ficha de ella: vista completa del personaje.
 *
 * Tres capas, de lo general a lo concreto:
 *  1. El arquetipo (arte y plantel del home): contra quien juegas, como juega,
 *     el plan. Conocimiento de Alfii, igual para todas las de esa clase.
 *  2. La carta de ELLA: nivel, stats, le gusta / evita / odia, su jugada.
 *     Generada con el expediente y cacheada; se regenera solo con novedad.
 *  3. Evolucion: versiones de la carta con fecha (se pueden abrir), hitos con
 *     fecha y medidores a lo largo del tiempo.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import HerTechCard from '@/components/shared/HerTechCard.vue';
import RiskBadge from '@/components/shared/RiskBadge.vue';
import StatBar from '@/components/shared/StatBar.vue';
import ExpedienteSidebar from '@/components/shared/ExpedienteSidebar.vue';
import api from '@/services/http';
import { getHerCard, type HerCardHistoryItem, type HerCardResponse } from '@/services/herCard.service';
import { archetypeByCode } from '@/config/homeArchetypes';
import { useToastStore } from '@/stores/toast';

const route = useRoute();
const router = useRouter();
const toast = useToastStore();

const targetId = computed(() => (Array.isArray(route.params.id) ? route.params.id[0] : route.params.id) || '');

const target = ref<any | null>(null);
const data = ref<HerCardResponse | null>(null);
const loading = ref(true);
const refreshing = ref(false);
/** Version abierta en la carta. null = la actual. */
const selectedIndex = ref<number | null>(null);

const STAGE_LABELS: Record<string, string> = {
  APERTURA: 'Apertura',
  CALIBRACION: 'Calibrando',
  ESCALADA: 'Escalando',
  CITA_AGENDADA: 'Cita agendada',
  POST_CITA: 'Después de la cita',
  ENFRIADO: 'Enfriado',
  CERRADO: 'Cerrado',
};

const MILESTONE_ICON: Record<string, 'firstDate' | 'kiss' | 'firstNight' | 'handHoldingHeart'> = {
  firstDate: 'firstDate',
  firstKiss: 'kiss',
  firstNight: 'firstNight',
  relationship: 'handHoldingHeart',
};

const archetype = computed(() => {
  const code = target.value?.archetype?.primary || data.value?.card?.archetype?.primary;
  return code ? archetypeByCode(code) : null;
});

const portraitUrl = computed(() => (archetype.value ? `/home/arch-${archetype.value.key}.jpg` : null));

const selected = computed<HerCardHistoryItem | null>(() => {
  if (selectedIndex.value === null || !data.value) return null;
  return data.value.history.find((h) => h.index === selectedIndex.value) ?? null;
});

const cardToShow = computed(() => selected.value?.card ?? data.value?.card ?? null);

/** Linea de tiempo unificada: versiones de la ficha + hitos + creacion. */
interface TimelineEvent {
  id: string;
  at: string;
  kind: 'card' | 'milestone' | 'created';
  title: string;
  detail?: string;
  level?: number;
  levelDelta?: number | null;
  stage?: string;
  riskLevel?: string;
  index?: number;
}

const timeline = computed<TimelineEvent[]>(() => {
  if (!data.value) return [];
  const events: TimelineEvent[] = [];

  const hist = [...data.value.history].sort((a, b) => +new Date(a.generatedAt) - +new Date(b.generatedAt));
  hist.forEach((h, i) => {
    const prev = hist[i - 1];
    events.push({
      id: `card-${h.index}`,
      at: h.generatedAt,
      kind: 'card',
      title: `Ficha v${h.index}`,
      detail: h.tagline,
      level: h.level,
      levelDelta: prev ? h.level - prev.level : null,
      stage: h.stage,
      riskLevel: h.riskLevel,
      index: h.index,
    });
  });

  for (const m of data.value.milestones) {
    if (m.achieved && m.at) {
      events.push({ id: `ms-${m.key}`, at: m.at, kind: 'milestone', title: m.label });
    }
  }

  if (data.value.createdAt) {
    events.push({ id: 'created', at: data.value.createdAt, kind: 'created', title: 'Expediente abierto' });
  }

  return events.sort((a, b) => +new Date(b.at) - +new Date(a.at));
});

/** Medidores por version de ficha (o por historial de analisis si hay mas). */
const metersSeries = computed(() => {
  if (!data.value) return [];
  const src =
    data.value.metersHistory.length >= 2
      ? data.value.metersHistory.map((m) => ({ at: m.at, ...m }))
      : [...data.value.history]
          .sort((a, b) => +new Date(a.generatedAt) - +new Date(b.generatedAt))
          .map((h) => ({ at: h.generatedAt, ...h.meters }));
  return src.slice(-8);
});

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}
function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

async function load(refresh = false) {
  if (refresh) refreshing.value = true;
  else loading.value = true;
  try {
    if (!target.value) {
      const res: any = await api.get(`/targets/${targetId.value}`);
      target.value = res.target;
    }
    data.value = await getHerCard(targetId.value, refresh);
    if (refresh) selectedIndex.value = null;
  } catch (err: any) {
    toast.show(err.message || 'No pude cargar la ficha', 'error');
  } finally {
    loading.value = false;
    refreshing.value = false;
  }
}

function openVersion(index: number | null) {
  selectedIndex.value = index;
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    document.querySelector('.hc-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

onMounted(() => load());
watch(targetId, () => {
  target.value = null;
  data.value = null;
  selectedIndex.value = null;
  void load();
});
</script>

<template>
  <div class="her-card-view">
    <ExpedienteSidebar class="desktop-only" :active-id="targetId" />

    <div class="hcv-column">
      <header class="hcv-header">
        <button class="back-btn" type="button" @click="router.push(`/chat/${targetId}`)">
          <BaseIcon name="back" size="sm" color="cream" />
        </button>
        <div class="hcv-header__text">
          <h1>{{ target?.displayName || 'Ficha de ella' }}</h1>
          <span class="sub">Ficha técnica · {{ archetype ? archetype.name : 'sin arquetipo aún' }}</span>
        </div>
        <RiskBadge v-if="target" :level="(target.risk?.level as any) || 'LIMPIO'" />
      </header>

      <div class="hcv-scroll">
        <div v-if="loading" class="hcv-loading">
          <BaseIcon name="thinking" size="sm" color="red" spin />
          <span>Cargando ficha…</span>
        </div>

        <div v-else class="hcv-body">
          <!-- ===== 1. ARQUETIPO ===== -->
          <section v-if="archetype" class="arch-hero">
            <div class="arch-hero__art">
              <img :src="portraitUrl!" :alt="archetype.name" />
              <div class="arch-hero__fade"></div>
              <div class="arch-hero__caption">
                <span class="arch-hero__label">Estás jugando contra</span>
                <strong class="arch-hero__name">{{ archetype.name }}</strong>
                <span class="arch-hero__stars" :aria-label="`${archetype.stars} de 5`">
                  <span v-for="i in 5" :key="i" class="star" :class="{ on: i <= archetype.stars }">★</span>
                </span>
              </div>
            </div>

            <div class="arch-hero__info">
              <p class="arch-tag">{{ archetype.tag }}</p>
              <p class="arch-quote">{{ archetype.quote }}</p>

              <div class="arch-stats">
                <div class="arch-stat">
                  <div class="arch-stat__head"><span>Testeo</span><strong>{{ archetype.stats.testeo }}</strong></div>
                  <StatBar :value="archetype.stats.testeo" tone="cream" :height="5" />
                </div>
                <div class="arch-stat">
                  <div class="arch-stat__head"><span>Hermetismo</span><strong>{{ archetype.stats.hermetismo }}</strong></div>
                  <StatBar :value="archetype.stats.hermetismo" tone="cream" :height="5" />
                </div>
                <div class="arch-stat">
                  <div class="arch-stat__head"><span>Riesgo</span><strong>{{ archetype.stats.riesgo }}</strong></div>
                  <StatBar :value="archetype.stats.riesgo" tone="red" :height="5" />
                </div>
              </div>

              <div class="arch-cols">
                <div class="arch-col">
                  <h4><BaseIcon name="subtext" size="xs" color="red" /> Cómo juega</h4>
                  <ul><li v-for="(m, i) in archetype.moves" :key="`m${i}`">{{ m }}</li></ul>
                </div>
                <div class="arch-col">
                  <h4><BaseIcon name="scripts" size="xs" color="sage" /> El plan</h4>
                  <ul><li v-for="(p, i) in archetype.plan" :key="`p${i}`">{{ p }}</li></ul>
                </div>
              </div>

              <p v-if="archetype.warning" class="arch-warning">
                <BaseIcon name="risk.ALTO" size="xs" color="red" />
                {{ archetype.warning }}
              </p>
            </div>
          </section>

          <section v-else class="arch-hero arch-hero--empty">
            <div class="arch-hero__info">
              <p class="arch-tag">Todavía no hay arquetipo.</p>
              <p class="arch-quote">Sube una captura o importa el chat y Alfii la clasifica en su primer análisis.</p>
            </div>
          </section>

          <!-- ===== 2. CARTA + 3. EVOLUCION ===== -->
          <div class="hcv-grid">
            <div class="hcv-card-col hc-anchor">
              <div class="hcv-section-head">
                <h2>{{ selected ? `Ficha v${selected.index}` : 'Su ficha ahora' }}</h2>
                <span v-if="cardToShow" class="hcv-date">
                  {{ fmtDate(cardToShow.generatedAt) }} · {{ fmtTime(cardToShow.generatedAt) }}
                </span>
                <button v-if="selected" type="button" class="hcv-chip-btn" @click="openVersion(null)">
                  Volver a la actual
                </button>
              </div>

              <p v-if="data?.hasNews && !selected" class="hcv-news">
                <BaseIcon name="info" size="xs" color="sage" />
                Hay novedades en el expediente desde esta ficha. Alfii la renovará sola cuando haya suficiente material, o puedes pedirla ahora.
              </p>

              <HerTechCard
                :card="cardToShow"
                :loading="refreshing"
                :reason="data?.reason ?? null"
                :display-name="target?.displayName || ''"
                :avatar-initial="target?.avatarInitial"
                :accent-color="target?.accentColor"
                :risk-level="selected ? selected.riskLevel : target?.risk?.level"
                :her-age="target?.herProfile?.herAge"
                :her-occupation="target?.herProfile?.herOccupation"
                :readonly="!!selected"
                :portrait-url="portraitUrl"
                @refresh="load(true)"
              />
            </div>

            <aside class="hcv-evo">
              <!-- Hitos -->
              <section class="evo-block">
                <h3><BaseIcon name="listCheck" size="xs" color="sage" /> Hitos</h3>
                <ul class="milestones">
                  <li
                    v-for="m in data?.milestones || []"
                    :key="m.key"
                    class="milestone"
                    :class="{ done: m.achieved }"
                  >
                    <span class="milestone__icon"><BaseIcon :name="MILESTONE_ICON[m.key]" size="xs" :color="m.achieved ? 'sage' : 'muted'" /></span>
                    <span class="milestone__label">{{ m.label }}</span>
                    <span class="milestone__date">{{ m.achieved && m.at ? fmtDate(m.at) : 'pendiente' }}</span>
                  </li>
                </ul>
              </section>

              <!-- Medidores en el tiempo -->
              <section v-if="metersSeries.length" class="evo-block">
                <h3><BaseIcon name="meters" size="xs" color="sage" /> Medidores en el tiempo</h3>
                <div class="meters-chart">
                  <div v-for="(m, i) in metersSeries" :key="i" class="meters-col">
                    <div class="meters-bars">
                      <span class="bar bar-kiss" :style="{ height: `${m.kiss}%` }" :title="`Beso ${m.kiss}%`"></span>
                      <span class="bar bar-date" :style="{ height: `${m.firstDate}%` }" :title="`Cita ${m.firstDate}%`"></span>
                      <span class="bar bar-night" :style="{ height: `${m.firstNight}%` }" :title="`Noche ${m.firstNight}%`"></span>
                    </div>
                    <span class="meters-date">{{ fmtShort(m.at) }}</span>
                  </div>
                </div>
                <div class="meters-legend">
                  <span><i class="dot bar-kiss"></i>Beso</span>
                  <span><i class="dot bar-date"></i>Cita</span>
                  <span><i class="dot bar-night"></i>Noche</span>
                </div>
              </section>

              <!-- Linea de tiempo -->
              <section class="evo-block">
                <h3><BaseIcon name="history" size="xs" color="sage" /> Evolución</h3>
                <p v-if="!timeline.length" class="evo-empty">Aún no hay versiones.</p>
                <ol v-else class="timeline">
                  <li
                    v-for="ev in timeline"
                    :key="ev.id"
                    class="tl-item"
                    :class="[`kind-${ev.kind}`, { active: ev.kind === 'card' && (selectedIndex === ev.index || (selectedIndex === null && ev.index === data?.history[0]?.index)) }]"
                  >
                    <span class="tl-dot"></span>
                    <button
                      v-if="ev.kind === 'card'"
                      type="button"
                      class="tl-card"
                      @click="openVersion(ev.index === data?.history[0]?.index ? null : ev.index!)"
                    >
                      <span class="tl-top">
                        <strong>{{ ev.title }}</strong>
                        <span class="tl-level">
                          NV {{ ev.level }}
                          <em v-if="ev.levelDelta" :class="ev.levelDelta > 0 ? 'up' : 'down'">
                            {{ ev.levelDelta > 0 ? '+' : '' }}{{ ev.levelDelta }}
                          </em>
                        </span>
                      </span>
                      <span class="tl-date">{{ fmtDate(ev.at) }} · {{ fmtTime(ev.at) }}</span>
                      <span class="tl-meta">
                        <span class="tl-stage">{{ STAGE_LABELS[ev.stage || ''] || ev.stage }}</span>
                        <span class="tl-risk" :class="`risk-${ev.riskLevel}`">{{ ev.riskLevel }}</span>
                      </span>
                      <span class="tl-detail">"{{ ev.detail }}"</span>
                    </button>
                    <div v-else class="tl-plain">
                      <span class="tl-top">
                        <strong>{{ ev.title }}</strong>
                        <BaseIcon v-if="ev.kind === 'milestone'" name="check" size="xs" color="sage" />
                      </span>
                      <span class="tl-date">{{ fmtDate(ev.at) }}</span>
                    </div>
                  </li>
                </ol>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.her-card-view {
  @include row(0, stretch);
  height: 100dvh;
  width: 100%;
}

.desktop-only { display: none !important; }
@media (min-width: 1024px) {
  .desktop-only { display: flex !important; }
}

.hcv-column {
  @include stack(0);
  flex: 1;
  min-width: 0;
  height: 100%;
}

$pad: clamp(16px, 3vw, 32px);
$reading: 1100px;

.hcv-header {
  @include row(12px, center);
  flex: 0 0 auto;
  padding: 12px $pad;
  background-color: rgba($alfii-plum, 0.9);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba($alfii-cream, 0.08);

  .back-btn { padding: 6px; }

  &__text {
    @include stack(2px);
    flex: 1;
    min-width: 0;
    h1 { font-size: $fs-md; font-weight: $fw-bold; color: $alfii-cream; }
    .sub { font-size: $fs-2xs; color: rgba($alfii-cream, 0.6); }
  }
}

.hcv-scroll {
  @include scroll-y;
  flex: 1;
  min-height: 0;
  padding: 20px $pad 40px;
}

.hcv-loading {
  @include row(8px, center, center);
  padding: 60px 0;
  color: rgba($alfii-cream, 0.6);
  font-size: $fs-xs;
}

.hcv-body {
  @include stack(24px);
  max-width: $reading;
  margin: 0 auto;
}

// ===== Arquetipo =====
.arch-hero {
  @include stack(0);
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba($alfii-cream, 0.12);
  background: linear-gradient(160deg, rgba($alfii-plum, 0.95) 0%, rgba($alfii-navy, 0.98) 100%);
  box-shadow: 0 20px 50px rgba($alfii-navy, 0.6);

  @media (min-width: 900px) {
    @include row(0, stretch);
  }

  &--empty { padding: 20px; }

  &__art {
    position: relative;
    flex: 0 0 auto;
    aspect-ratio: 3 / 4;
    max-height: 420px;
    overflow: hidden;

    @media (min-width: 900px) {
      flex: 0 0 340px;
      max-height: none;
      aspect-ratio: auto;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top;
      display: block;
    }
  }

  &__fade {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 45%, rgba($alfii-navy, 0.95) 100%);
  }

  &__caption {
    position: absolute;
    left: 18px;
    right: 18px;
    bottom: 16px;
    @include stack(2px);
  }
  &__label {
    font-size: 10px;
    font-weight: $fw-bold;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.7);
  }
  &__name {
    font-size: $fs-2xl;
    font-weight: $fw-extrabold;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: $alfii-cream;
    line-height: $lh-tight;
  }
  &__stars {
    font-size: $fs-sm;
    letter-spacing: 0.1em;
    .star { color: rgba($alfii-cream, 0.2); }
    .star.on { color: $alfii-cream; }
  }

  &__info {
    @include stack(16px);
    flex: 1;
    min-width: 0;
    padding: 22px clamp(16px, 3vw, 28px);
  }
}

.arch-tag {
  margin: 0;
  font-size: $fs-lg;
  font-weight: $fw-bold;
  line-height: $lh-snug;
  color: $alfii-cream;
}

.arch-quote {
  margin: 0;
  padding: 10px 14px;
  border-left: 3px solid $alfii-red;
  border-radius: 0 12px 12px 0;
  background: rgba($alfii-red, 0.08);
  font-size: $fs-sm;
  font-style: italic;
  color: rgba($alfii-cream, 0.85);
}

.arch-stats {
  @include row(16px, flex-start);
  flex-wrap: wrap;
  .arch-stat {
    @include stack(5px);
    flex: 1 1 120px;
    &__head {
      @include row(8px, center, space-between);
      font-size: $fs-2xs;
      color: rgba($alfii-cream, 0.65);
      strong { color: $alfii-cream; font-weight: $fw-extrabold; font-variant-numeric: tabular-nums; }
    }
  }
}

.arch-cols {
  @include stack(14px);
  @media (min-width: 640px) { @include row(18px, flex-start); }

  .arch-col {
    @include stack(8px);
    flex: 1;
    min-width: 0;
    h4 {
      @include row(6px, center);
      margin: 0;
      font-size: 11px;
      font-weight: $fw-extrabold;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: rgba($alfii-cream, 0.8);
    }
    ul {
      @include stack(6px);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      position: relative;
      padding-left: 14px;
      font-size: $fs-xs;
      line-height: $lh-snug;
      color: rgba($alfii-cream, 0.8);
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0.55em;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: $alfii-sage;
      }
    }
    &:first-child li::before { background: $alfii-red; }
  }
}

.arch-warning {
  @include row(8px, flex-start);
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba($alfii-red, 0.45);
  background: rgba($alfii-red, 0.12);
  font-size: $fs-2xs;
  line-height: $lh-snug;
  color: $alfii-cream;
}

// ===== Carta + evolucion =====
.hcv-grid {
  @include stack(24px);
  @media (min-width: 1024px) {
    @include row(28px, flex-start);
  }
}

.hcv-card-col {
  @include stack(12px);
  @media (min-width: 1024px) { flex: 0 0 400px; }
}

.hcv-section-head {
  @include row(10px, center);
  flex-wrap: wrap;
  h2 { font-size: $fs-md; font-weight: $fw-bold; color: $alfii-cream; }
}

.hcv-date {
  font-size: $fs-2xs;
  color: rgba($alfii-cream, 0.55);
}

.hcv-chip-btn {
  margin-left: auto;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba($alfii-cream, 0.2);
  background: rgba($alfii-cream, 0.06);
  color: $alfii-cream;
  font-size: $fs-2xs;
  font-weight: $fw-semibold;
  cursor: pointer;
}

.hcv-news {
  @include row(8px, flex-start);
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba($alfii-sage, 0.35);
  background: rgba($alfii-sage, 0.1);
  font-size: $fs-2xs;
  line-height: $lh-snug;
  color: rgba($alfii-cream, 0.85);
}

.hcv-evo {
  @include stack(16px);
  flex: 1;
  min-width: 0;
}

.evo-block {
  @include stack(12px);
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid rgba($alfii-cream, 0.1);
  background: rgba($alfii-plum, 0.5);

  h3 {
    @include row(6px, center);
    font-size: 11px;
    font-weight: $fw-extrabold;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.8);
  }
}

.evo-empty { font-size: $fs-xs; color: rgba($alfii-cream, 0.5); margin: 0; }

// Hitos
.milestones {
  @include stack(8px);
  margin: 0;
  padding: 0;
  list-style: none;

  @media (min-width: 640px) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.milestone {
  @include row(10px, center);
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba($alfii-cream, 0.1);
  background: rgba($alfii-navy, 0.4);
  color: rgba($alfii-cream, 0.6);

  &.done {
    border-color: rgba($alfii-sage, 0.4);
    background: rgba($alfii-sage, 0.1);
    color: $alfii-cream;
    .milestone__date { color: $alfii-sage; }
  }

  &__icon {
    @include center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba($alfii-cream, 0.06);
  }
  &__label { flex: 1; font-size: $fs-xs; font-weight: $fw-semibold; }
  &__date { font-size: $fs-2xs; font-variant-numeric: tabular-nums; }
}

// Medidores
.meters-chart {
  @include row(10px, flex-end, space-between);
  height: 120px;
  padding-top: 6px;
}

.meters-col {
  @include stack(6px, center);
  flex: 1;
  min-width: 0;
  height: 100%;
  justify-content: flex-end;
}

.meters-bars {
  @include row(3px, flex-end, center);
  flex: 1;
  width: 100%;
  .bar {
    flex: 1;
    max-width: 12px;
    min-height: 2px;
    border-radius: 3px 3px 0 0;
    transition: height $dur-slow $ease-out;
  }
}

.bar-kiss { background: $alfii-sage; }
.bar-date { background: $alfii-cream; }
.bar-night { background: $alfii-red; }

.meters-date { font-size: 10px; color: rgba($alfii-cream, 0.5); white-space: nowrap; }

.meters-legend {
  @include row(14px, center);
  font-size: $fs-2xs;
  color: rgba($alfii-cream, 0.65);
  span { @include row(6px, center); }
  .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
}

// Linea de tiempo
.timeline {
  @include stack(0);
  margin: 0;
  padding: 0 0 0 18px;
  list-style: none;
  border-left: 2px solid rgba($alfii-cream, 0.12);
}

.tl-item {
  position: relative;
  padding: 0 0 16px 16px;

  &:last-child { padding-bottom: 0; }

  .tl-dot {
    position: absolute;
    left: -24px;
    top: 6px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba($alfii-cream, 0.35);
    border: 2px solid $alfii-navy;
  }
  &.kind-card .tl-dot { background: $alfii-cream; }
  &.kind-milestone .tl-dot { background: $alfii-sage; }
  &.active .tl-dot { background: $alfii-red; box-shadow: 0 0 0 4px rgba($alfii-red, 0.25); }
}

.tl-card,
.tl-plain {
  @include stack(4px);
  width: 100%;
  text-align: left;
  color: $alfii-cream;
}

.tl-card {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba($alfii-cream, 0.1);
  background: rgba($alfii-navy, 0.4);
  cursor: pointer;
  transition: border-color $dur-fast $ease-out, background-color $dur-fast $ease-out;
  &:hover { border-color: rgba($alfii-cream, 0.3); }
  .active & { border-color: rgba($alfii-red, 0.5); background: rgba($alfii-red, 0.08); }
}

.tl-top {
  @include row(8px, center, space-between);
  strong { font-size: $fs-xs; font-weight: $fw-bold; }
}

.tl-level {
  @include row(4px, baseline);
  font-size: $fs-2xs;
  font-weight: $fw-extrabold;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
  em {
    font-style: normal;
    font-size: 11px;
    &.up { color: $alfii-red; }
    &.down { color: $alfii-sage; }
  }
}

.tl-date { font-size: $fs-2xs; color: rgba($alfii-cream, 0.55); font-variant-numeric: tabular-nums; }

.tl-meta {
  @include row(6px, center);
  font-size: 10px;
  font-weight: $fw-bold;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  .tl-stage { color: rgba($alfii-cream, 0.7); }
  .tl-risk {
    padding: 1px 6px;
    border-radius: 999px;
    border: 1px solid rgba($alfii-cream, 0.2);
    color: rgba($alfii-cream, 0.7);
    &.risk-ALTO, &.risk-ABORTAR { border-color: rgba($alfii-red, 0.5); color: $alfii-red; }
    &.risk-LIMPIO { border-color: rgba($alfii-sage, 0.5); color: $alfii-sage; }
  }
}

.tl-detail {
  font-size: $fs-2xs;
  font-style: italic;
  line-height: $lh-snug;
  color: rgba($alfii-cream, 0.7);
}
</style>
