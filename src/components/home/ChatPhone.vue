<script setup lang="ts">
/**
 * Movil de WhatsApp con el hilo del caso activo.
 *
 * Vive aparte de la seccion porque es puro pintado: recibe el caso y no sabe
 * nada del recorrido, del pin ni de los chips.
 */
import BaseIcon from '@/components/shared/BaseIcon.vue';
import type { LiveCase } from '@/config/homeContent';

defineProps<{ liveCase: LiveCase; caseIndex: number }>();
</script>

<template>
  <div class="phone">
    <div class="wa-head">
      <div class="wa-user">
        <div class="wa-avatar">{{ liveCase.contact.charAt(0) }}</div>
        <div class="wa-meta">
          <span class="wa-name">{{ liveCase.contact }}</span>
          <span class="wa-status">en línea</span>
        </div>
      </div>
      <BaseIcon name="platform.whatsapp" color="sage" size="base" />
    </div>

    <div class="wa-body">
      <div
        v-for="(msg, i) in liveCase.thread"
        :key="`${caseIndex}-${i}`"
        class="wa-bubble"
        :class="[msg.from, { flag: msg.flag, live: msg.live }]"
      >
        <p>{{ msg.text }}</p>
        <span class="wa-time">{{ msg.time }}</span>
      </div>
    </div>

    <div class="wa-foot">
      <span class="live-dot"></span>
      <span>Alfii está leyendo esta conversación</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.phone {
  width: 100%;
  max-width: 380px;
  border-radius: 20px;
  overflow: hidden;
  background-color: #0b141a;
  border: 1px solid rgba($alfii-cream, 0.16);
  box-shadow: 0 22px 44px rgba(0, 0, 0, 0.55);
  @include stack(0);

  .wa-head {
    padding: 11px 14px;
    background-color: #202c33;
    @include row(10px, center, space-between);

    .wa-user {
      @include row(10px, center);
    }

    .wa-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      @include center;
      background: linear-gradient(135deg, #00a884 0%, #008069 100%);
      color: #fff;
      font-weight: $fw-bold;
      font-size: $fs-sm;
    }

    .wa-meta {
      @include stack(2px);

      .wa-name { font-size: $fs-sm; font-weight: $fw-bold; color: #e9edef; }
      .wa-status { font-size: $fs-2xs; color: #8696a0; }
    }
  }

  .wa-body {
    padding: 14px 12px;
    background-color: #0b141a;
    background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0);
    background-size: 16px 16px;
    @include stack(9px);
    min-height: 260px;

    // Con la seccion clavada el alto es un presupuesto cerrado: si un hilo
    // largo crece, se lleva por delante el final de la tarjeta. Aqui scrollea
    // el propio chat, que ademas es lo que hace un chat de verdad.
    @media (min-width: 1024px) and (min-height: 820px) {
      max-height: min(46dvh, 380px);
      overflow-y: auto;
      scrollbar-width: none;

      &::-webkit-scrollbar { display: none; }
    }
  }

  .wa-bubble {
    max-width: 84%;
    padding: 8px 11px;
    border-radius: 9px;
    font-size: 13px;
    line-height: 1.4;

    p { color: #e9edef; }

    .wa-time {
      display: block;
      text-align: right;
      font-size: 12px;
      color: #8696a0;
      margin-top: 2px;
    }

    &.her {
      align-self: flex-start;
      background-color: #202c33;
      border-top-left-radius: 0;
    }

    &.him {
      align-self: flex-end;
      background-color: #005c4b;
      border-top-right-radius: 0;
    }

    &.flag { border: 1px solid rgba($alfii-red, 0.5); }

    &.live {
      border-color: $alfii-red;
      box-shadow: 0 0 14px rgba($alfii-red, 0.25);
    }
  }

  .wa-foot {
    padding: 10px 14px;
    background-color: rgba($alfii-navy, 0.9);
    border-top: 1px solid rgba($alfii-cream, 0.08);
    @include row(8px, center, center);
    font-size: $fs-2xs;
    font-weight: $fw-semibold;
    color: rgba($alfii-cream, 0.8);

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: $alfii-red;
      box-shadow: 0 0 8px $alfii-red;
      animation: pulseHalo 2s infinite;
    }
  }
}
</style>
