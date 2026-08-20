<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import RiskBadge from '@/components/shared/RiskBadge.vue';
import MeterBar from '@/components/shared/MeterBar.vue';
import ProfileCompletenessBadge from '@/components/shared/ProfileCompletenessBadge.vue';
import MilestoneTrack, { type Milestone, type MilestoneKey } from '@/components/shared/MilestoneTrack.vue';
import MilestoneSheet from '@/components/modals/MilestoneSheet.vue';
import MergeTargetsSheet from '@/components/modals/MergeTargetsSheet.vue';
import HerProfileSheet, {
  type HerProfile,
  type HerCompleteness,
} from '@/components/modals/HerProfileSheet.vue';
import { useTargetStore, type TargetSummary } from '@/stores/target';
import { useModal } from '@/composables/useModal';
import type { IconName } from '@/config/icons';
import api from '@/services/http';

const router = useRouter();
const targetStore = useTargetStore();
const { open } = useModal();

/**
 * El store aun no tipa los datos de ella, pero el endpoint /targets si los
 * manda. Se extiende aqui para no tocar un archivo que no pertenece a esta vista.
 */
type VaultTarget = TargetSummary & {
  milestones?: Milestone[];
  herProfile?: HerProfile | null;
  herCompleteness?: HerCompleteness;
};

const completeness = ref({ score: 0, impact: '' });
const search = ref('');

/** Etapas en lenguaje natural: el enum crudo no le dice nada al usuario. */
const STAGE_LABELS: Record<string, string> = {
  APERTURA: 'Apertura',
  CALIBRACION: 'Calibrando',
  ESCALADA: 'Escalando',
  CITA_AGENDADA: 'Cita agendada',
  POST_CITA: 'Después de la cita',
  ENFRIADO: 'Enfriado',
  CERRADO: 'Cerrado',
};

/** Respaldo por si el backend manda el arquetipo sin label legible. */
const ARCHETYPE_LABELS: Record<string, string> = {
  KOAKUMA: 'Koakuma',
  HIMEDERE: 'Himedere',
  ONEE_SAN: 'Onee-san',
  TSUN_KUUDERE: 'Tsun-kuudere',
  DEREDERE: 'Deredere',
  DANDERE: 'Dandere',
  YANDERE: 'Yandere',
};

/** Cada medidor pertenece a un hito: cumplido el hito, el medidor sobra. */
const METER_DEFS: { key: MilestoneKey; label: string; icon: IconName; field: 'kiss' | 'firstDate' | 'firstNight' }[] = [
  { key: 'firstDate', label: 'Primera salida', icon: 'firstDate', field: 'firstDate' },
  { key: 'firstKiss', label: 'Primer beso', icon: 'kiss', field: 'kiss' },
  { key: 'firstNight', label: 'Primera noche', icon: 'firstNight', field: 'firstNight' },
];

const targets = computed(() => targetStore.targets as VaultTarget[]);

// Lo mas reciente arriba: la boveda es una bandeja de trabajo, no un archivo
const sorted = computed(() =>
  [...targets.value].sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  })
);

// El buscador solo aparece cuando la lista ya no se abarca de un vistazo
const showSearch = computed(() => targets.value.length > 4);

const visible = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q || !showSearch.value) return sorted.value;
  return sorted.value.filter((t) => t.displayName.toLowerCase().includes(q));
});

/** Normaliza el nombre para comparar: minusculas y sin espacios de sobra. */
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Duplicados historicos: hay expedientes creados antes de que existiera la
 * deteccion de nombres repetidos. Se avisa arriba en vez de fusionar solo,
 * porque unir dos memorias distintas no se puede deshacer.
 */
const duplicateGroups = computed(() => {
  const buckets = new Map<string, VaultTarget[]>();
  for (const t of sorted.value) {
    const key = normalizeName(t.displayName);
    const list = buckets.get(key);
    if (list) list.push(t);
    else buckets.set(key, [t]);
  }
  return [...buckets.values()].filter((g) => g.length > 1);
});

