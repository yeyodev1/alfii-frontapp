<script setup lang="ts">
import { ref, computed } from 'vue';
import BaseSheet from '@/components/modals/BaseSheet.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import MilestoneTrack, {
  MILESTONE_ICONS,
  sortMilestones,
  type Milestone,
  type MilestoneKey,
} from '@/components/shared/MilestoneTrack.vue';
import api from '@/services/http';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  targetId: string;
  displayName: string;
  milestones: Milestone[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', target: any): void;
}>();

const toastStore = useToastStore();

// Copia local: la hoja responde al toque al instante y el backend confirma despues
const local = ref<Milestone[]>(sortMilestones(props.milestones).map((m) => ({ ...m })));
const savingKey = ref<MilestoneKey | null>(null);
// Clave del hito que espera confirmacion para desmarcarse (nada de confirm() nativo)
const pendingUndo = ref<MilestoneKey | null>(null);

const rows = computed(() =>
  local.value.map((m) => ({
    ...m,
    icon: MILESTONE_ICONS[m.key],
    dateText: formatDate(m.at),
  }))
);

const achievedCount = computed(() => local.value.filter((m) => m.achieved).length);

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Punto unico de escritura: cualquier camino termina llamando aqui. */
async function persist(key: MilestoneKey, achieved: boolean) {
  if (savingKey.value) return;
  savingKey.value = key;
  pendingUndo.value = null;

  try {
    const res: any = await api.patch(`/targets/${props.targetId}/milestone`, { key, achieved });
    // El backend devuelve el target completo: es la unica verdad sobre fechas
    if (res?.target?.milestones) {
      local.value = sortMilestones(res.target.milestones).map((m: Milestone) => ({ ...m }));
    }
    if (res?.target) emit('saved', res.target);
  } catch {
    // El interceptor de http ya mostro el error; solo se evita dejar el estado sucio
    toastStore.show('No se pudo guardar el hito', 'error');
  } finally {
    savingKey.value = null;
  }
}

function onToggle(key: MilestoneKey) {
  const item = local.value.find((m) => m.key === key);
  if (!item || savingKey.value) return;

  if (item.achieved) {
    // Desmarcar borra una fecha real: se pide confirmacion dentro de la hoja
    pendingUndo.value = pendingUndo.value === key ? null : key;
    return;
  }
  persist(key, true);
}

function cancelUndo() {
  pendingUndo.value = null;
}
</script>

<template>
  <BaseSheet :title="`Hitos con ${displayName}`" @close="emit('close')">
    <div class="milestone-sheet">
      <p class="sheet-hint">
        Marca lo que ya pasó de verdad. Alfii ajusta los medidores y el tono de los scripts con
        esto.
      </p>

      <div class="track-preview">
        <MilestoneTrack :milestones="local" @toggle="onToggle" />
      </div>

      <ul class="milestone-list">
        <li
          v-for="m in rows"
          :key="m.key"
          class="milestone-row"
          :class="{ 'is-achieved': m.achieved, 'is-open': pendingUndo === m.key }"
        >
          <div class="row-main">
            <div class="row-icon">
              <BaseIcon :name="m.icon" :color="m.achieved ? 'sage' : 'muted'" size="base" />
            </div>

            <div class="row-text">
              <span class="row-label">{{ m.label }}</span>
              <span class="row-date">
                <template v-if="m.achieved && m.dateText">{{ m.dateText }}</template>
                <template v-else-if="m.achieved">Sin fecha registrada</template>
                <template v-else>Pendiente</template>
              </span>
            </div>

            <button
              type="button"
              class="row-switch"
              :class="{ on: m.achieved }"
              :disabled="savingKey !== null"
              :aria-label="`${m.achieved ? 'Desmarcar' : 'Marcar'} ${m.label}`"
              :aria-pressed="m.achieved"
              @click="onToggle(m.key)"
            >
              <BaseIcon v-if="savingKey === m.key" name="spinner" spin size="xs" color="cream" />
              <span v-else class="switch-knob"></span>
            </button>
          </div>

          <!-- Confirmacion en linea: no se usa confirm() del navegador -->
          <div v-if="pendingUndo === m.key" class="undo-confirm">
            <p>¿Borrar este hito? Se pierde la fecha guardada.</p>
            <div class="undo-actions">
              <button type="button" class="btn-ghost" @click="cancelUndo">Cancelar</button>
              <button type="button" class="btn-danger" @click="persist(m.key, false)">
                Sí, desmarcar
              </button>
            </div>
          </div>
        </li>
      </ul>

      <p class="sheet-footer">{{ achievedCount }} de {{ rows.length }} hitos cumplidos</p>
    </div>
  </BaseSheet>
