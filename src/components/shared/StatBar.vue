<script setup lang="ts">
/**
 * Barra de progreso minima para la carta de poder.
 * Existe aparte de MeterBar porque aqui la barra va desnuda (sin label ni %):
 * el numero ya lo pinta la fila de la stat y duplicarlo ensucia la carta.
 */
withDefaults(
  defineProps<{
    value: number; // 0..100
    tone?: 'sage' | 'red' | 'cream';
    dim?: boolean; // stat bloqueada: se apaga para leerse como potencial
    height?: number;
  }>(),
  {
    tone: 'cream',
    dim: false,
    height: 4,
  }
);
</script>

<template>
  <div
    class="stat-bar"
    :class="[`tone-${tone}`, { 'is-dim': dim }]"
    :style="{ height: `${height}px` }"
    role="presentation"
  >
    <div
      class="stat-bar__fill"
      :style="{ width: `${Math.max(0, Math.min(100, value))}%` }"
    ></div>
  </div>
</template>

<style lang="scss" scoped>
.stat-bar {
  width: 100%;
  border-radius: 999px;
  background-color: rgba($alfii-cream, 0.12);
  overflow: hidden;

  &__fill {
    height: 100%;
    border-radius: 999px;
    // La transicion cubre los saltos que no vienen del contador rAF
    transition: width $dur-base $ease-out, background-color $dur-base $ease-out;
  }

  &.tone-cream .stat-bar__fill { background-color: rgba($alfii-cream, 0.85); }
  &.tone-sage  .stat-bar__fill { background-color: $alfii-sage; }
  &.tone-red   .stat-bar__fill { background-color: $alfii-red; }

  // Bloqueada: el usuario debe percibir "esto se puede subir", no "esto es tu nivel"
  &.is-dim .stat-bar__fill { opacity: 0.35; }
}
</style>
