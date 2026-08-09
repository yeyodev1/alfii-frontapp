<script setup lang="ts">
import BaseSheet from '@/components/modals/BaseSheet.vue';
import PowerCard from '@/components/shared/PowerCard.vue';
import type { PowerCardData } from '@/services/card.service';

/**
 * La carta a pantalla completa, bajo demanda.
 *
 * PORQUE existe: en el onboarding la carta vivia como una tira fija encima del
 * hilo. Costaba 70px permanentes de conversacion para mostrar tres datos que ya
 * estan resumidos en la cabecera. Aqui se ve grande y solo cuando se pide.
 */
defineProps<{
  card: PowerCardData;
}>();

defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <BaseSheet title="Tu carta" max-height="88dvh">
    <div class="card-wrap">
      <PowerCard :card="card" />
    </div>
  </BaseSheet>
</template>

<style lang="scss" scoped>
.card-wrap {
  @include center;
  animation: fadeInUp $dur-base $ease-out both;
}
</style>
