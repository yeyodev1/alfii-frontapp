<script setup lang="ts">
import { computed } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';

const props = defineProps<{
  level: 'LIMPIO' | 'VIGILAR' | 'ALTO' | 'ABORTAR';
}>();

const config = computed(() => {
  switch (props.level) {
    case 'LIMPIO':
      return { icon: 'risk.LIMPIO', color: 'sage', label: 'Limpio' };
    case 'VIGILAR':
      return { icon: 'risk.VIGILAR', color: 'cream', label: 'Vigilar' };
    case 'ALTO':
      return { icon: 'risk.ALTO', color: 'red', label: 'Riesgo alto' };
    case 'ABORTAR':
      return { icon: 'risk.ABORTAR', color: 'red', label: 'Abortar' };
  }
});
</script>

<template>
  <div class="risk-badge" :class="`level-${level.toLowerCase()}`">
    <BaseIcon :name="(config.icon as any)" :color="(config.color as any)" size="xs" :shake="level === 'ABORTAR'" />
    <span>{{ config.label }}</span>
  </div>
</template>

<style lang="scss" scoped>
.risk-badge {
  @include row(6px);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: $fs-2xs;
  font-weight: $fw-bold;
  text-transform: uppercase;
  letter-spacing: 0.04em;

  &.level-limpio {
    background-color: rgba($alfii-sage, 0.15);
    color: $alfii-sage;
    border: 1px solid rgba($alfii-sage, 0.3);
  }

  &.level-vigilar {
    background-color: rgba($alfii-cream, 0.15);
    color: $alfii-cream;
    border: 1px solid rgba($alfii-cream, 0.3);
  }

  &.level-alto, &.level-abortar {
    background-color: rgba($alfii-red, 0.2);
    color: $alfii-cream;
    border: 1px solid rgba($alfii-red, 0.4);
  }
}
</style>
