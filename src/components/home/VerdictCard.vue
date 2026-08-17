<script setup lang="ts">
/**
 * Tarjeta de veredicto. Es tambien el origen del morph del expediente: el
 * padre necesita su nodo raiz, asi que se expone con defineExpose.
 */
import { ref } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import type { LiveCase } from '@/config/homeContent';

defineProps<{ liveCase: LiveCase }>();

const emit = defineEmits<{ (e: 'copy'): void; (e: 'expand'): void }>();

const cardEl = ref<HTMLElement | null>(null);

defineExpose({ cardEl });
</script>

<template>
  <div ref="cardEl" class="verdict-card">
    <div class="v-block">
      <div class="v-head">
        <BaseIcon name="subtext" color="red" size="sm" />
        <span>Lo que realmente te dijo</span>
      </div>
      <p class="v-text">{{ liveCase.verdict.subtext }}</p>
    </div>

    <div class="v-stats">
      <div class="v-stat">
        <BaseIcon name="archetype" color="sage" size="sm" />
        <strong>{{ liveCase.verdict.archetype }}</strong>
        <span>{{ liveCase.verdict.confidence }}% confianza</span>
      </div>
      <div class="v-stat">
        <BaseIcon name="timing" color="cream" size="sm" />
        <strong>Esperar {{ liveCase.verdict.timing }}</strong>
        <span>antes de responder</span>
      </div>
    </div>

    <div class="v-script">
      <div class="v-script-head">
        <span class="style-badge">{{ liveCase.verdict.scriptStyle }}</span>
        <button class="copy-mini" @click="emit('copy')">
          <BaseIcon name="copy" color="muted" size="xs" />
          <span>Copiar</span>
        </button>
      </div>
      <p class="v-script-text">"{{ liveCase.verdict.script }}"</p>
    </div>

    <button class="v-expand" @click="emit('expand')">
      <BaseIcon name="expand" color="cream" size="xs" />
      <span>Ver los 6 bloques del análisis</span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.verdict-card {
  @include card-surface;
  @include stack(18px);

  .v-head {
    @include row(8px, center);
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.7);
  }

  .v-block {
    @include stack(8px);
  }

  .v-text {
    font-size: $fs-sm;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.9);
  }

  .v-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    .v-stat {
      flex: 1 1 150px;
      @include stack(2px);
      padding: 12px 14px;
      border-radius: 12px;
      background-color: rgba($alfii-navy, 0.6);
      border: 1px solid rgba($alfii-cream, 0.08);

      strong { font-size: $fs-sm; font-weight: $fw-bold; }
      span { font-size: $fs-2xs; color: rgba($alfii-cream, 0.6); }
    }
  }

  .v-script {
    @include stack(8px);
    padding: 14px;
    border-radius: 12px;
    background-color: rgba($alfii-navy, 0.65);
    border: 1px solid rgba($alfii-red, 0.28);

    .v-script-head {
      @include row(10px, center, space-between);
    }

    .style-badge {
      font-size: $fs-2xs;
      font-weight: $fw-bold;
      letter-spacing: 0.08em;
      padding: 3px 9px;
      border-radius: 7px;
      background-color: rgba($alfii-red, 0.18);
      color: $alfii-red;
    }

    .copy-mini {
      @include row(6px, center);
      font-size: $fs-2xs;
      font-weight: $fw-semibold;
      color: rgba($alfii-cream, 0.65);
    }

    .v-script-text {
      font-size: $fs-sm;
      font-weight: $fw-medium;
      line-height: $lh-relaxed;
      color: $alfii-cream;
    }
  }

  .v-expand {
    @include row(8px, center, center);
    width: 100%;
    padding: 12px;
    border-radius: 12px;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    background-color: rgba($alfii-cream, 0.06);
    border: 1px solid rgba($alfii-cream, 0.14);
    color: $alfii-cream;
  }
}
</style>
