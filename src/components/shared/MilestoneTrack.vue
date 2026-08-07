<script lang="ts">
import type { IconName } from '@/config/icons';

export type MilestoneKey = 'firstDate' | 'firstKiss' | 'firstNight' | 'relationship';

export interface Milestone {
  key: MilestoneKey;
  label: string;
  achieved: boolean;
  at: string | null;
}

/**
 * Orden canonico de la relacion. El backend puede mandar el arreglo en cualquier
 * orden, pero la linea de progreso solo tiene sentido si va de menos a mas.
 */
export const MILESTONE_ORDER: MilestoneKey[] = [
  'firstDate',
  'firstKiss',
  'firstNight',
  'relationship',
];

export const MILESTONE_ICONS: Record<MilestoneKey, IconName> = {
  firstDate: 'firstDate',
  firstKiss: 'kiss',
  firstNight: 'firstNight',
  relationship: 'handHoldingHeart',
};

/**
 * Etiquetas cortas para la linea. Las del backend ("Primera noche juntos") no
 * caben debajo de un punto en movil, asi que se recortan solo aqui.
 */
export const MILESTONE_SHORT_LABELS: Record<MilestoneKey, string> = {
  firstDate: 'Salida',
  firstKiss: 'Beso',
  firstNight: 'Noche',
  relationship: 'Relación',
};

/** Ordena y descarta claves desconocidas para que la linea nunca se rompa. */
export function sortMilestones(list: Milestone[]): Milestone[] {
  return MILESTONE_ORDER.map((key) => list.find((m) => m.key === key)).filter(
    (m): m is Milestone => Boolean(m)
  );
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';

const props = withDefaults(
  defineProps<{
    milestones: Milestone[];
    compact?: boolean;
  }>(),
  { compact: false }
);

const emit = defineEmits<{
  (e: 'toggle', key: MilestoneKey): void;
}>();

// Se precalcula icono y etiqueta corta aqui para que la plantilla no dependa
// de constantes de modulo (mas predecible al compilar el SFC)
const ordered = computed(() =>
  sortMilestones(props.milestones).map((m) => ({
    ...m,
    icon: MILESTONE_ICONS[m.key],
    short: MILESTONE_SHORT_LABELS[m.key] || m.label,
  }))
);

/**
 * Un tramo se pinta lleno solo si los dos hitos que une estan cumplidos: asi la
 * linea narra un avance continuo y no queda flotando hacia un punto apagado.
 */
function segmentFilled(index: number, side: 'left' | 'right'): boolean {
  const list = ordered.value;
  const neighbour = side === 'left' ? list[index - 1] : list[index + 1];
  return Boolean(list[index]?.achieved && neighbour?.achieved);
}
</script>

<template>
  <div class="milestone-track" :class="{ 'is-compact': compact }">
    <div
      v-for="(m, i) in ordered"
      :key="m.key"
      class="track-node"
      :class="{ 'is-achieved': m.achieved }"
    >
      <div class="node-rail">
        <!-- Los tramos son elementos reales y no pseudo-bordes para poder
             colorearlos de forma independiente segun el avance -->
        <span class="rail-seg" :class="{ filled: segmentFilled(i, 'left') }" :style="{ visibility: i === 0 ? 'hidden' : 'visible' }"></span>

        <button
          type="button"
          class="node-dot"
          :aria-label="m.label"
          :aria-pressed="m.achieved"
          @click.stop.prevent="emit('toggle', m.key)"
        >
          <BaseIcon
            :name="m.achieved ? 'check' : m.icon"
            :color="m.achieved ? 'plum' : 'muted'"
            size="xs"
          />
        </button>

        <span
          class="rail-seg"
          :class="{ filled: segmentFilled(i, 'right') }"
          :style="{ visibility: i === ordered.length - 1 ? 'hidden' : 'visible' }"
        ></span>
      </div>

      <span class="node-label">{{ m.short }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.milestone-track {
  // Flex puro: cada hito ocupa la misma fraccion para que los tramos midan igual
  @include row(0, stretch, space-between);
  width: 100%;
}

.track-node {
  @include stack(4px, center);
  flex: 1 1 0;
  min-width: 0;
}

.node-rail {
  @include row(0, center, center);
  width: 100%;
}

.rail-seg {
  flex: 1 1 auto;
  height: 2px;
  border-radius: 1px;
  background-color: rgba($alfii-cream, 0.12);
  transition: background-color $dur-base $ease-out;

  &.filled {
    background-color: $alfii-sage;
  }
}

.node-dot {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  @include center;
  background-color: rgba($alfii-navy, 0.7);
  border: 1px solid rgba($alfii-cream, 0.18);
  cursor: pointer;
  transition: transform $dur-fast $ease-out, background-color $dur-base $ease-out,
    border-color $dur-base $ease-out;

  &:hover {
    transform: scale(1.12);
    border-color: rgba($alfii-cream, 0.4);
  }
}

.node-label {
  font-size: $fs-2xs;
  color: rgba($alfii-cream, 0.45);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.track-node.is-achieved {
  .node-dot {
    background-color: $alfii-sage;
    border-color: $alfii-sage;
  }

  .node-label {
    color: $alfii-cream;
    font-weight: $fw-semibold;
  }
}

// En compacto la linea vive dentro de una tarjeta: menos alto, sin texto
.milestone-track.is-compact {
  .node-dot {
    width: 20px;
    height: 20px;
  }

  .node-label {
    display: none;
  }
}

@media (min-width: 768px) {
  .milestone-track.is-compact .node-label {
    display: block;
  }
}
</style>
