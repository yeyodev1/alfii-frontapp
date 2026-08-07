<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';

const props = withDefaults(
  defineProps<{
    title?: string;
    dismissable?: boolean;
    maxHeight?: string;
  }>(),
  {
    title: undefined,
    dismissable: true,
    maxHeight: '85dvh',
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const startY = ref(0);
const currentY = ref(0);
const isDragging = ref(false);

function handleTouchStart(e: TouchEvent) {
  if (!props.dismissable || !e.touches[0]) return;
  startY.value = e.touches[0].clientY;
  isDragging.value = true;
}

function handleTouchMove(e: TouchEvent) {
  if (!isDragging.value || !e.touches[0]) return;
  const delta = e.touches[0].clientY - startY.value;
  if (delta > 0) {
    currentY.value = delta;
  }
}

function handleTouchEnd() {
  if (!isDragging.value) return;
  isDragging.value = false;
  if (currentY.value > 120) {
    emit('close');
  }
  currentY.value = 0;
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.dismissable) {
    emit('close');
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <Teleport to="body">
    <div class="sheet-backdrop" @click.self="dismissable && emit('close')">
      <div
        class="sheet-container"
        :style="{
          maxHeight: maxHeight,
          transform: currentY ? `translateY(${currentY}px)` : undefined,
        }"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <div class="sheet-handle" v-if="dismissable">
          <span class="handle-bar"></span>
        </div>

        <header class="sheet-header" v-if="title || dismissable">
          <h3 v-if="title" class="sheet-title">{{ title }}</h3>
          <button
            v-if="dismissable"
            class="close-btn"
            @click="emit('close')"
            aria-label="Cerrar"
          >
            <BaseIcon name="close" size="sm" color="muted" />
          </button>
        </header>

        <div class="sheet-content">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.sheet-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba($alfii-navy, 0.78);
  backdrop-filter: blur(8px);
  z-index: 100;
  @include center;
  align-items: flex-end;
  animation: fadeIn $dur-fast $ease-out forwards;
}

.sheet-container {
  width: 100%;
  max-width: 520px;
  background-color: $alfii-plum;
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  border: 1px solid rgba($alfii-cream, 0.12);
  border-bottom: none;
  @include stack(0);
  overflow: hidden;
  padding-bottom: max(16px, env(safe-area-inset-bottom));
  animation: slideUp $dur-sheet-in $ease-out forwards;
  will-change: transform;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

.sheet-handle {
  width: 100%;
  padding: 10px 0 4px;
  @include center;
  cursor: grab;

  .handle-bar {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background-color: rgba($alfii-cream, 0.22);
  }
}

.sheet-header {
  @include row(12px, center, space-between);
  padding: 12px 20px;
  border-bottom: 1px solid rgba($alfii-cream, 0.06);

  .sheet-title {
    font-size: $fs-md;
    font-weight: $fw-semibold;
    color: $alfii-cream;
  }

  .close-btn {
    padding: 6px;
    border-radius: 50%;
    &:hover { background-color: rgba($alfii-cream, 0.08); }
  }
}

.sheet-content {
  padding: 20px;
  @include scroll-y;
  @include stack(16px);
}
</style>
