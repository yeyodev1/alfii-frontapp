<script setup lang="ts">
/**
 * Indice vivo del expediente: dice cuantos bloques quedan y permite saltar.
 *
 * En movil es un carril horizontal pegado arriba (el pulgar ya sabe deslizar);
 * a partir de 900px pasa a columna lateral.
 */
defineProps<{ items: string[]; active: number }>();
defineEmits<{ (e: 'select', index: number): void }>();
</script>

<template>
  <nav class="dossier-rail">
    <button
      v-for="(label, i) in items"
      :key="label"
      class="rail-item"
      :class="{ active: active === i }"
      @click="$emit('select', i)"
    >
      <span class="rail-num">{{ i + 1 }}</span>
      <span class="rail-label">{{ label }}</span>
    </button>
  </nav>
</template>

<style lang="scss" scoped>
.dossier-rail {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid rgba($alfii-cream, 0.07);

  &::-webkit-scrollbar { display: none; }

  @media (min-width: 900px) {
    flex-direction: column;
    gap: 2px;
    padding: 20px 12px;
    overflow-x: visible;
    overflow-y: auto;
    border-bottom: none;
    border-right: 1px solid rgba($alfii-cream, 0.07);
  }
}

.rail-item {
  @include row(8px, center);
  flex: 0 0 auto;
  padding: 8px 10px;
  border-radius: 10px;
  text-align: left;
  white-space: nowrap;
  color: rgba($alfii-cream, 0.55);
  transition: color $dur-fast $ease-out, background-color $dur-fast $ease-out;

  .rail-num {
    @include center;
    width: 22px;
    height: 22px;
    flex: 0 0 22px;
    border-radius: 7px;
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    border: 1px solid rgba($alfii-cream, 0.16);
    transition: all $dur-fast $ease-out;
  }

  .rail-label {
    font-size: $fs-sm;
    font-weight: $fw-medium;
  }

  &:hover {
    color: $alfii-cream;
    background-color: rgba($alfii-cream, 0.05);
  }

  &.active {
    color: $alfii-cream;
    background-color: rgba($alfii-red, 0.12);

    .rail-num {
      border-color: rgba($alfii-red, 0.7);
      background-color: rgba($alfii-red, 0.9);
      color: $alfii-cream;
    }
  }
}
</style>
