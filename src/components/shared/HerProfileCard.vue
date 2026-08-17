<script lang="ts">
/** Etiquetas de cada hueco del perfil. El enum crudo jamas llega a pantalla. */
export const HER_FIELD_LABELS: Record<string, string> = {
  howWeMet: 'Cómo se conocieron',
  knownSinceMonths: 'Tiempo hablando',
  herAge: 'Edad',
  herOccupation: 'Ocupación',
  instagram: 'Instagram',
  relationshipGoal: 'Qué buscas',
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import HerProfileSheet, {
  HOW_WE_MET_OPTIONS,
  GOAL_OPTIONS,
  KNOWN_SINCE_OPTIONS,
  type HerProfile,
  type HerCompleteness,
} from '@/components/modals/HerProfileSheet.vue';
import { useModal } from '@/composables/useModal';
import type { IconName } from '@/config/icons';

const props = defineProps<{
  targetId: string;
  displayName: string;
  herProfile?: HerProfile | null;
  completeness?: HerCompleteness | null;
}>();

const emit = defineEmits<{
  (e: 'saved', target: any): void;
}>();

const { open } = useModal();

const her = computed(() => props.herProfile ?? {});
const score = computed(() => props.completeness?.score ?? 0);

// Filas con dato: cada una con su etiqueta legible y su icono
const rows = computed(() => {
  const out: { key: string; label: string; value: string; icon: IconName }[] = [];
  const h = her.value;

  if (h.howWeMet) {
    const opt = HOW_WE_MET_OPTIONS.find((o) => o.value === h.howWeMet);
    out.push({
      key: 'howWeMet',
      label: HER_FIELD_LABELS.howWeMet!,
      value: opt?.label ?? h.howWeMet,
      icon: opt?.icon ?? 'info',
    });
  }
  if (typeof h.knownSinceMonths === 'number') {
    const opt = KNOWN_SINCE_OPTIONS.find((o) => o.value === h.knownSinceMonths);
    out.push({
      key: 'knownSinceMonths',
      label: HER_FIELD_LABELS.knownSinceMonths!,
      value: opt?.label ?? `${h.knownSinceMonths} mes(es)`,
      icon: 'history',
    });
  }
  if (typeof h.herAge === 'number') {
    out.push({
      key: 'herAge',
      label: HER_FIELD_LABELS.herAge!,
      value: `${h.herAge} años`,
      icon: 'step.PREFERRED_NAME',
    });
  }
  if (h.herOccupation) {
    out.push({
      key: 'herOccupation',
      label: HER_FIELD_LABELS.herOccupation!,
      value: h.herOccupation,
      icon: 'step.STATUS',
    });
  }
  if (h.instagram) {
    out.push({
      key: 'instagram',
      label: HER_FIELD_LABELS.instagram!,
      value: `@${h.instagram}`,
      icon: 'platform.instagram',
    });
  }
  if (h.relationshipGoal) {
    const opt = GOAL_OPTIONS.find((o) => o.value === h.relationshipGoal);
    out.push({
      key: 'relationshipGoal',
      label: HER_FIELD_LABELS.relationshipGoal!,
      value: opt?.label ?? h.relationshipGoal,
      icon: opt?.icon ?? 'handHoldingHeart',
    });
  }
  return out;
});

const missingLabels = computed(() =>
  (props.completeness?.missing ?? [])
    .map((f) => HER_FIELD_LABELS[f])
    .filter((l): l is string => !!l)
);

function openSheet() {
  open('herProfile', HerProfileSheet, {
    targetId: props.targetId,
    displayName: props.displayName,
    herProfile: props.herProfile ?? null,
    onSaved: (target: any) => emit('saved', target),
  });
}
</script>

<template>
  <div class="her-card">
    <header class="card-head">
      <div class="score-circle" :style="{ '--score-pct': `${score}%` }">
        <span>{{ score }}%</span>
      </div>
      <div class="head-text">
        <span class="label">Lo que Alfii sabe de ella</span>
        <span class="impact">
          {{ score >= 100 ? 'Perfil completo: análisis a máxima potencia' : 'Cada dato afina el análisis' }}
        </span>
      </div>
      <button class="edit-btn" type="button" @click="openSheet">
        {{ rows.length ? 'Editar' : 'Completar' }}
      </button>
    </header>

    <ul v-if="rows.length" class="fact-list">
      <li v-for="r in rows" :key="r.key">
        <BaseIcon :name="r.icon" size="xs" color="sage" />
        <span class="fact-label">{{ r.label }}</span>
        <span class="fact-value">{{ r.value }}</span>
      </li>
      <li v-if="her.notes" class="note-row">
        <BaseIcon name="lightbulb" size="xs" color="muted" />
        <span class="fact-value note">{{ her.notes }}</span>
      </li>
    </ul>

    <p v-else class="empty-hint">
      Todavía no le has contado nada de ella. Sin contexto, Alfii lee la conversación a ciegas.
    </p>

    <!-- Chips de lo que falta: tocables, llevan directo al wizard -->
    <div v-if="missingLabels.length" class="missing-wrap">
      <button
        v-for="m in missingLabels"
        :key="m"
        type="button"
        class="missing-chip"
        @click="openSheet"
      >
        <BaseIcon name="plus" size="xs" color="muted" />
        <span>{{ m }}</span>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.her-card {
  @include stack(12px);
  padding: 14px;
  background-color: rgba($alfii-plum, 0.8);
  border: 1px solid rgba($alfii-cream, 0.1);
  border-radius: 14px;
}

.card-head {
  @include row(12px, center);
}

// Mismo anillo conic-gradient que ProfileCompletenessBadge
.score-circle {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: conic-gradient($alfii-sage var(--score-pct), rgba($alfii-cream, 0.1) 0);
  @include center;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: 3px;
    background-color: $alfii-plum;
    border-radius: 50%;
  }

  span {
    position: relative;
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    color: $alfii-cream;
  }
}

