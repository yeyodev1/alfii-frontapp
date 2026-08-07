<script setup lang="ts">
import { ref, computed } from 'vue';
import BaseSheet from '@/components/modals/BaseSheet.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import api from '@/services/http';
import type { TargetSummary } from '@/stores/target';

/**
 * Unificacion de expedientes duplicados que ya viven en la base.
 *
 * PORQUE se elige el destino a mano: el backend mueve mensajes y analisis hacia
 * el que se queda y borra el origen. Nada de eso se puede deshacer, y el unico
 * que sabe cual ficha es la "buena" (nombre bien escrito, color, notas) es el
 * usuario. Adivinarlo por fecha seria rapido y equivocado la mitad de las veces.
 */

const props = defineProps<{
  group: TargetSummary[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'merged', target: TargetSummary): void;
}>();

const STAGE_LABELS: Record<string, string> = {
  APERTURA: 'Apertura',
  CALIBRACION: 'Calibrando',
  ESCALADA: 'Escalando',
  CITA_AGENDADA: 'Cita agendada',
  POST_CITA: 'Después de la cita',
  ENFRIADO: 'Enfriado',
  CERRADO: 'Cerrado',
};

// Se propone como destino el expediente con mas material acumulado: es el que
// mas duele perder si el usuario elige al reves por descuido.
const richest = computed(() =>
  [...props.group].sort((a, b) => {
    const byAnalysis = (b.analysisCount || 0) - (a.analysisCount || 0);
    if (byAnalysis !== 0) return byAnalysis;
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  })
);

const keeperId = ref<string>(richest.value[0]?.id ?? '');
const saving = ref(false);

const rows = computed(() =>
  richest.value.map((t) => ({
    id: t.id,
    displayName: t.displayName,
    avatarInitial: t.avatarInitial,
    accentColor: t.accentColor,
    stageLabel: STAGE_LABELS[t.stage] || 'Apertura',
    analysisCount: t.analysisCount || 0,
    activity: relativeActivity(t.lastMessageAt),
    achieved: (t.milestones || []).filter((m) => m.achieved).length,
    total: (t.milestones || []).length,
  }))
);

const keeper = computed(() => rows.value.find((r) => r.id === keeperId.value));
const donors = computed(() => rows.value.filter((r) => r.id !== keeperId.value));

function relativeActivity(iso?: string): string {
  if (!iso) return 'sin actividad';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return 'sin actividad';
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return 'activo hoy';
  if (days === 1) return 'activo ayer';
  if (days < 30) return `hace ${days} días`;
  return 'hace meses';
}