onMounted(async () => {
  await targetStore.fetchTargets();
  try {
    const comp: any = await api.get('/profile/completeness');
    completeness.value = comp;
  } catch {
    // Si falla, el badge se queda en 0 y no rompe la boveda
  }
});

function milestonesOf(t: VaultTarget): Milestone[] {
  return t.milestones ?? [];
}

function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] || 'Apertura';
}

function archetypeLabel(t: VaultTarget): string {
  if (!t.archetype) return '';
  return t.archetype.label || ARCHETYPE_LABELS[t.archetype.primary] || '';
}

/** Solo los medidores de hitos todavia pendientes. */
function pendingMeters(t: VaultTarget) {
  const done = new Set(milestonesOf(t).filter((m) => m.achieved).map((m) => m.key));
  return METER_DEFS.filter((d) => !done.has(d.key)).map((d) => ({
    ...d,
    value: t.meters?.[d.field] ?? 0,
  }));
}

function relativeActivity(iso?: string): string {
  if (!iso) return 'Sin actividad';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return 'Sin actividad';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return 'Hace minutos';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Hace ${days} d`;
  return 'Hace meses';
}

function goToChat(id: string) {
  router.push(`/chat/${id}`);
}

function goToUpload() {
  router.push('/nueva');
}

/** Reemplaza en sitio el expediente que devuelve el backend. */
function replaceTarget(updated: VaultTarget) {
  const idx = targetStore.targets.findIndex((x) => x.id === updated.id);
  if (idx !== -1) targetStore.targets.splice(idx, 1, updated);
}

/** Abre la hoja de hitos sin salir de la boveda. */
function openMilestones(t: VaultTarget) {
  open('milestones', MilestoneSheet, {
    targetId: t.id,
    displayName: t.displayName,
    milestones: milestonesOf(t),
    // Refresca la lista cuando la hoja confirma un cambio en el backend
    onSaved: replaceTarget,
  });
}

/** Cuanto falta por saber de ella, en puntos de porcentaje. */
function herGap(t: VaultTarget): number {
  const score = t.herCompleteness?.score ?? 0;
  return Math.max(0, 100 - score);
}

function openHerProfile(t: VaultTarget) {
  open('herProfile', HerProfileSheet, {
    targetId: t.id,
    displayName: t.displayName,
    herProfile: t.herProfile ?? null,
    onSaved: replaceTarget,
  });
}

function openMerge(group: VaultTarget[]) {
  open('mergeTargets', MergeTargetsSheet, {
    group,
    // Tras fusionar cambia el numero de expedientes: se recarga la boveda entera
    onMerged: async () => {
      await targetStore.fetchTargets();
    },
  });
}
</script>

<template>
  <div class="vault-view">
    <header class="vault-header">
      <div class="header-top">
        <div class="header-title">
          <h1>Bóveda</h1>
          <span class="subtitle">
            {{ targets.length }} {{ targets.length === 1 ? 'expediente' : 'expedientes' }}
          </span>
        </div>

        <button class="add-btn" @click="goToUpload">
          <BaseIcon name="plus" size="sm" color="cream" />
          <span>Nueva chica</span>
        </button>
      </div>

      <ProfileCompletenessBadge
        :score="completeness.score"
        :impact="completeness.impact"
        @click="router.push('/onboarding')"
      />

      <div v-if="showSearch" class="search-box">
        <BaseIcon name="folder" size="sm" color="muted" />
        <input v-model="search" type="text" placeholder="Buscar por nombre..." />
        <button v-if="search" class="clear-btn" aria-label="Limpiar" @click="search = ''">
          <BaseIcon name="close" size="xs" color="muted" />
        </button>
      </div>
    </header>

    <!-- Aviso de duplicados: va encima de la rejilla porque ensucia todo lo de
         abajo (la memoria de la misma chica partida en dos fichas) -->
    <div v-if="duplicateGroups.length" class="dup-alerts">
      <div v-for="g in duplicateGroups" :key="g[0]?.id" class="dup-alert">
        <BaseIcon name="info" size="sm" color="cream" />
        <p>
          Tienes <strong>{{ g.length }}</strong> expedientes de
          <strong>{{ g[0]?.displayName }}</strong>
        </p>
        <button class="dup-btn" @click="openMerge(g)">Revisar</button>
      </div>
    </div>

    <div v-if="targetStore.loading && targets.length === 0" class="state-block">
      <BaseIcon name="spinner" spin size="lg" color="cream" />
    </div>

    <div v-else-if="targets.length === 0" class="state-block empty-vault">
      <BaseIcon name="folder" size="2xl" color="muted" />
      <h3>Tu bóveda está vacía</h3>
      <p>
        Sube una captura de la conversación y Alfii creará el expediente: arquetipo, riesgo y los
        hitos que vayan cayendo.
      </p>
      <button class="cta-btn" @click="goToUpload">
        <BaseIcon name="upload" color="cream" size="base" />
        <span>Subir primera captura</span>
      </button>
    </div>

    <div v-else-if="visible.length === 0" class="state-block">
      <BaseIcon name="folder" size="xl" color="muted" />
      <h3>Sin coincidencias</h3>
      <p>Ninguna de tus chicas se llama así.</p>
    </div>

    <div v-else class="targets-wrap">
      <article
        v-for="t in visible"
        :key="t.id"
        class="target-card"
        @click="goToChat(t.id)"
      >
        <div class="card-head">
          <div class="avatar" :class="`accent-${t.accentColor}`">
            <span>{{ t.avatarInitial }}</span>
          </div>

          <div class="head-text">
            <span class="name">{{ t.displayName }}</span>
            <span class="stage">{{ stageLabel(t.stage) }}</span>
          </div>

          <RiskBadge :level="(t.risk.level as any)" />
        </div>

        <div class="card-tags">
          <span v-if="archetypeLabel(t)" class="tag tag-arq">
            <BaseIcon name="archetype" size="xs" color="sage" />
            {{ archetypeLabel(t) }}
          </span>
          <span class="tag">
            <BaseIcon name="history" size="xs" color="muted" />
            {{ relativeActivity(t.lastMessageAt) }}
          </span>
          <span v-if="t.herProfile?.instagram" class="tag tag-ig">
            <BaseIcon name="platform.instagram" size="xs" color="muted" />
            @{{ t.herProfile.instagram }}
          </span>
        </div>

        <div class="card-track">
          <MilestoneTrack
            :milestones="milestonesOf(t)"
            compact
            @toggle="openMilestones(t)"
          />
        </div>

        <div v-if="pendingMeters(t).length" class="card-meters">
          <MeterBar
            v-for="m in pendingMeters(t)"
            :key="m.key"
            :label="m.label"
            :value="m.value"
            :icon="m.icon"
          />
        </div>
        <p v-else class="all-done">
          <BaseIcon name="check" size="xs" color="sage" />
          Todos los hitos cumplidos
        </p>

        <!-- Solo si falta algo: al 100% este aviso seria ruido -->
        <button
          v-if="herGap(t) > 0"
          class="her-hint"
          @click.stop.prevent="openHerProfile(t)"
        >
          <BaseIcon name="step.PREFERRED_NAME" size="xs" color="muted" />
          <span>Sé poco de ella · completar perfil</span>
          <strong>+{{ herGap(t) }}%</strong>
        </button>

        <footer class="card-foot">
          <!-- stop + prevent: el boton de hitos NO debe navegar al chat -->
          <button class="foot-btn" @click.stop.prevent="openMilestones(t)">
            <BaseIcon name="listCheck" size="sm" color="cream" />
            <span>Hitos</span>
          </button>
          <span class="foot-open">
            Abrir chat
            <BaseIcon name="arrowRight" size="xs" color="muted" />
          </span>
        </footer>
      </article>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// Base movil primero: una columna, sin lujos
.vault-view {
  @include stack(18px);
  width: 100%;
  padding: 20px 16px 72px;
}

.vault-header {
  @include stack(12px);
}

.header-top {
  @include row(12px, flex-start, space-between);

  .header-title {
    @include stack(2px);

    h1 {
      font-size: $fs-xl;
      font-weight: $fw-extrabold;
      color: $alfii-cream;
      line-height: $lh-tight;
    }

    .subtitle {
      font-size: $fs-2xs;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: rgba($alfii-cream, 0.5);
    }
  }

  .add-btn {
    @include row(6px);
    flex: 0 0 auto;
    padding: 10px 14px;
    background-color: $alfii-red;
    color: $alfii-cream;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    border-radius: 12px;
    cursor: pointer;
    transition: transform $dur-fast $ease-out;

    &:hover { transform: translateY(-1px); }
  }
}

.search-box {
  @include row(10px, center);
  padding: 10px 14px;
  background-color: rgba($alfii-navy, 0.6);
  border: 1px solid rgba($alfii-cream, 0.12);
  border-radius: 12px;

  input {
    flex: 1 1 auto;
    min-width: 0;
    background: transparent;
    border: none;
    font-size: $fs-sm;
    color: $alfii-cream;

    &::placeholder { color: rgba($alfii-cream, 0.4); }
    &:focus { outline: none; }
  }

  .clear-btn {
    flex: 0 0 auto;
    padding: 4px;
    border-radius: 50%;
    cursor: pointer;
  }
}

.state-block {
  @include stack(12px, center);
  padding: 56px 8px;
  text-align: center;

  h3 {
    font-size: $fs-md;
    font-weight: $fw-bold;
    color: $alfii-cream;
  }

  p {
    font-size: $fs-xs;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.6);
    max-width: 320px;
  }

  .cta-btn {
    @include row(8px);
    margin-top: 6px;
    padding: 14px 22px;
    background-color: $alfii-red;
    color: $alfii-cream;
    font-weight: $fw-bold;
    font-size: $fs-sm;
    border-radius: 14px;
    cursor: pointer;
  }
}

.dup-alerts {
  @include stack(8px);
}

.dup-alert {
  @include row(10px, center);
  flex-wrap: wrap;
  padding: 12px 14px;
  background-color: rgba($alfii-red, 0.1);
  border: 1px solid rgba($alfii-red, 0.3);
  border-radius: 14px;

  p {
    flex: 1 1 180px;
    min-width: 0;
    font-size: $fs-xs;
    line-height: $lh-snug;
    color: rgba($alfii-cream, 0.85);

    strong { color: $alfii-cream; font-weight: $fw-bold; }
  }

  .dup-btn {
    flex: 0 0 auto;
    padding: 8px 14px;
    border-radius: 10px;
    background-color: $alfii-red;
    color: $alfii-cream;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    cursor: pointer;
  }
}

.her-hint {
  @include row(8px, center, flex-start);
  width: 100%;
  padding: 9px 12px;
  border-radius: 10px;
  background-color: rgba($alfii-cream, 0.05);
  border: 1px dashed rgba($alfii-cream, 0.18);
  font-size: $fs-2xs;
  color: rgba($alfii-cream, 0.6);
  text-align: left;
  cursor: pointer;
  transition: border-color $dur-fast $ease-out, color $dur-fast $ease-out;

  span {
    flex: 1 1 auto;
    min-width: 0;
  }

  strong {
    flex: 0 0 auto;
    color: $alfii-sage;
    font-weight: $fw-bold;
  }

  &:hover {
    border-color: rgba($alfii-sage, 0.45);
    color: rgba($alfii-cream, 0.85);
  }
}

// Rejilla SOLO con flex-wrap. Cero CSS grid en todo el proyecto.
.targets-wrap {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 14px;
  width: 100%;
}

.target-card {
  @include card-surface;
  @include stack(14px);
  flex: 1 1 320px;
  min-width: 0;
  cursor: pointer;
}

.card-head {
  @include row(12px, center);

  .avatar {
    flex: 0 0 auto;
    width: 46px;
    height: 46px;
    border-radius: 50%;
    @include center;
    font-size: $fs-md;
    font-weight: $fw-extrabold;
    color: $alfii-cream;

    &.accent-red { background-color: rgba($alfii-red, 0.3); border: 1px solid $alfii-red; }
    &.accent-sage { background-color: rgba($alfii-sage, 0.3); border: 1px solid $alfii-sage; }
    &.accent-cream { background-color: rgba($alfii-cream, 0.2); border: 1px solid $alfii-cream; }
    &.accent-plum { background-color: rgba($alfii-plum, 0.9); border: 1px solid rgba($alfii-cream, 0.2); }
    &.accent-navy { background-color: rgba($alfii-navy, 0.8); border: 1px solid rgba($alfii-cream, 0.2); }
  }

  .head-text {
    @include stack(2px);
    flex: 1 1 auto;
    min-width: 0;

    .name {
      font-size: $fs-md;
      font-weight: $fw-bold;
      color: $alfii-cream;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .stage {
      font-size: $fs-2xs;
      color: rgba($alfii-cream, 0.55);
    }
  }
}

.card-tags {
  @include row(8px, center, flex-start);
  flex-wrap: wrap;

  .tag {
    @include row(5px);
    padding: 4px 9px;
    border-radius: 20px;
    font-size: $fs-2xs;
    font-weight: $fw-medium;
    color: rgba($alfii-cream, 0.65);
    background-color: rgba($alfii-cream, 0.06);
  }

  .tag-arq {
    color: $alfii-sage;
    background-color: rgba($alfii-sage, 0.1);
    font-weight: $fw-semibold;
  }

  .tag-ig {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 160px;
  }
}

.card-track {
  padding: 10px 0 2px;
  border-top: 1px solid rgba($alfii-cream, 0.06);
  border-bottom: 1px solid rgba($alfii-cream, 0.06);
}

.card-meters {
  @include stack(10px);
}

.all-done {
  @include row(6px);
  font-size: $fs-xs;
  font-weight: $fw-semibold;
  color: $alfii-sage;
}

.card-foot {
  @include row(10px, center, space-between);

  .foot-btn {
    @include row(6px);
    padding: 8px 12px;
    border-radius: 10px;
    background-color: rgba($alfii-cream, 0.08);
    border: 1px solid rgba($alfii-cream, 0.14);
    font-size: $fs-xs;
    font-weight: $fw-bold;
    color: $alfii-cream;
    cursor: pointer;

    &:hover { background-color: rgba($alfii-cream, 0.14); }
  }

  .foot-open {
    @include row(5px);
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.5);
  }
}

// Tablet: mas aire y dos tarjetas por fila gracias al flex-basis
@media (min-width: 768px) {
  .vault-view {
    padding: 28px clamp(20px, 3vw, 32px) 80px;
    gap: 22px;
  }

  .header-top .header-title h1 {
    font-size: $fs-2xl;
  }

  .targets-wrap {
    gap: 18px;
  }
}

// Escritorio: se usa TODO el ancho, sin max-width que deje la pantalla vacia
@media (min-width: 1280px) {
  .vault-view {
    padding: 36px 40px 96px;
  }

  .vault-header {
    @include row(20px, center, space-between);
    flex-wrap: wrap;

    .header-top {
      flex: 1 1 360px;
    }

    .search-box {
      flex: 1 1 260px;
      max-width: 360px;
    }
  }

  .targets-wrap {
    gap: 20px;
  }

  .target-card {
    flex: 1 1 320px;
    max-width: 460px;
  }
}
</style>