</template>

<style lang="scss" scoped>
.milestone-sheet {
  @include stack(16px);
}

.sheet-hint {
  font-size: $fs-xs;
  color: rgba($alfii-cream, 0.7);
  line-height: $lh-relaxed;
}

.track-preview {
  padding: 16px 4px 4px;
  background-color: rgba($alfii-navy, 0.45);
  border: 1px solid rgba($alfii-cream, 0.08);
  border-radius: 14px;
}

.milestone-list {
  @include stack(8px);
  list-style: none;
}

.milestone-row {
  @include stack(10px);
  padding: 12px 14px;
  background-color: rgba($alfii-navy, 0.5);
  border: 1px solid rgba($alfii-cream, 0.08);
  border-radius: 14px;
  transition: border-color $dur-fast $ease-out;

  &.is-achieved {
    border-color: rgba($alfii-sage, 0.35);
  }

  &.is-open {
    border-color: rgba($alfii-red, 0.45);
  }
}

.row-main {
  @include row(12px, center);
}

.row-icon {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  @include center;
  background-color: rgba($alfii-cream, 0.06);
}

.row-text {
  @include stack(2px);
  flex: 1 1 auto;
  min-width: 0;

  .row-label {
    font-size: $fs-sm;
    font-weight: $fw-semibold;
    color: $alfii-cream;
  }

  .row-date {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.55);
  }
}

.row-switch {
  flex: 0 0 auto;
  width: 48px;
  height: 28px;
  border-radius: 14px;
  padding: 3px;
  background-color: rgba($alfii-cream, 0.12);
  border: 1px solid rgba($alfii-cream, 0.16);
  @include row(0, center, flex-start);
  cursor: pointer;
  transition: background-color $dur-base $ease-out, border-color $dur-base $ease-out;

  .switch-knob {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: rgba($alfii-cream, 0.65);
    transition: transform $dur-base $ease-spring, background-color $dur-base $ease-out;
  }

  &.on {
    background-color: rgba($alfii-sage, 0.45);
    border-color: $alfii-sage;
    justify-content: flex-end;

    .switch-knob {
      background-color: $alfii-cream;
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
}

.undo-confirm {
  @include stack(10px);
  padding: 12px;
  background-color: rgba($alfii-red, 0.1);
  border: 1px solid rgba($alfii-red, 0.3);
  border-radius: 12px;
  animation: fadeIn $dur-fast $ease-out forwards;

  p {
    font-size: $fs-xs;
    color: $alfii-cream;
    line-height: $lh-snug;
  }
}

.undo-actions {
  @include row(8px, center, flex-end);

  button {
    padding: 8px 14px;
    border-radius: 10px;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    cursor: pointer;
  }

  .btn-ghost {
    background-color: transparent;
    color: rgba($alfii-cream, 0.7);
    border: 1px solid rgba($alfii-cream, 0.18);
  }

  .btn-danger {
    background-color: $alfii-red;
    color: $alfii-cream;
  }
}

.sheet-footer {
  font-size: $fs-2xs;
  text-align: center;
  color: rgba($alfii-cream, 0.5);
}
</style>
