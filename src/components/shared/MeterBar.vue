<script setup lang="ts">
import BaseIcon from '@/components/shared/BaseIcon.vue';
import type { IconName } from '@/config/icons';

defineProps<{
  label: string;
  value: number; // 0..100
  icon: IconName;
}>();
</script>

<template>
  <div class="meter-bar">
    <div class="meter-header">
      <div class="meter-title">
        <BaseIcon :name="icon" color="sage" size="xs" />
        <span>{{ label }}</span>
      </div>
      <span class="meter-val">{{ value }}%</span>
    </div>

    <div class="bar-track">
      <div class="bar-fill" :style="{ width: `${value}%` }"></div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.meter-bar {
  @include stack(6px);
}

.meter-header {
  @include row(8px, center, space-between);

  .meter-title {
    @include row(6px);
    font-size: $fs-xs;
    font-weight: $fw-medium;
    color: rgba($alfii-cream, 0.8);
  }

  .meter-val {
    font-size: $fs-xs;
    font-weight: $fw-bold;
    color: $alfii-sage;
  }
}

.bar-track {
  width: 100%;
  height: 6px;
  background-color: rgba($alfii-cream, 0.1);
  border-radius: 3px;
  overflow: hidden;

  .bar-fill {
    height: 100%;
    background-color: $alfii-sage;
    border-radius: 3px;
    transition: width $dur-reveal $ease-out;
  }
}
</style>
