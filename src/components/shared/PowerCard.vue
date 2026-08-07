<script setup lang="ts">
/**
 * Carta de poder tipo FUT. Es la recompensa visual del test de perfil:
 * el usuario ve su rating subir cuando completa datos, por eso el conteo
 * animado y el delta no son adorno, son el refuerzo del loop.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AlfiiLogo from '@/components/shared/AlfiiLogo.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import StatBar from '@/components/shared/StatBar.vue';
import type { IconName } from '@/config/icons';
import type { PowerCardData, PowerStat, PowerStatKey } from '@/services/card.service';

const props = withDefaults(
  defineProps<{
    card: PowerCardData;
    animate?: boolean;
    compact?: boolean;
    playerName?: string;
  }>(),
  {
    animate: true,
    compact: false,
    playerName: '',
  }
);

const emit = defineEmits<{
  (e: 'next-best', field: string): void;
  (e: 'hint', statKey: PowerStatKey): void;
}>();

// Solo nombres que existen en config/icons.ts
const ICONO_POR_STAT: Record<PowerStatKey, IconName> = {
  MRC: 'meters',
  LEC: 'subtext',
  TMG: 'timing',
  EST: 'archetype',
  FIS: 'bolt',
  CAL: 'lightbulb',
};

const DURACION_CONTEO = 900;
const DURACION_DELTA = 2200;

// ---------- estado de render ----------
const valoresVisibles = ref<Record<string, number>>({});
const overallVisible = ref(0);
const deltas = ref<Record<string, number>>({});
const hintAbierto = ref<PowerStatKey | null>(null);

let rafId = 0;
let temporizadorDelta: ReturnType<typeof setTimeout> | null = null;
// Se guarda copia propia porque un watch deep puede recibir el mismo objeto
// mutado en sitio y entonces el "valor anterior" seria inservible.
let valoresPrevios: Record<string, number> = {};
let overallPrevio = 0;

// ---------- derivados ----------
const columnaIzquierda = computed<PowerStat[]>(() => props.card.stats.slice(0, 3));
const columnaDerecha = computed<PowerStat[]>(() => props.card.stats.slice(3, 6));

// Firma plana: dispara el re-conteo aunque el backend devuelva otro objeto igual
const firmaCarta = computed(
  () =>
    `${props.card.overall}|${props.card.tier}|` +
    props.card.stats.map((s) => `${s.key}:${s.value}`).join(',')
);

const claveBloqueadas = computed<Record<string, number>>(() => {
  const mapa: Record<string, number> = {};
  for (const bloqueada of props.card.locked) {
    // Varios campos pueden apuntar a la misma stat: se acumula la ganancia total
    mapa[bloqueada.statKey] = (mapa[bloqueada.statKey] ?? 0) + bloqueada.gain;
  }
  return mapa;
});

const nombreBanda = computed(() => props.playerName.trim() || props.card.positionLabel);

const claseTier = computed(() => `tier-${props.card.tier.toLowerCase()}`);

const textoNextBest = computed(() => {
  const next = props.card.nextBest;
  if (!next) return '';
  const bloqueada = props.card.locked.find((l) => l.field === next.field);
  const pregunta = bloqueada?.question ?? next.field;
  return `Responde ${pregunta} y sube +${next.gain}`;
});

// ---------- animacion ----------
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function prefiereMenosMovimiento(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function mapaDeStats(stats: PowerStat[]): Record<string, number> {
  const mapa: Record<string, number> = {};
  for (const s of stats) mapa[s.key] = s.value;
  return mapa;
}

function cancelarAnimacion(): void {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function animarHacia(
  desde: Record<string, number>,
  hasta: Record<string, number>,
  overallDesde: number,
  overallHasta: number
): void {
  cancelarAnimacion();

  // Sin animacion pedida o con reduced-motion: se salta al valor final
  if (!props.animate || prefiereMenosMovimiento()) {
    valoresVisibles.value = { ...hasta };
    overallVisible.value = overallHasta;
    return;
  }

  const inicio = performance.now();

  const paso = (ahora: number): void => {
    const avance = Math.min(1, (ahora - inicio) / DURACION_CONTEO);
    const e = easeOutCubic(avance);
    const siguiente: Record<string, number> = {};
    for (const clave of Object.keys(hasta)) {
      const a = desde[clave] ?? 0;
      siguiente[clave] = Math.round(a + ((hasta[clave] ?? 0) - a) * e);
    }
    valoresVisibles.value = siguiente;
    overallVisible.value = Math.round(overallDesde + (overallHasta - overallDesde) * e);

    if (avance < 1) rafId = requestAnimationFrame(paso);
    else rafId = 0;
  };

  rafId = requestAnimationFrame(paso);
}

function marcarDeltas(desde: Record<string, number>, hasta: Record<string, number>): void {
  const nuevos: Record<string, number> = {};
  for (const clave of Object.keys(hasta)) {
    const diferencia = (hasta[clave] ?? 0) - (desde[clave] ?? 0);
    if (diferencia > 0) nuevos[clave] = diferencia;
  }
  if (!Object.keys(nuevos).length) return;

  deltas.value = nuevos;
  if (temporizadorDelta) clearTimeout(temporizadorDelta);
  // El delta es un flash de recompensa, no informacion permanente
  temporizadorDelta = setTimeout(() => {
    deltas.value = {};
  }, DURACION_DELTA);
}

function aplicarCarta(esMontaje: boolean): void {
  const objetivo = mapaDeStats(props.card.stats);
  const desde: Record<string, number> = {};
  for (const clave of Object.keys(objetivo)) {
    desde[clave] = esMontaje ? 0 : (valoresPrevios[clave] ?? 0);
  }
  const overallDesde = esMontaje ? 0 : overallPrevio;

  if (!esMontaje) marcarDeltas(desde, objetivo);
  animarHacia(desde, objetivo, overallDesde, props.card.overall);

  valoresPrevios = objetivo;
  overallPrevio = props.card.overall;
}

// Watcher publico del cambio de carta: recuenta y dispara los deltas
watch(firmaCarta, () => aplicarCarta(false));

onMounted(() => aplicarCarta(true));

onBeforeUnmount(() => {
  cancelarAnimacion();
  if (temporizadorDelta) clearTimeout(temporizadorDelta);
});

// ---------- interaccion ----------
function alternarHint(stat: PowerStat): void {
  if (!stat.hint) return;
  hintAbierto.value = hintAbierto.value === stat.key ? null : stat.key;
  if (hintAbierto.value) emit('hint', stat.key);
}

function pulsarNextBest(): void {
  if (props.card.nextBest) emit('next-best', props.card.nextBest.field);
}

function valorVisible(clave: PowerStatKey): number {
  return valoresVisibles.value[clave] ?? 0;
}

// Se expone replay para que el padre pueda repetir el conteo tras el test
defineExpose({
  replay: (): void => aplicarCarta(true),
  deltas,
});
</script>

<template>
  <article
    class="power-card"
    :class="[claseTier, { 'is-compact': compact }]"
    :aria-label="`Carta ${card.tier}, valoracion ${card.overall}`"
  >
    <div class="pc-glow" aria-hidden="true"></div>

    <header class="pc-head">
      <div class="pc-head__id">
        <span class="pc-overall">{{ overallVisible }}</span>
        <span class="pc-position">{{ card.position }}</span>
        <span class="pc-tier">{{ card.tier }}</span>
      </div>

      <div class="pc-portrait">
        <AlfiiLogo mode="iso" :size="compact ? 'lg' : 'xl'" />
      </div>
    </header>

    <div class="pc-band">
      <span class="pc-band__name">{{ nombreBanda }}</span>
      <span v-if="!compact" class="pc-band__role">{{ card.positionLabel }}</span>
    </div>

    <div class="pc-stats">
      <ul class="pc-col">
        <li v-for="stat in columnaIzquierda" :key="stat.key" class="pc-stat">
          <button
            type="button"
            class="pc-stat__row"
            :class="{ 'is-open': hintAbierto === stat.key }"
            :aria-expanded="hintAbierto === stat.key"
            @click="alternarHint(stat)"
          >
            <BaseIcon :name="ICONO_POR_STAT[stat.key]" size="xs" color="muted" />
            <span class="pc-stat__key">{{ stat.key }}</span>
            <span class="pc-stat__value">{{ valorVisible(stat.key) }}</span>
            <span v-if="deltas[stat.key]" class="pc-delta">+{{ deltas[stat.key] }}</span>
            <BaseIcon
              v-else-if="claveBloqueadas[stat.key]"
              name="lock"
              size="xs"
              color="muted"
            />
          </button>
          <StatBar
            :value="valorVisible(stat.key)"
            :tone="deltas[stat.key] ? 'sage' : 'cream'"
            :dim="!!claveBloqueadas[stat.key]"
          />
          <p v-if="hintAbierto === stat.key" class="pc-hint">{{ stat.hint }}</p>
        </li>
      </ul>

      <ul class="pc-col">
        <li v-for="stat in columnaDerecha" :key="stat.key" class="pc-stat">
          <button
            type="button"
            class="pc-stat__row"
            :class="{ 'is-open': hintAbierto === stat.key }"
            :aria-expanded="hintAbierto === stat.key"
            @click="alternarHint(stat)"
          >
            <BaseIcon :name="ICONO_POR_STAT[stat.key]" size="xs" color="muted" />
            <span class="pc-stat__key">{{ stat.key }}</span>
            <span class="pc-stat__value">{{ valorVisible(stat.key) }}</span>
            <span v-if="deltas[stat.key]" class="pc-delta">+{{ deltas[stat.key] }}</span>
            <BaseIcon
              v-else-if="claveBloqueadas[stat.key]"
              name="lock"
              size="xs"
              color="muted"
            />
          </button>
          <StatBar
            :value="valorVisible(stat.key)"
            :tone="deltas[stat.key] ? 'sage' : 'cream'"
            :dim="!!claveBloqueadas[stat.key]"
          />
          <p v-if="hintAbierto === stat.key" class="pc-hint">{{ stat.hint }}</p>
        </li>
      </ul>
    </div>

    <footer class="pc-foot">
      <div v-if="!compact" class="pc-completeness">
        <div class="pc-completeness__head">
          <span>Perfil</span>
          <span class="pc-completeness__val">{{ card.completeness }}%</span>
        </div>
        <StatBar :value="card.completeness" tone="sage" :height="3" />
      </div>

      <button
        v-if="card.nextBest"
        type="button"
        class="pc-cta"
        @click="pulsarNextBest"
      >
        <BaseIcon name="arrowUp" size="xs" color="sage" />
        <span class="pc-cta__text">{{ textoNextBest }}</span>
        <BaseIcon name="arrowRight" size="xs" color="muted" />
      </button>
    </footer>
  </article>
</template>

<style lang="scss" scoped>
// Mobile-first: la carta ocupa el ancho disponible con tope de 340px
.power-card {
  @include stack(12px);
  position: relative;
  width: 100%;
  max-width: 340px;
  padding: 18px 16px 16px;
  border-radius: 22px;
  border: 1px solid rgba($alfii-cream, 0.14);
  background:
    linear-gradient(160deg, rgba($alfii-plum, 0.96) 0%, rgba($alfii-navy, 0.98) 100%);
  box-shadow: 0 18px 40px rgba($alfii-navy, 0.55);
  overflow: hidden;
  isolation: isolate;
}

// Halo detras del retrato. Solo opacidad de marca, ningun hex nuevo
.pc-glow {
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

.pc-head {
  @include row(12px, flex-start, space-between);
  position: relative;
  z-index: 1;
}

.pc-head__id {
  @include stack(2px, flex-start);
}

.pc-overall {
  font-size: $fs-3xl;
  font-weight: $fw-extrabold;
  line-height: $lh-tight;
  color: $alfii-cream;
  font-variant-numeric: tabular-nums;
}

.pc-position {
  font-size: $fs-md;
  font-weight: $fw-bold;
  letter-spacing: 0.14em;
  color: rgba($alfii-cream, 0.8);
}

.pc-tier {
  margin-top: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba($alfii-cream, 0.25);
  font-size: $fs-2xs;
  font-weight: $fw-bold;
  letter-spacing: 0.12em;
  color: rgba($alfii-cream, 0.75);
}

.pc-portrait {
  @include center;
  flex-shrink: 0;
}

.pc-band {
  @include stack(2px, center);
  position: relative;
  z-index: 1;
  padding: 8px 10px;
  border-top: 1px solid rgba($alfii-cream, 0.16);
  border-bottom: 1px solid rgba($alfii-cream, 0.16);
  text-align: center;

  &__name {
    font-size: $fs-lg;
    font-weight: $fw-extrabold;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: $alfii-cream;
  }

  &__role {
    font-size: $fs-2xs;
    font-weight: $fw-medium;
    letter-spacing: 0.08em;
    color: rgba($alfii-cream, 0.6);
  }
}

// Dos columnas de tres stats, con flex (prohibido grid en el proyecto)
.pc-stats {
  @include row(14px, flex-start, space-between);
  position: relative;
  z-index: 1;
  flex-wrap: nowrap;
}

.pc-col {
  @include stack(10px);
  flex: 1 1 0;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pc-stat {
  @include stack(4px);
}

.pc-stat__row {
  @include row(6px, center, flex-start);
  width: 100%;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  text-align: left;
  transition: opacity $dur-fast $ease-out;

  &:hover { opacity: 0.85; }
  &.is-open .pc-stat__key { color: $alfii-cream; }
}

.pc-stat__key {
  font-size: $fs-2xs;
  font-weight: $fw-bold;
  letter-spacing: 0.1em;
  color: rgba($alfii-cream, 0.65);
}

.pc-stat__value {
  margin-left: auto;
  font-size: $fs-md;
  font-weight: $fw-extrabold;
  color: $alfii-cream;
  font-variant-numeric: tabular-nums;
}

// El delta es la senal de recompensa: verde sage y salida breve
.pc-delta {
  font-size: $fs-2xs;
  font-weight: $fw-extrabold;
  color: $alfii-sage;
  animation: scalePop $dur-base $ease-spring both;
}

.pc-hint {
  margin: 0;
  font-size: $fs-2xs;
  line-height: $lh-snug;
  color: rgba($alfii-cream, 0.62);
  animation: fadeIn $dur-fast $ease-out both;
}

.pc-foot {
  @include stack(10px);
  position: relative;
  z-index: 1;
}

.pc-completeness {
  @include stack(4px);

  &__head {
    @include row(8px, center, space-between);
    font-size: $fs-2xs;
    font-weight: $fw-medium;
    color: rgba($alfii-cream, 0.6);
  }

  &__val {
    font-weight: $fw-bold;
    color: $alfii-sage;
  }
}

.pc-cta {
  @include row(8px, center, flex-start);
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba($alfii-sage, 0.4);
  background: rgba($alfii-sage, 0.12);
  cursor: pointer;
  transition: background $dur-fast $ease-out, border-color $dur-fast $ease-out;

  &:hover {
    background: rgba($alfii-sage, 0.2);
    border-color: rgba($alfii-sage, 0.65);
  }

  &__text {
    flex: 1 1 auto;
    min-width: 0;
    font-size: $fs-xs;
    font-weight: $fw-semibold;
    line-height: $lh-snug;
    color: $alfii-cream;
    text-align: left;
  }
}

// ---------- Tiers ----------
// Los 4 niveles se distinguen por intensidad y brillo, nunca por un color nuevo.
// LEYENDA no lleva dorado: lleva mas luz cream y mas presencia de red.
.tier-bronce {
  border-color: rgba($alfii-cream, 0.1);
  background: linear-gradient(160deg, rgba($alfii-plum, 0.9) 0%, rgba($alfii-navy, 0.98) 100%);

  .pc-glow { opacity: 0.35; }
}

.tier-plata {
  border-color: rgba($alfii-cream, 0.24);
  background: linear-gradient(160deg, rgba($alfii-plum, 0.98) 0%, rgba($alfii-navy, 0.94) 100%);
  box-shadow: 0 18px 40px rgba($alfii-navy, 0.6), inset 0 1px 0 rgba($alfii-cream, 0.16);

  .pc-glow { opacity: 0.6; }
}

.tier-oro {
  border-color: rgba($alfii-cream, 0.45);
  background:
    linear-gradient(160deg, rgba($alfii-red, 0.22) 0%, rgba($alfii-plum, 0.96) 45%, rgba($alfii-navy, 0.98) 100%);
  box-shadow:
    0 20px 44px rgba($alfii-navy, 0.65),
    0 0 22px rgba($alfii-red, 0.16),
    inset 0 1px 0 rgba($alfii-cream, 0.3);

  .pc-glow { opacity: 0.85; }
  .pc-tier { border-color: rgba($alfii-cream, 0.5); color: $alfii-cream; }
}

.tier-leyenda {
  border-color: rgba($alfii-cream, 0.72);
  background:
    linear-gradient(160deg, rgba($alfii-red, 0.42) 0%, rgba($alfii-plum, 0.94) 40%, rgba($alfii-navy, 1) 100%);
  box-shadow:
    0 24px 54px rgba($alfii-navy, 0.75),
    0 0 34px rgba($alfii-red, 0.3),
    inset 0 1px 0 rgba($alfii-cream, 0.45);
  animation: pulseGlow 3.2s $ease-in-out infinite;

  .pc-glow {
    opacity: 1;
    animation: pulseHalo 3.2s $ease-in-out infinite;
  }

  .pc-tier {
    border-color: rgba($alfii-cream, 0.7);
    color: $alfii-cream;
    background: rgba($alfii-cream, 0.1);
  }

  .pc-band { border-color: rgba($alfii-cream, 0.4); }
}

// ---------- Compacta ----------
.is-compact {
  max-width: 260px;
  padding: 14px 12px 12px;

  .pc-overall { font-size: $fs-2xl; }
  .pc-band__name { font-size: $fs-base; }
  .pc-stats { gap: 10px; }
}

// ---------- Escala en pantallas grandes ----------
@media (min-width: 768px) {
  .power-card {
    max-width: 380px;
    padding: 22px 20px 20px;
  }

  .pc-overall { font-size: 44px; }
  .pc-band__name { font-size: $fs-xl; }
  .pc-stat__value { font-size: $fs-lg; }
  .pc-cta__text { font-size: $fs-sm; }

  .is-compact { max-width: 300px; }
}

// Reduced-motion: el bloque global ya neutraliza duraciones, aqui se apagan
// los bucles infinitos que igual seguirian latiendo
@media (prefers-reduced-motion: reduce) {
  .tier-leyenda,
  .tier-leyenda .pc-glow,
  .pc-delta {
    animation: none !important;
  }
}
</style>
