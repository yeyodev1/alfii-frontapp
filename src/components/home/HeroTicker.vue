<script setup lang="ts">
/**
 * Teletipo del hero: pastilla con punto que late y una situacion real que se
 * escribe sola (ver useTicker para el porque de borrar antes de escribir).
 *
 * Es la unica pieza del hero que dice "esto esta pasando ahora", asi que tiene
 * forma de indicador en vivo y no de texto suelto.
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { tickerLoop } from '@/composables/useTicker';

const props = defineProps<{ frases: string[] }>();

const valueEl = ref<HTMLElement | null>(null);
let loop: ReturnType<typeof tickerLoop> = null;

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  loop = tickerLoop(valueEl, props.frases);
});

onUnmounted(() => loop?.kill());
</script>

<template>
  <p class="hero-ticker">
    <span class="tick-label">Ahora mismo Alfii está leyendo</span>
    <span ref="valueEl" class="tick-value">{{ frases[0] }}</span>
  </p>
</template>

<style lang="scss" scoped>
.hero-ticker {
  @include row(10px, center);
  align-self: flex-start;
  min-height: 34px;
  padding: 7px 14px 7px 12px;
  border-radius: 30px;
  font-size: $fs-2xs;
  background-color: rgba($alfii-navy, 0.55);
  border: 1px solid rgba($alfii-cream, 0.1);

  @media (min-width: 768px) {
    align-self: center;
    font-size: $fs-xs;
  }

  &::before {
    content: '';
    flex: 0 0 7px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: $alfii-red;
    box-shadow: 0 0 10px $alfii-red;
    animation: pulseHalo 2s infinite;
  }

  // La etiqueta larga sobra en pantallas estrechas: ahi el punto rojo y la
  // frase ya dicen que algo esta pasando.
  .tick-label {
    display: none;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.4);

    @media (min-width: 560px) { display: inline; }
  }

  .tick-value {
    font-weight: $fw-bold;
    color: $alfii-red;
    white-space: nowrap;
  }
}
</style>
