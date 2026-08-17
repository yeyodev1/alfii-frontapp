<script setup lang="ts">
/**
 * Escena final — la reserva.
 *
 * El rey en carmesi cierra el recorrido como telon. Titular display gigante,
 * una frase, un solo boton. La promesa de privacidad queda como nota al pie
 * en lista de specs, no como tarjeta que compita con el cierre.
 */
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import { useGsapContext, gsap, headingReveal, MOTION_OK, type SplitText } from '@/composables/useGsap';

const emit = defineEmits<{ (e: 'cta'): void }>();

const rootEl = ref<HTMLElement | null>(null);
const titleEl = ref<HTMLElement | null>(null);

const NOTES = [
  'Primera partida gratis',
  'Sin tarjeta, sin registro',
  'Enlaces firmados que caducan',
  'Borras todo cuando quieras',
];

useGsapContext(({ mm }) => {
  mm.add(MOTION_OK, () => {
    const splits: SplitText[] = [];
    const root = rootEl.value;
    if (!root) return;

    const split = headingReveal(titleEl.value, { start: 'top 80%', by: 'lines' });
    if (split) splits.push(split);

    gsap.fromTo(
      '.close-photo',
      { yPercent: -10, scale: 1.06 },
      {
        yPercent: 0, scale: 1, ease: 'none',
        scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom bottom', scrub: true },
      }
    );

    gsap.from('.close-copy, .final-btn, .close-notes li, .legal-link', {
      opacity: 0, y: 20, duration: 0.7, stagger: 0.07, ease: 'power3.out',
      scrollTrigger: { trigger: root, start: 'top 65%', once: true },
    });

    // Destello lento en diagonal sobre el boton: brillo, no banner.
    gsap.fromTo(
      '.btn-sheen',
      { xPercent: -160 },
      {
        xPercent: 160, duration: 1.2, ease: 'power2.inOut', repeat: -1, repeatDelay: 3.6,
        scrollTrigger: { trigger: root, start: 'top 70%' },
      }
    );

    return () => splits.forEach((s) => s.revert());
  });
}, rootEl);
</script>

<template>
  <section ref="rootEl" class="scene scene-close">
    <div class="scene-media" aria-hidden="true">
      <img class="close-photo" src="/home/victory.jpg" alt="" loading="lazy" />
      <div class="scene-scrim"></div>
    </div>

    <div class="close-content">
      <p class="scene-eyebrow">Partida nueva · Jugador 1</p>

      <h2 ref="titleEl" class="close-title">
        ¿Listo para jugar en serio?
      </h2>

      <p class="close-copy">
        La primera partida es gratis y no necesitas cuenta. Sube la captura, mira el
        análisis completo y decide después.
      </p>

      <button class="final-btn" @click="emit('cta')">
        <span class="btn-sheen" aria-hidden="true"></span>
        <BaseIcon name="upload" color="cream" size="base" />
        <span>Insertar captura · Press&nbsp;Start</span>
      </button>

      <ul class="close-notes">
        <li v-for="n in NOTES" :key="n">{{ n }}</li>
      </ul>

      <RouterLink to="/legal" class="legal-link">
        <span>Compromiso de privacidad y legal</span>
        <BaseIcon name="arrowRight" size="xs" color="sage" />
      </RouterLink>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.scene {
  position: relative; min-height: 100dvh;
  display: flex; align-items: center;
  overflow: clip; border-top: 1px solid rgba($alfii-cream, 0.06);
}

.scene-media {
  position: absolute; inset: 0;
  z-index: 0; pointer-events: none;

  .close-photo {
    width: 100%; height: 112%;
    margin-top: -6%;
    object-fit: cover; object-position: center 60%;
    will-change: transform;
  }

  .scene-scrim {
    position: absolute; inset: 0;
    background:
      linear-gradient(180deg, rgba($alfii-navy, 0.88) 0%, rgba($alfii-navy, 0.35) 45%, rgba($alfii-navy, 0.75) 100%),
      radial-gradient(100% 80% at 50% 55%, transparent 0%, rgba($alfii-navy, 0.5) 100%);
  }
}

.close-content {
  position: relative; z-index: 1;
  width: 100%; max-width: 860px;
  margin: 0 auto; padding: clamp(70px, 12vh, 130px) clamp(20px, 5vw, 48px);
  @include stack(clamp(16px, 2.6vh, 26px), center);
  text-align: center;
}

.scene-eyebrow {
  font-family: var(--font-editorial); font-size: $fs-2xs;
  font-weight: 600; letter-spacing: 0.22em;
  text-transform: uppercase; color: rgba($alfii-cream, 0.62);
}

.close-title {
  font-family: var(--font-display); font-weight: 800;
  font-size: clamp(2.4rem, 8vw, 5rem); line-height: 1;
  letter-spacing: -0.03em; color: $alfii-cream;
  text-wrap: balance;
}

.close-copy {
  font-family: var(--font-editorial); font-size: clamp(1.0625rem, 1.7vw, 1.25rem);
  line-height: 1.7; color: rgba($alfii-cream, 0.82);
  max-width: 46ch;
}

.final-btn {
  position: relative; overflow: hidden;
  @include row(10px, center, center);
  width: 100%; max-width: 360px;
  padding: 17px 30px; border-radius: 999px;
  font-family: var(--font-editorial); font-size: $fs-md;
  font-weight: 600; background-color: $alfii-red;
  color: $alfii-cream; box-shadow: 0 12px 34px rgba($alfii-red, 0.5);

  .btn-sheen {
    position: absolute;
    top: -60%; bottom: -60%;
    left: 0; width: 42%;
    pointer-events: none; transform: skewX(-18deg);
    background: linear-gradient(90deg, transparent, rgba($alfii-cream, 0.26), transparent);
  }
}

.close-notes {
  @include row(clamp(10px, 2vw, 22px), center, center);
  flex-wrap: wrap; list-style: none;

  li {
    font-family: var(--font-editorial); font-size: $fs-2xs;
    letter-spacing: 0.05em; color: rgba($alfii-cream, 0.6);

    &:not(:last-child)::after {
      content: '•'; margin-left: clamp(10px, 2vw, 22px);
      color: rgba($alfii-red, 0.8);
    }
  }
}

.legal-link {
  @include row(6px, center, center);
  font-family: var(--font-editorial); font-size: $fs-xs;
  font-weight: 600; color: $alfii-sage;
}
</style>
