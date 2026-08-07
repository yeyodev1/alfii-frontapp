<script setup lang="ts">
import BaseIcon from '@/components/shared/BaseIcon.vue';

defineProps<{
  title?: string;
  icon?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop">
      <div class="modal-container">
        <header class="modal-header" v-if="title || icon">
          <div class="header-title">
            <BaseIcon v-if="icon" :name="(icon as any)" color="red" size="lg" />
            <h3 v-if="title">{{ title }}</h3>
          </div>
        </header>

        <div class="modal-content">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba($alfii-navy, 0.85);
  backdrop-filter: blur(10px);
  z-index: 110;
  @include center;
  padding: 20px;
  animation: fadeIn $dur-fast $ease-out forwards;
}

.modal-container {
  width: 100%;
  max-width: 400px;
  background-color: $alfii-plum;
  border: 1px solid rgba($alfii-cream, 0.16);
  border-radius: 20px;
  padding: 24px;
  @include stack(16px);
  box-shadow: 0 20px 40px rgba($alfii-navy, 0.6);
  animation: popUp $dur-base $ease-spring forwards;
}

@keyframes popUp {
  from { transform: scale(0.92); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

.modal-header {
  .header-title {
    @include row(10px);
    h3 {
      font-size: $fs-lg;
      font-weight: $fw-bold;
      color: $alfii-cream;
    }
  }
}

.modal-content {
  @include stack(16px);
}
</style>