async function confirmMerge() {
  if (!keeperId.value || saving.value || donors.value.length === 0) return;
  saving.value = true;

  try {
    let result: TargetSummary | null = null;
    // Si hubiera tres o mas duplicados se absorben uno a uno, en serie: cada
    // llamada devuelve el destino ya actualizado y la siguiente parte de ahi.
    for (const donor of donors.value) {
      const res: any = await api.post(`/targets/${keeperId.value}/merge`, { fromId: donor.id });
      if (res?.target) result = res.target;
    }
    if (result) emit('merged', result);
    emit('close');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseSheet title="Unificar expedientes" @close="emit('close')">
    <div class="merge-sheet">
      <p class="lead">
        Tienes <strong>{{ group.length }}</strong> expedientes de
        <strong>{{ group[0]?.displayName }}</strong>. Elige cuál se queda: el resto se funde dentro
        de ese.
      </p>

      <ul class="target-list">
        <li
          v-for="r in rows"
          :key="r.id"
          class="target-option"
          :class="{ selected: keeperId === r.id }"
          @click="keeperId = r.id"
        >
          <span class="radio" :class="{ on: keeperId === r.id }">
            <BaseIcon v-if="keeperId === r.id" name="check" size="xs" color="plum" />
          </span>

          <div class="opt-avatar" :class="`accent-${r.accentColor}`">{{ r.avatarInitial }}</div>

          <div class="opt-meta">
            <strong>{{ r.displayName }}</strong>
            <span class="opt-line">{{ r.stageLabel }} · {{ r.activity }}</span>
            <span class="opt-line">
              {{ r.analysisCount }} {{ r.analysisCount === 1 ? 'análisis' : 'análisis' }} ·
              {{ r.achieved }}/{{ r.total }} hitos
            </span>
          </div>
        </li>
      </ul>

      <div class="explain">
        <BaseIcon name="info" size="sm" color="sage" />
        <p>
          No se pierde ningún mensaje ni ninguna captura: todo se mueve a
          <strong>{{ keeper?.displayName }}</strong
          >. Los hitos se quedan con la fecha más antigua, los medidores con el valor más alto y las
          red flags se suman.
        </p>
      </div>

      <div class="warn">
        <BaseIcon name="risk" size="sm" color="red" />
        <p>Esto no se puede deshacer. El otro expediente desaparece de la bóveda.</p>
      </div>

      <button class="confirm-btn" :disabled="saving || !keeperId" @click="confirmMerge">
        <BaseIcon v-if="saving" name="spinner" spin size="sm" color="cream" />
        <span>Unificar en este</span>
      </button>

      <button class="cancel-btn" :disabled="saving" @click="emit('close')">
        Dejarlos separados
      </button>
    </div>
  </BaseSheet>
</template>

<style lang="scss" scoped>
.merge-sheet {
  @include stack(16px);
}

.lead {
  font-size: $fs-sm;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.8);

  strong { color: $alfii-cream; }
}

.target-list {
  @include stack(10px);
  list-style: none;
}

.target-option {
  @include row(12px, center);
  padding: 12px 14px;
  background-color: rgba($alfii-navy, 0.5);
  border: 1px solid rgba($alfii-cream, 0.1);
  border-radius: 14px;
  cursor: pointer;
  transition: border-color $dur-fast $ease-out, background-color $dur-fast $ease-out;

  &.selected {
    border-color: $alfii-sage;
    background-color: rgba($alfii-sage, 0.1);
  }
}

.radio {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  @include center;
  border: 2px solid rgba($alfii-cream, 0.3);

  &.on {
    background-color: $alfii-sage;
    border-color: $alfii-sage;
  }
}

.opt-avatar {
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  @include center;
  font-size: $fs-sm;
  font-weight: $fw-extrabold;
  color: $alfii-cream;

  &.accent-red { background-color: rgba($alfii-red, 0.3); border: 1px solid $alfii-red; }
  &.accent-sage { background-color: rgba($alfii-sage, 0.3); border: 1px solid $alfii-sage; }
  &.accent-cream { background-color: rgba($alfii-cream, 0.2); border: 1px solid $alfii-cream; }
  &.accent-plum { background-color: rgba($alfii-plum, 0.9); border: 1px solid rgba($alfii-cream, 0.2); }
  &.accent-navy { background-color: rgba($alfii-navy, 0.8); border: 1px solid rgba($alfii-cream, 0.2); }
}

.opt-meta {
  @include stack(2px);
  flex: 1 1 auto;
  min-width: 0;

  strong {
    font-size: $fs-sm;
    font-weight: $fw-bold;
    color: $alfii-cream;
  }

  .opt-line {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.55);
  }
}

.explain, .warn {
  @include row(10px, flex-start);
  padding: 12px 14px;
  border-radius: 12px;

  p {
    font-size: $fs-xs;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.8);
  }

  strong { color: $alfii-cream; }
}

.explain {
  background-color: rgba($alfii-sage, 0.08);
  border-left: 3px solid $alfii-sage;
}

.warn {
  background-color: rgba($alfii-red, 0.1);
  border-left: 3px solid $alfii-red;
}

.confirm-btn {
  @include row(8px, center, center);
  width: 100%;
  padding: 16px;
  background-color: $alfii-sage;
  color: $alfii-navy;
  font-weight: $fw-bold;
  font-size: $fs-md;
  border-radius: 12px;
  cursor: pointer;

  &:disabled { opacity: 0.5; cursor: default; }
}

.cancel-btn {
  width: 100%;
  padding: 12px;
  font-size: $fs-xs;
  font-weight: $fw-semibold;
  color: rgba($alfii-cream, 0.6);
  background: transparent;
  cursor: pointer;
}
</style>
