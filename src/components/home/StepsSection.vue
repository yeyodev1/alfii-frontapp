<script setup lang="ts">
/**
 * TUTORIAL — niveles 01–03.
 *
 * El proceso como tutorial de videojuego: cada nivel es una pantalla completa
 * con su fotograma, recompensa de XP y barra de progreso del tutorial que se
 * llena al pasar de nivel. Cierra con la marquesina de specs del arsenal.
 */
import { ref } from 'vue';
import { useGsapContext, gsap, headingReveal, MOTION_OK, type SplitText } from '@/composables/useGsap';

const rootEl = ref<HTMLElement | null>(null);

const LEVELS = [
  {
    num: 'Nivel 01',
    img: '/home/step-capture.jpg',
    title: 'Sube la jugada de ella',
    copy: 'Una captura o el chat completo. Alfii lo lee entero y abre el expediente de esa partida, solo para ti.',
    reward: '+120 XP · Visión',
    pct: 33,
  },
  {
    num: 'Nivel 02',
    img: '/home/step-analysis.jpg',
    title: 'Descifra el tablero',
    copy: 'Subtexto, arquetipo, radar de red flags y el tiempo exacto que debes esperar antes de mover.',
    reward: '+240 XP · Lectura',
    pct: 66,
  },
  {
    num: 'Nivel 03',
    img: '/home/step-play.jpg',
    title: 'Ejecuta tu movimiento',
    copy: 'Tres scripts calibrados a tu estilo: Poder, Caballero y Pícaro. Copias, envías, y la partida cambia.',
    reward: '+500 XP · Jugada maestra',
    pct: 100,
  },
];

const TICKER = [
  'Subtexto en 10 segundos', 'Arquetipo diagnosticado', 'Radar de red flags',
  'Timing exacto', '3 scripts calibrados', 'Expediente privado', 'Memoria por partida',
];

useGsapContext(({ mm }) => {
  mm.add(MOTION_OK, () => {
    const root = rootEl.value;
    if (!root) return;
    const splits: SplitText[] = [];

    gsap.utils.toArray<HTMLElement>('.level-scene', root).forEach((scene) => {
      const title = scene.querySelector('h2');
      const split = title ? headingReveal(title, { start: 'top 78%', by: 'lines' }) : null;
      if (split) splits.push(split);

      gsap.fromTo(
        scene.querySelector('.lv-photo'),
        { yPercent: -9 },
        {
          yPercent: 9, ease: 'none',
          scrollTrigger: { trigger: scene, start: 'top bottom', end: 'bottom top', scrub: true },
        }
      );

      gsap.from(scene.querySelectorAll('.scene-eyebrow, .scene-copy, .lv-reward'), {
        opacity: 0, y: 18, duration: 0.7, stagger: 0.09, ease: 'power3.out',
        scrollTrigger: { trigger: scene, start: 'top 70%', once: true },
      });

      // La barra de XP del nivel se llena cuando el nivel esta en pantalla.
      const fill = scene.querySelector('.xp-fill') as HTMLElement | null;
      if (fill) {
        gsap.fromTo(
          fill,
          { scaleX: Number(fill.dataset.from ?? 0) / 100 },
          {
            scaleX: Number(fill.dataset.to ?? 100) / 100,
            ease: 'power2.out', duration: 1.1,
            scrollTrigger: { trigger: scene, start: 'top 55%', once: true },
          }
        );
      }
    });

    return () => splits.forEach((s) => s.revert());
  });
}, rootEl);
</script>

<template>
  <div ref="rootEl">
    <section v-for="(lv, i) in LEVELS" :key="lv.num" class="level-scene">
      <div class="scene-media" aria-hidden="true">
        <img class="lv-photo" :src="lv.img" alt="" loading="lazy" />
        <div class="scene-scrim"></div>
      </div>

      <div class="scene-content">
        <p class="scene-eyebrow">Tutorial · {{ lv.num }}</p>
        <h2 class="scene-title">{{ lv.title }}</h2>
        <p class="scene-copy">{{ lv.copy }}</p>

        <p class="lv-reward">
          <span class="rw-badge">{{ lv.reward }}</span>
        </p>

        <!-- Progreso del tutorial: se llena nivel a nivel -->
        <div class="xp-bar" aria-hidden="true">
          <span
            class="xp-fill"
            :data-from="i === 0 ? 0 : LEVELS[i - 1]!.pct"
            :data-to="lv.pct"
          ></span>
          <em>{{ lv.pct }}%</em>
        </div>
      </div>
    </section>

    <div class="ticker-band" aria-hidden="true">
      <div class="ticker-track">
        <span v-for="n in 2" :key="n" class="ticker-run">
          <span v-for="t in TICKER" :key="t" class="ticker-item">
            <strong>{{ t }}</strong><i>•</i>
          </span>
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.level-scene {
  position: relative; min-height: 100dvh;
  display: flex; align-items: flex-end;
  overflow: clip; border-top: 1px solid rgba($alfii-cream, 0.06);
}