.head-text {
  @include stack(2px);
  flex: 1 1 auto;
  min-width: 0;

  .label {
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba($alfii-cream, 0.6);
  }

  .impact {
    font-size: $fs-xs;
    color: $alfii-cream;
  }
}

.edit-btn {
  flex: 0 0 auto;
  padding: 8px 14px;
  border-radius: 10px;
  background-color: rgba($alfii-sage, 0.15);
  border: 1px solid rgba($alfii-sage, 0.4);
  font-size: $fs-2xs;
  font-weight: $fw-bold;
  color: $alfii-sage;
  cursor: pointer;

  &:hover { background-color: rgba($alfii-sage, 0.25); }
}

.fact-list {
  @include stack(8px);
  list-style: none;

  li {
    @include row(8px, center);
    font-size: $fs-xs;
  }

  .fact-label {
    flex: 0 0 auto;
    color: rgba($alfii-cream, 0.55);
  }

  .fact-value {
    flex: 1 1 auto;
    min-width: 0;
    font-weight: $fw-semibold;
    color: $alfii-cream;
    text-align: right;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    &.note {
      text-align: left;
      font-weight: $fw-medium;
      white-space: normal;
      line-height: $lh-relaxed;
      color: rgba($alfii-cream, 0.75);
    }
  }

  .note-row {
    align-items: flex-start;
    padding-top: 6px;
    border-top: 1px solid rgba($alfii-cream, 0.06);
  }
}

.empty-hint {
  font-size: $fs-xs;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.6);
}

.missing-wrap {
  @include row(6px, center, flex-start);
  flex-wrap: wrap;
}

.missing-chip {
  @include row(5px, center);
  padding: 6px 10px;
  border-radius: 20px;
  background-color: rgba($alfii-cream, 0.05);
  border: 1px dashed rgba($alfii-cream, 0.2);
  font-size: $fs-2xs;
  color: rgba($alfii-cream, 0.6);
  cursor: pointer;
  transition: border-color $dur-fast $ease-out, color $dur-fast $ease-out;

  &:hover {
    border-color: rgba($alfii-sage, 0.5);
    color: rgba($alfii-cream, 0.9);
  }
}
</style>
