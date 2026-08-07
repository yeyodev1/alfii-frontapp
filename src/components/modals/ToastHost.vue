<script setup lang="ts">
import { useToastStore } from '@/stores/toast';
import BaseIcon from '@/components/shared/BaseIcon.vue';

const toastStore = useToastStore();
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <transition-group name="toast-anim">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="toast-item"
          :class="`toast-${toast.type}`"
        >
          <BaseIcon
            v-if="toast.type === 'success'"
            name="check"
            color="sage"
            size="sm"
          />
          <BaseIcon
            v-else-if="toast.type === 'error'"
            name="risk"
            color="red"
            size="sm"
          />
          <BaseIcon
            v-else
            name="info"
            color="cream"
            size="sm"
          />
          <span>{{ toast.message }}</span>
          <button class="toast-close" @click="toastStore.remove(toast.id)">
            <BaseIcon name="close" size="xs" color="muted" />
          </button>
        </div>
      </transition-group>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  @include stack(10px);
  max-width: 380px;
  width: 100%;
  pointer-events: none;
}

.toast-item {
  pointer-events: auto;
  @include row(10px, center);
  padding: 14px 18px;
  background-color: $alfii-plum;
  border: 1px solid rgba($alfii-cream, 0.15);
  border-radius: 14px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  color: $alfii-cream;
  font-size: $fs-sm;
  line-height: $lh-base;

  &.toast-success {
    border-color: rgba($alfii-sage, 0.4);
    background-color: rgba($alfii-plum, 0.95);
  }

  &.toast-error {
    border-color: rgba($alfii-red, 0.5);
    background-color: rgba($alfii-plum, 0.95);
  }

  span {
    flex: 1;
  }

  .toast-close {
    padding: 4px;
    border-radius: 50%;
    &:hover { background-color: rgba($alfii-cream, 0.1); }
  }
}

.toast-anim-enter-active,
.toast-anim-leave-active {
  transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.toast-anim-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}

.toast-anim-leave-to {
  opacity: 0;
  transform: translateX(30px) scale(0.95);
}
</style>