.scene-media {
  position: absolute; inset: 0;
  z-index: 0; pointer-events: none;

  .lv-photo {
    width: 100%; height: 114%;
    margin-top: -7%;
    object-fit: cover; object-position: center;
    will-change: transform;
  }

  .scene-scrim {
    position: absolute; inset: 0;
    background:
      linear-gradient(180deg, rgba($alfii-navy, 0.6) 0%, rgba($alfii-navy, 0.2) 40%, rgba($alfii-navy, 0.93) 90%),
      radial-gradient(110% 80% at 50% 45%, transparent 0%, rgba($alfii-navy, 0.4) 100%);
  }
}

.scene-content {
  position: relative; z-index: 1;
  width: 100%; max-width: 1180px;
  margin: 0 auto; padding: 0 clamp(20px, 5vw, 48px) clamp(48px, 9vh, 96px);
  @include stack(clamp(12px, 2vh, 20px));
}

.scene-eyebrow {
  font-family: var(--font-editorial);
  font-size: $fs-2xs; font-weight: 600;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: rgba($alfii-cream, 0.62);
}

.scene-title {
  font-family: var(--font-display); font-weight: 800;
  font-size: clamp(2.2rem, 7.5vw, 4.6rem); line-height: 1;
  letter-spacing: -0.03em; color: $alfii-cream;
  text-wrap: balance; max-width: 15ch;
}

.scene-copy {
  font-family: var(--font-editorial); font-size: clamp(1.0625rem, 1.7vw, 1.25rem);
  line-height: 1.65; color: rgba($alfii-cream, 0.82);
  max-width: 48ch;
}

.lv-reward .rw-badge {
  display: inline-block; padding: 8px 14px;
  border-radius: 999px; border: 1px solid rgba($alfii-sage, 0.5);
  background-color: rgba($alfii-sage, 0.1); font-family: var(--font-editorial);
  font-size: $fs-2xs; font-weight: 600;
  letter-spacing: 0.1em; text-transform: uppercase;
  color: $alfii-sage;
}

.xp-bar {
  position: relative; max-width: 420px;
  height: 8px; border-radius: 5px;
  background-color: rgba($alfii-cream, 0.1); border: 1px solid rgba($alfii-cream, 0.12);
  overflow: visible;

  .xp-fill {
    display: block; height: 100%;
    border-radius: 5px; transform: scaleX(0);
    transform-origin: left center; background: linear-gradient(90deg, $alfii-red, #ff6b81);
    box-shadow: 0 0 14px rgba($alfii-red, 0.6);
  }

  em {
    position: absolute;
    right: -6px; top: -22px;
    font-style: normal; font-family: var(--font-editorial);
    font-size: 12px; font-weight: 600;
    letter-spacing: 0.1em; color: rgba($alfii-cream, 0.55);
  }
}

.ticker-band {
  overflow: hidden; padding: clamp(16px, 2.6vh, 26px) 0;
  border-top: 1px solid rgba($alfii-cream, 0.08);
  border-bottom: 1px solid rgba($alfii-cream, 0.08); background-color: rgba($alfii-plum, 0.3);
}

.ticker-track {
  display: flex; width: max-content;
  animation: tickerScroll 36s linear infinite;
}

.ticker-run { display: flex; }

.ticker-item {
  @include row(0, center);
  white-space: nowrap;

  strong {
    font-family: var(--font-display); font-weight: 700;
    font-size: clamp(1.0625rem, 1.8vw, 1.25rem); letter-spacing: -0.01em;
    color: rgba($alfii-cream, 0.9);
  }

  i {
    font-style: normal; margin: 0 clamp(14px, 2vw, 26px);
    color: $alfii-red;
  }
}

@keyframes tickerScroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .ticker-track { animation: none; }
}
</style>
