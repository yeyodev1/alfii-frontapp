<script setup lang="ts">
import BaseSheet from '@/components/modals/BaseSheet.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import { LESSONS } from '@/config/lessons';

const props = defineProps<{
  lessonId: string;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const lesson = LESSONS[props.lessonId] || {
  id: props.lessonId,
  title: 'Concepto clave',
  icon: 'lightbulb',
  tagline: 'Estrategia de comunicacion',
  body: ['Este concepto te ayuda a interpretar mejor el subtexto de tus conversaciones.'],
  actionHint: 'Aplica este principio en tus proximas respuestas.',
};
</script>

<template>
  <BaseSheet :title="lesson.title" @close="$emit('close')">
    <div class="lesson-sheet">
      <div class="lesson-badge">
        <BaseIcon :name="lesson.icon" color="sage" size="xl" />
        <p class="tagline">{{ lesson.tagline }}</p>
      </div>

      <div class="lesson-body">
        <p v-for="(paragraph, i) in lesson.body" :key="i">{{ paragraph }}</p>
      </div>

      <div class="action-card">
        <BaseIcon name="bolt" color="red" size="sm" />
        <span>{{ lesson.actionHint }}</span>
      </div>

      <button class="understand-btn" @click="$emit('close')">
        Entendido
      </button>
    </div>
  </BaseSheet>
</template>

<style lang="scss" scoped>
.lesson-sheet {
  @include stack(20px);
}

.lesson-badge {
  @include stack(10px, center);
  text-align: center;
  padding: 16px;
  background-color: rgba($alfii-sage, 0.08);
  border-radius: 16px;
  border: 1px solid rgba($alfii-sage, 0.2);

  .tagline {
    font-size: $fs-sm;
    font-weight: $fw-semibold;
    color: $alfii-sage;
  }
}

.lesson-body {
  @include stack(12px);
  p {
    font-size: $fs-sm;
    color: rgba($alfii-cream, 0.85);
    line-height: $lh-relaxed;
  }
}

.action-card {
  @include row(10px);
  padding: 12px 16px;
  background-color: rgba($alfii-red, 0.1);
  border-radius: 12px;
  border-left: 3px solid $alfii-red;
  font-size: $fs-xs;
  font-weight: $fw-medium;
  color: $alfii-cream;
}

.understand-btn {
  width: 100%;
  padding: 14px;
  background-color: $alfii-red;
  color: $alfii-cream;
  font-weight: $fw-bold;
  border-radius: 12px;
  text-align: center;
}
</style>
