<script setup lang="ts">
/**
 * Creditos de la partida. El footer deja de ser un pie corporativo y cierra
 * como pantalla final de juego: el sello, la frase del concepto y los enlaces
 * legales como creditos. Un "continuar" devuelve al inicio de la partida.
 */
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import AlfiiLogo from '@/components/shared/AlfiiLogo.vue';
import { useGsapContext, revealBatch, MOTION_OK, gsap } from '@/composables/useGsap';

const rootEl = ref<HTMLElement | null>(null);

function backToTop() {
  gsap.to(window, { duration: 1, ease: 'power2.inOut', scrollTo: { y: 0 } });
}

useGsapContext(({ mm }) => {
  mm.add(MOTION_OK, () => {
    revealBatch('.footer-inner > *', { y: 18, stagger: 0.06, start: 'top 98%' });
  });
}, rootEl);
</script>

<template>
  <footer ref="rootEl" class="footer">
    <div class="footer-inner">
      <p class="ft-eyebrow">Fin de la demo · La partida real empieza arriba</p>

      <AlfiiLogo size="sm" mode="full" />

      <p class="footer-claim">
        Ellas ya saben jugar el juego.
        <strong>Alfii te enseña a jugarlo.</strong>
      </p>

      <button type="button" class="ft-continue" @click="backToTop">
        ▲ Continuar · Nueva partida
      </button>

      <nav class="footer-links">
        <RouterLink to="/legal">Aviso Legal</RouterLink>
        <span aria-hidden="true">·</span>
        <RouterLink to="/legal">Términos</RouterLink>
        <span aria-hidden="true">·</span>
        <RouterLink to="/legal">Privacidad</RouterLink>
      </nav>

      <span class="footer-copy">© 2026 alfii.ec · Todos los derechos reservados.</span>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
.footer {
  border-top: 1px solid rgba($alfii-cream, 0.08);
  background:
    radial-gradient(70% 60% at 50% 0%, rgba($alfii-red, 0.08) 0%, transparent 70%),
    rgba($alfii-plum, 0.4);
  padding: 44px clamp(16px, 4vw, 32px) 46px;

  .footer-inner {
    max-width: 1120px;
    margin: 0 auto;
    @include stack(16px, center);
    text-align: center;
  }

  .ft-eyebrow {
    font-family: var(--font-editorial);
    font-size: 12px; font-weight: 600;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.42);
  }

  .footer-claim {
    font-family: var(--font-editorial);
    font-size: $fs-sm;
    line-height: 1.6;
    color: rgba($alfii-cream, 0.6);
    max-width: 420px;

    strong {
      display: block;
      margin-top: 4px;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: clamp(1.15rem, 2.2vw, 1.5rem);
      letter-spacing: -0.02em;
      color: $alfii-cream;
    }
  }

  .ft-continue {
    padding: 11px 22px;
    border-radius: 999px;
    border: 1px solid rgba($alfii-cream, 0.2);
    font-family: var(--font-editorial);
    font-size: $fs-2xs; font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.75);
    cursor: pointer;
    animation: continuePulse 2.6s ease-in-out infinite;

    &:hover { border-color: $alfii-red; color: $alfii-cream; }
  }

  .footer-links {
    @include row(10px, center, center);
    flex-wrap: wrap;
    font-family: var(--font-editorial);
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.7);

    span { color: rgba($alfii-red, 0.7); }
  }

  .footer-copy {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.4);
  }
}

@keyframes continuePulse {
  0%, 100% { opacity: 0.75; }
  50% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .ft-continue { animation: none; }
}
</style>
