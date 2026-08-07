<script setup lang="ts">
/**
 * Vista del heroe: la pantalla de progreso del propio usuario.
 * Existe porque la carta sola no cuenta la historia: el usuario necesita ver
 * que su rating sube por trabajo real (expedientes, analisis, hitos) y no por
 * relleno. Por eso todas las cifras se calculan de datos del backend y, si no
 * hay datos, se muestran en cero y se dice explicitamente.
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import PowerCard from '@/components/shared/PowerCard.vue';
import StatBar from '@/components/shared/StatBar.vue';
import ProfileCompletenessBadge from '@/components/shared/ProfileCompletenessBadge.vue';
import { getMyCard, type PowerCardData, type PowerLockedField } from '@/services/card.service';
import api from '@/services/http';
import { useAuthStore } from '@/stores/auth';

// El store de targets tipa TargetSummary sin milestones, y aqui los hitos son
// el nucleo de la seccion de historial: se declara el contrato local completo.
interface HeroMilestone {
  key: string;
  label: string;
  achieved: boolean;
  at?: string | null;
}

interface HeroTarget {
  id: string;
  displayName: string;
  stage: string;
  analysisCount: number;
  milestones?: HeroMilestone[];
  lastMessageAt?: string | null;
}

interface HitoDelHeroe {
  id: string;
  label: string;
  chica: string;
  fecha: string | null;
  orden: number;
}

const router = useRouter();
const authStore = useAuthStore();

const cargando = ref(true);
const error = ref<string | null>(null);
const carta = ref<PowerCardData | null>(null);
const expedientes = ref<HeroTarget[]>([]);
const completitud = ref<{ score: number; impact: string } | null>(null);

const nombreHeroe = computed(() => authStore.user?.preferredName ?? '');

// ---------- carga ----------
async function cargarPerfil(): Promise<void> {
  // Va aparte y sin propagar el fallo: el badge de completitud es un extra,
  // que /profile falle no puede tumbar la vista entera.
  try {
    const perfil = (await api.get('/profile')) as unknown as {
      completeness?: { score?: number; impact?: string };
    };
    const c = perfil?.completeness;
    if (c && typeof c.score === 'number') {
      completitud.value = { score: c.score, impact: c.impact ?? '' };
    }
  } catch {
    completitud.value = null;
  }
}

async function cargar(): Promise<void> {
  cargando.value = true;
  error.value = null;
  try {
    const [datosCarta, respuestaTargets] = await Promise.all([
      getMyCard(),
      api.get('/targets'),
    ]);
    carta.value = datosCarta;
    const lista = (respuestaTargets as unknown as { targets?: HeroTarget[] }).targets;
    expedientes.value = Array.isArray(lista) ? lista : [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo cargar tu progreso.';
  } finally {
    cargando.value = false;
  }
  void cargarPerfil();
}

onMounted(cargar);

// ---------- cifras agregadas (todo calculado, nada inventado) ----------
const totalExpedientes = computed(() => expedientes.value.length);

const totalAnalisis = computed(() =>
  expedientes.value.reduce((suma, t) => suma + (Number(t.analysisCount) || 0), 0)
);

const hitosDelHeroe = computed<HitoDelHeroe[]>(() => {
  const acumulado: HitoDelHeroe[] = [];
  for (const target of expedientes.value) {
    for (const hito of target.milestones ?? []) {
      if (!hito.achieved) continue;
      const marca = hito.at ? Date.parse(hito.at) : Number.NaN;
      acumulado.push({
        id: `${target.id}:${hito.key}`,
        label: hito.label,
        chica: target.displayName,
        fecha: hito.at ?? null,
        // Sin fecha valida se manda al final: no se le inventa una posicion
        orden: Number.isNaN(marca) ? -Infinity : marca,
      });
    }
  }
  return acumulado.sort((a, b) => b.orden - a.orden);
});

const totalHitos = computed(() => hitosDelHeroe.value.length);

const porEtapa = computed<Array<{ etapa: string; total: number }>>(() => {
  const conteo = new Map<string, number>();
  for (const target of expedientes.value) {
    const etapa = (target.stage || '').trim() || 'SIN ETAPA';
    conteo.set(etapa, (conteo.get(etapa) ?? 0) + 1);
  }
  return [...conteo.entries()]
    .map(([etapa, total]) => ({ etapa, total }))
    .sort((a, b) => b.total - a.total || a.etapa.localeCompare(b.etapa));
});

const sinExpedientes = computed(() => totalExpedientes.value === 0);

// ---------- lo que falta ----------
const bloqueadasOrdenadas = computed<PowerLockedField[]>(() =>
  [...(carta.value?.locked ?? [])].sort((a, b) => b.gain - a.gain)
);

const gananciaPendiente = computed(() =>
  bloqueadasOrdenadas.value.reduce((suma, b) => suma + b.gain, 0)
);

// ---------- formato ----------
const formateadorFecha = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function fechaLegible(iso: string | null): string {
  if (!iso) return 'Sin fecha';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return 'Sin fecha';
  return formateadorFecha.format(fecha);
}

// Las etapas llegan como enum del backend (PRIMER_CONTACTO): se limpia el
// guion bajo para leerlas, pero no se traduce ni se renombra nada.
function etapaLegible(etapa: string): string {
  return etapa.replace(/_/g, ' ');
}

function irAOnboarding(): void {
  router.push('/onboarding');
}

function irABoveda(): void {
  router.push('/vault');
}
</script>

<template>
  <div class="hero-view">
    <header class="hero-head">
      <h1 class="hero-head__title">Tu progreso</h1>
      <p class="hero-head__sub">
        Tu carta, tus cifras y tu historial. Todo sale de lo que ya has trabajado.
      </p>
    </header>

    <!-- Cargando: esqueleto propio, sin librerias -->
    <div v-if="cargando" class="hero-skeleton" aria-busy="true" aria-live="polite">
      <div class="sk-card"></div>
      <div class="sk-sections">
        <div class="sk-line sk-line--title"></div>
        <div class="sk-line"></div>
        <div class="sk-line"></div>
        <div class="sk-line sk-line--title"></div>
        <div class="sk-line"></div>
      </div>
    </div>

    <!-- Error: sobrio y con salida -->
    <section v-else-if="error" class="hero-error" role="alert">
      <BaseIcon name="risk" size="lg" color="red" />
      <p class="hero-error__msg">{{ error }}</p>
      <button type="button" class="btn-primary" @click="cargar">
        <BaseIcon name="rotate" size="xs" color="cream" />
        <span>Reintentar</span>
      </button>
    </section>

    <div v-else-if="carta" class="hero-body">
      <!-- Columna de la carta -->
      <aside class="hero-aside">
        <PowerCard
          :card="carta"
          :animate="true"
          :player-name="nombreHeroe"
          @next-best="irAOnboarding"
        />

        <ProfileCompletenessBadge
          v-if="completitud"
          class="hero-aside__badge"
          :score="completitud.score"
          :impact="completitud.impact"
          @click="irAOnboarding"
        />
      </aside>

      <!-- Columna de secciones -->
      <div class="hero-sections">
        <!-- 1. Cifras agregadas -->
        <section class="panel">
          <header class="panel__head">
            <BaseIcon name="meters" size="sm" color="cream" />
            <h2 class="panel__title">Tu operacion</h2>
          </header>

          <ul class="cifras">
            <li class="cifra">
              <span class="cifra__valor">{{ totalExpedientes }}</span>
              <span class="cifra__label">Expedientes activos</span>
            </li>
            <li class="cifra">
              <span class="cifra__valor">{{ totalAnalisis }}</span>
              <span class="cifra__label">Analisis realizados</span>
            </li>
            <li class="cifra">
              <span class="cifra__valor">{{ totalHitos }}</span>
              <span class="cifra__label">Hitos cumplidos</span>
            </li>
          </ul>

          <p v-if="sinExpedientes" class="panel__empty">
            Todavia no tienes expedientes abiertos. Tus cifras son cero hasta que
            subas tu primera captura.
          </p>

          <div v-else class="etapas">
            <h3 class="etapas__title">Reparto por etapa</h3>
            <ul class="etapas__list">
              <li v-for="fila in porEtapa" :key="fila.etapa" class="etapa">
                <div class="etapa__head">
                  <span class="etapa__nombre">{{ etapaLegible(fila.etapa) }}</span>
                  <span class="etapa__total">{{ fila.total }}</span>
                </div>
                <!-- La barra es proporcion sobre el total real, no una nota -->
                <StatBar
                  :value="(fila.total / totalExpedientes) * 100"
                  tone="cream"
                  :height="3"
                />
              </li>
            </ul>
          </div>
        </section>

        <!-- 2. Lo que te falta -->
        <section class="panel">
          <header class="panel__head">
            <BaseIcon name="lock" size="sm" color="cream" />
            <h2 class="panel__title">Lo que te falta</h2>
            <span v-if="gananciaPendiente > 0" class="panel__tag">
              +{{ gananciaPendiente }} en juego
            </span>
          </header>

          <template v-if="bloqueadasOrdenadas.length">
            <ul class="faltantes">
              <li
                v-for="bloqueada in bloqueadasOrdenadas"
                :key="bloqueada.field"
                class="faltante"
              >
                <p class="faltante__pregunta">{{ bloqueada.question }}</p>
                <span class="faltante__gain">
                  +{{ bloqueada.gain }} a {{ bloqueada.statKey }}
                </span>
              </li>
            </ul>

            <button type="button" class="btn-primary" @click="irAOnboarding">
              <BaseIcon name="arrowUp" size="xs" color="cream" />
              <span>Completar la auditoria</span>
              <BaseIcon name="arrowRight" size="xs" color="muted" />
            </button>
          </template>

          <div v-else class="completo">
            <BaseIcon name="check" size="sm" color="sage" />
            <p class="completo__texto">
              Perfil completo. No queda ningun dato por responder: tu carta ya
              refleja todo lo que sabemos de ti.
            </p>
          </div>
        </section>

        <!-- 3. Historial de hitos -->
        <section class="panel">
          <header class="panel__head">
            <BaseIcon name="history" size="sm" color="cream" />
            <h2 class="panel__title">Tus hitos</h2>
          </header>

          <ul v-if="hitosDelHeroe.length" class="hitos">
            <li v-for="hito in hitosDelHeroe" :key="hito.id" class="hito">
              <BaseIcon name="check" size="xs" color="sage" />
              <div class="hito__cuerpo">
                <span class="hito__label">{{ hito.label }}</span>
                <span class="hito__chica">{{ hito.chica }}</span>
              </div>
              <span class="hito__fecha">{{ fechaLegible(hito.fecha) }}</span>
            </li>
          </ul>

          <div v-else class="panel__empty-block">
            <p class="panel__empty">
              No has marcado ningun hito todavia. Se marcan dentro de cada
              expediente, en la Boveda.
            </p>
            <button type="button" class="btn-ghost" @click="irABoveda">
              <BaseIcon name="vault" size="xs" color="cream" />
              <span>Ir a la Boveda</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// Mobile-first: una sola columna, todo apilado
.hero-view {
  @include stack(20px);
  width: 100%;
  padding: 24px clamp(16px, 4vw, 24px) 60px;
}

.hero-head {
  @include stack(6px);

  &__title {
    font-size: $fs-xl;
    font-weight: $fw-bold;
    color: $alfii-cream;
  }

  &__sub {
    font-size: $fs-xs;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.62);
  }
}

// ---------- esqueleto ----------
.hero-skeleton {
  @include stack(20px);
}

.sk-card {
  width: 100%;
  max-width: 340px;
  height: 300px;
  border-radius: 22px;
  background-color: rgba($alfii-cream, 0.06);
  animation: heroPulse 1.4s $ease-in-out infinite;
}

.sk-sections {
  @include stack(10px);
}

.sk-line {
  height: 14px;
  border-radius: 8px;
  background-color: rgba($alfii-cream, 0.06);
  animation: heroPulse 1.4s $ease-in-out infinite;

  &--title {
    width: 45%;
    height: 20px;
  }
}

// El esqueleto no puede competir con el contenido: solo respira
@keyframes heroPulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.9; }
}

// ---------- error ----------
.hero-error {
  @include stack(12px, flex-start);
  @include card-surface;
  border-color: rgba($alfii-red, 0.3);

  &__msg {
    font-size: $fs-sm;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.82);
  }
}

// ---------- cuerpo ----------
.hero-body {
  @include stack(20px);
}

.hero-aside {
  @include stack(12px, center);

  &__badge {
    width: 100%;
    max-width: 340px;
  }
}

.hero-sections {
  @include stack(16px);
}

.panel {
  @include card-surface;
  @include stack(14px);

  &__head {
    @include row(8px, center, flex-start);
  }

  &__title {
    font-size: $fs-md;
    font-weight: $fw-bold;
    color: $alfii-cream;
  }

  &__tag {
    margin-left: auto;
    padding: 2px 8px;
    border-radius: 999px;
    border: 1px solid rgba($alfii-sage, 0.45);
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    color: $alfii-sage;
  }

  &__empty {
    font-size: $fs-xs;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.6);
  }

  &__empty-block {
    @include stack(12px, flex-start);
  }
}

// ---------- cifras ----------
.cifras {
  @include row(10px, stretch, flex-start);
  flex-wrap: wrap;
  list-style: none;
  margin: 0;
  padding: 0;
}

.cifra {
  @include stack(2px, flex-start);
  flex: 1 1 90px;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background-color: rgba($alfii-navy, 0.5);
  border: 1px solid rgba($alfii-cream, 0.08);

  &__valor {
    font-size: $fs-2xl;
    font-weight: $fw-extrabold;
    line-height: $lh-tight;
    color: $alfii-cream;
    font-variant-numeric: tabular-nums;
  }

  &__label {
    font-size: $fs-2xs;
    font-weight: $fw-medium;
    line-height: $lh-snug;
    color: rgba($alfii-cream, 0.58);
  }
}

.etapas {
  @include stack(8px);

  &__title {
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.5);
  }

  &__list {
    @include stack(10px);
    list-style: none;
    margin: 0;
    padding: 0;
  }
}

.etapa {
  @include stack(4px);

  &__head {
    @include row(8px, center, space-between);
  }

  &__nombre {
    font-size: $fs-xs;
    font-weight: $fw-semibold;
    letter-spacing: 0.04em;
    color: rgba($alfii-cream, 0.8);
  }

  &__total {
    font-size: $fs-xs;
    font-weight: $fw-bold;
    color: $alfii-cream;
    font-variant-numeric: tabular-nums;
  }
}

// ---------- lo que falta ----------
.faltantes {
  @include stack(8px);
  list-style: none;
  margin: 0;
  padding: 0;
}

.faltante {
  @include row(10px, center, space-between);
  padding: 10px 12px;
  border-radius: 12px;
  background-color: rgba($alfii-navy, 0.5);
  border: 1px solid rgba($alfii-cream, 0.08);

  &__pregunta {
    flex: 1 1 auto;
    min-width: 0;
    font-size: $fs-xs;
    line-height: $lh-snug;
    color: rgba($alfii-cream, 0.85);
  }

  // La ganancia es el argumento de venta: no se envuelve ni se encoge
  &__gain {
    flex: 0 0 auto;
    font-size: $fs-2xs;
    font-weight: $fw-extrabold;
    color: $alfii-sage;
    white-space: nowrap;
  }
}

.completo {
  @include row(10px, flex-start, flex-start);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba($alfii-sage, 0.35);
  background-color: rgba($alfii-sage, 0.1);

  &__texto {
    font-size: $fs-xs;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.85);
  }
}

// ---------- hitos ----------
.hitos {
  @include stack(8px);
  list-style: none;
  margin: 0;
  padding: 0;
}

.hito {
  @include row(10px, center, flex-start);
  padding: 10px 12px;
  border-radius: 12px;
  background-color: rgba($alfii-navy, 0.5);
  border: 1px solid rgba($alfii-cream, 0.08);

  &__cuerpo {
    @include stack(2px, flex-start);
    flex: 1 1 auto;
    min-width: 0;
  }

  &__label {
    font-size: $fs-xs;
    font-weight: $fw-semibold;
    color: $alfii-cream;
  }

  &__chica {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.55);
  }

  &__fecha {
    flex: 0 0 auto;
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.5);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
}

// ---------- botones ----------
.btn-primary {
  @include row(8px, center, center);
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba($alfii-red, 0.45);
  background-color: rgba($alfii-red, 0.18);
  cursor: pointer;
  font-size: $fs-xs;
  font-weight: $fw-bold;
  color: $alfii-cream;
  transition: background-color $dur-fast $ease-out, border-color $dur-fast $ease-out;

  &:hover {
    background-color: rgba($alfii-red, 0.28);
    border-color: rgba($alfii-red, 0.7);
  }
}

.btn-ghost {
  @include row(8px, center, center);
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba($alfii-cream, 0.15);
  background-color: rgba($alfii-navy, 0.5);
  cursor: pointer;
  font-size: $fs-xs;
  font-weight: $fw-semibold;
  color: $alfii-cream;
  transition: border-color $dur-fast $ease-out;

  &:hover { border-color: rgba($alfii-cream, 0.3); }
}

// ---------- tablet y escritorio ----------
// A partir de 768px la carta se fija a un lado y las secciones ocupan el resto:
// leer la carta y el detalle a la vez es lo que hace util esta pantalla.
@media (min-width: 768px) {
  .hero-view {
    padding: 32px clamp(20px, 4vw, 40px) 72px;
  }

  .hero-head__title { font-size: $fs-2xl; }
  .hero-head__sub { font-size: $fs-sm; }

  .hero-body {
    @include row(24px, flex-start, flex-start);
  }

  .hero-aside {
    flex: 0 0 300px;
    position: sticky;
    top: 24px;
  }

  .hero-sections {
    flex: 1 1 auto;
    min-width: 0;
  }

  .hero-skeleton {
    @include row(24px, flex-start, flex-start);
  }

  .sk-card { flex: 0 0 300px; }
  .sk-sections { flex: 1 1 auto; min-width: 0; }

  .cifra { flex: 1 1 120px; }
}

@media (min-width: 1280px) {
  .hero-view {
    max-width: 1180px;
    margin: 0 auto;
  }

  .hero-body { gap: 32px; }

  .hero-aside { flex: 0 0 380px; }

  .sk-card { flex: 0 0 380px; }

  .hero-sections { gap: 20px; }

  .cifra__valor { font-size: $fs-3xl; }
}
</style>
