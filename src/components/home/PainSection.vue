<script setup lang="ts">
/**
 * VERSUS — "Ella ya sabe jugar".
 *
 * Pantalla de enfrentamiento estilo videojuego: la reina (ella) contra el
 * caballo (tu), y sus jugadas listadas como la move-list de un juego de
 * pelea. El giro de venta cierra la escena: nosotros te enseñamos a jugar.
 */
import { ref } from 'vue';
import { painPoints } from '@/config/homeContent';
import { useGsapContext, gsap, headingReveal, MOTION_OK, type SplitText } from '@/composables/useGsap';

const rootEl = ref<HTMLElement | null>(null);
const titleEl = ref<HTMLElement | null>(null);

useGsapContext(({ mm }) => {
  mm.add(MOTION_OK, () => {
    const root = rootEl.value;
    if (!root) return;
    const splits: SplitText[] = [];

    const split = headingReveal(titleEl.value, { start: 'top 78%', by: 'lines' });
    if (split) splits.push(split);

    gsap.fromTo(
      '.vs-photo',
      { yPercent: -8, scale: 1.05 },
      {
        yPercent: 8, scale: 1, ease: 'none',
        scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom top', scrub: true },
      }
    );

    // La move-list entra como en la pantalla de seleccion: fila a fila.
    gsap.from('.move-row', {
      opacity: 0, x: -30, duration: 0.5, stagger: 0.08, ease: 'power3.out',
      scrollTrigger: { trigger: '.move-list', start: 'top 80%', once: true },
    });

    gsap.from('.vs-turn', {
      opacity: 0, y: 24, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: '.vs-turn', start: 'top 88%', once: true },
    });

    return () => splits.forEach((s) => s.revert());
  });
}, rootEl);
</script>

<template>
  <section ref="rootEl" class="scene scene-vs">
    <div class="scene-media" aria-hidden="true">
      <img class="vs-photo" src="/home/versus.jpg" alt="" loading="lazy" />
      <div class="scene-scrim"></div>
    </div>

    <div class="vs-content">
      <p class="scene-eyebrow"><span class="blink">●</span> Partida en curso</p>

      <h2 ref="titleEl" class="scene-title">Ella ya sabe jugar.</h2>

      <p class="scene-copy">
        Cada mensaje suyo es una jugada medida. Tú entraste a la partida sin conocer
        las reglas — y se nota.
      </p>

      <!-- Move-list de ella, como en un juego de pelea -->
      <div class="move-list">
        <p class="ml-head">Sus jugadas<span>detectadas por Alfii</span></p>
        <ol>
          <li v-for="(p, i) in painPoints" :key="p.text" class="move-row">
            <span class="mv-combo">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="mv-name">{{ p.text }}</span>
            <span class="mv-dmg" aria-hidden="true">DMG&nbsp;<i v-for="n in Math.min(3, i + 1)" :key="n">▮</i></span>
          </li>
        </ol>
      </div>

      <p class="vs-turn">
        Ellas ya saben jugar el juego.
        <strong>Nosotros te enseñamos a jugarlo.</strong>
      </p>
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

  .vs-photo {
    width: 100%; height: 114%;
    margin-top: -7%;
    object-fit: cover; object-position: center 40%;
    will-change: transform;
  }

  .scene-scrim {
    position: absolute; inset: 0;
    background:
      linear-gradient(180deg, rgba($alfii-navy, 0.82) 0%, rgba($alfii-navy, 0.4) 40%, rgba($alfii-navy, 0.94) 92%),
      radial-gradient(110% 80% at 50% 45%, transparent 0%, rgba($alfii-navy, 0.45) 100%);
  }
}

.vs-content {
  position: relative; z-index: 1;
  width: 100%; max-width: 1180px;
  margin: 0 auto; padding: clamp(70px, 12vh, 120px) clamp(20px, 5vw, 48px);
  @include stack(clamp(14px, 2.2vh, 22px));
}

.scene-eyebrow {
  @include row(8px, center);
  font-family: var(--font-editorial);
  font-size: $fs-2xs; font-weight: 600;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: rgba($alfii-cream, 0.62);

  .blink {
    color: $alfii-red; font-size: 12px;
    animation: vsBlink 1.6s steps(2) infinite;
  }
}

@keyframes vsBlink { 50% { opacity: 0.15; } }

.scene-title {
  font-family: var(--font-display); font-weight: 800;
  font-size: clamp(2.6rem, 8.5vw, 5.2rem); line-height: 0.98;
  letter-spacing: -0.03em; color: $alfii-cream;
  text-shadow: 0 4px 34px rgba($alfii-navy, 0.7);
}

.scene-copy {
  font-family: var(--font-editorial); font-size: clamp(1.0625rem, 1.7vw, 1.25rem);
  line-height: 1.65; color: rgba($alfii-cream, 0.84);
  max-width: 48ch;
}

// Move-list: panel de juego con filas de jugada + medidor de daño.
.move-list {
  max-width: 640px; margin-top: 6px;
  border: 1px solid rgba($alfii-cream, 0.14); border-radius: 14px;
  background-color: rgba($alfii-navy, 0.72); backdrop-filter: blur(8px);
  overflow: hidden;

  .ml-head {
    @include row(10px, baseline, space-between);
    padding: 12px 16px; border-bottom: 1px solid rgba($alfii-red, 0.35);
    font-family: var(--font-display); font-weight: 700;
    font-size: $fs-sm; letter-spacing: 0.02em;
    color: $alfii-cream;
    background: linear-gradient(90deg, rgba($alfii-red, 0.18), transparent 70%);

    span {
      font-family: var(--font-editorial);
      font-size: 12px; font-weight: 500;
      letter-spacing: 0.16em; text-transform: uppercase;
      color: rgba($alfii-cream, 0.45);
    }
  }

  ol { list-style: none; }

  .move-row {
    @include row(12px, center);
    padding: 11px 16px; border-bottom: 1px solid rgba($alfii-cream, 0.06);
    font-family: var(--font-editorial);

    &:last-child { border-bottom: none; }

    .mv-combo {
      flex: 0 0 auto;
      font-size: 12px; font-weight: 600;
      letter-spacing: 0.12em; color: rgba($alfii-red, 0.9);
    }

    .mv-name {
      flex: 1 1 auto; min-width: 0;
      font-size: clamp(0.9375rem, 1.4vw, 1.0625rem); line-height: 1.45;
      color: rgba($alfii-cream, 0.86);
    }

    .mv-dmg {
      flex: 0 0 auto; font-size: 12px;
      letter-spacing: 0.08em; color: rgba($alfii-cream, 0.35);

      i {
        font-style: normal; color: rgba($alfii-red, 0.85);
        margin-left: 1px;
      }
    }
  }
}

.vs-turn {
  font-family: var(--font-editorial); font-size: clamp(1.0625rem, 1.8vw, 1.25rem);
  line-height: 1.6; color: rgba($alfii-cream, 0.6);

  strong {
    display: block; margin-top: 6px;
    font-family: var(--font-display); font-weight: 800;
    font-size: clamp(1.4rem, 3vw, 2rem); letter-spacing: -0.02em;
    color: $alfii-cream;
  }
}
</style>
