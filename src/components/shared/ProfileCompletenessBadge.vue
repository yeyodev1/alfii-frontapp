<script setup lang="ts">
import BaseIcon from '@/components/shared/BaseIcon.vue';

defineProps<{
  score: number;
  impact: string;
}>();
</script>

<template>
  <div class="completeness-badge">
    <div class="score-circle" :style="{ '--score-pct': `${score}%` }">
      <span>{{ score }}%</span>
    </div>
    <div class="badge-text">
      <span class="label">Poder de análisis</span>
      <span class="impact">{{ impact }}</span>
    </div>
    <BaseIcon name="arrowRight" size="xs" color="muted" />
  </div>
</template>

<style lang="scss" scoped>
.completeness-badge {
  @include row(12px);
  padding: 10px 14px;
  background-color: rgba($alfii-plum, 0.8);
  border: 1px solid rgba($alfii-cream, 0.1);
  border-radius: 12px;
  cursor: pointer;

  &:hover {
    border-color: rgba($alfii-cream, 0.2);
  }
}

.score-circle {
  width: 36px;
  height: 36px;
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

.badge-text {
  @include stack(2px);
  flex: 1;

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
</style>
