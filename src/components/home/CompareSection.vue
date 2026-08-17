<script setup lang="ts">
/**
 * RONDA FINAL — rehecha de 0 como pantalla partida de duelo.
 *
 * Dos paneles enfrentados sobre la arena del versus: "Tú solo" sangra en
 * carmesi apagado con su barra de vida al 24%; "Con Alfii" brilla en salvia
 * con la barra al 92% y el sello de ganador. Las barras se llenan al entrar
 * y las filas de cada lado llegan en oleadas opuestas.
 */
import { ref } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import AlfiiLogo from '@/components/shared/AlfiiLogo.vue';
import SectionShell from '@/components/home/SectionShell.vue';
import { comparison } from '@/config/homeContent';
import { useGsapContext, gsap, MOTION_OK } from '@/composables/useGsap';

const rootEl = ref<HTMLElement | null>(null);

useGsapContext(({ mm }) => {
  mm.add(MOTION_OK, () => {
    const root = rootEl.value;
    if (!root) return;

    // Los paneles chocan desde sus esquinas, como la intro de un duelo.
    gsap.from('.duel-bad', {
      opacity: 0, x: -50, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: '.duel', start: 'top 78%', once: true },
    });
    gsap.from('.duel-good', {
      opacity: 0, x: 50, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: '.duel', start: 'top 78%', once: true },
    });
    gsap.from('.duel-vs', {
      scale: 0, rotate: -180, duration: 0.7, ease: 'back.out(1.6)', delay: 0.3,
      scrollTrigger: { trigger: '.duel', start: 'top 78%', once: true },
    });

    // Las barras de vida se llenan cuando el duelo esta en pantalla.
    gsap.utils.toArray<HTMLElement>('.hp-fill', root).forEach((bar) => {
      gsap.fromTo(
        bar,
        { scaleX: 0 },
        {
          scaleX: Number(bar.dataset.hp ?? 0) / 100,
          duration: 1.2, ease: 'power2.out', delay: 0.5,
          scrollTrigger: { trigger: '.duel', start: 'top 72%', once: true },
        }
      );
    });

    // Filas en oleadas opuestas: derrota por la izquierda, victoria por la derecha.
    gsap.from('.duel-bad li', {
      opacity: 0, x: -22, duration: 0.5, stagger: 0.1, ease: 'power2.out',
      scrollTrigger: { trigger: '.duel', start: 'top 62%', once: true },
    });
    gsap.from('.duel-good li', {
      opacity: 0, x: 22, duration: 0.5, stagger: 0.1, ease: 'power2.out',
      scrollTrigger: { trigger: '.duel', start: 'top 62%', once: true },
    });
  });
}, rootEl);
</script>

<template>
  <div ref="rootEl" class="arena-wrap">
    <div class="arena-bg" aria-hidden="true">
      <img src="/home/versus.jpg" alt="" loading="lazy" />
    </div>

    <SectionShell
      eyebrow="Ronda final · La misma partida, dos jugadores"
      eyebrow-icon="gavel"
      eyebrow-color="cream"
      title="Solo vs. con Alfii"
    >
      <div class="duel">
        <!-- Panel perdedor -->
        <section class="duel-panel duel-bad">
          <header>
            <span class="dp-name">Tú solo</span>
            <span class="dp-hp"><i class="hp-fill" data-hp="24"></i><em>24</em></span>
          </header>
          <ul>
            <li v-for="row in comparison" :key="row.without">
              <BaseIcon name="close" color="muted" size="xs" />
              <span>{{ row.without }}</span>
            </li>
          </ul>
        </section>

        <span class="duel-vs" aria-hidden="true">VS</span>

        <!-- Panel ganador -->
        <section class="duel-panel duel-good">
          <header>
            <span class="dp-name"><AlfiiLogo size="sm" mode="iso" /> Con Alfii</span>
            <span class="dp-hp good"><i class="hp-fill" data-hp="92"></i><em>92</em></span>
            <span class="dp-win">GANA</span>
          </header>
          <ul>
            <li v-for="row in comparison" :key="row.with">
              <BaseIcon name="check" color="sage" size="xs" />
              <span>{{ row.with }}</span>
            </li>
          </ul>
        </section>
      </div>
    </SectionShell>
  </div>
</template>

<style lang="scss" scoped>
:deep(.section-head h2) {
  font-family: var(--font-display); font-weight: 800;
  font-size: clamp(2.1rem, 6.4vw, 4rem);
  letter-spacing: -0.03em; line-height: 1.02;
}
:deep(.eyebrow) { font-family: var(--font-editorial); letter-spacing: 0.22em; text-transform: uppercase; }

.arena-wrap {
  position: relative;
  overflow: clip;
  border-top: 1px solid rgba($alfii-cream, 0.06);

  :deep(.home-section) { position: relative; z-index: 1; }
}

.arena-bg {
  position: absolute; inset: 0;
  z-index: 0; pointer-events: none;

  img {
    width: 100%; height: 100%;
    object-fit: cover; object-position: center 30%;
    opacity: 0.18;
    mask-image: radial-gradient(110% 90% at 50% 40%, #000 0%, transparent 100%);
  }
}

// El duelo: dos paneles enfrentados con el emblema en medio.
.duel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 2vw, 22px);
  width: 100%; max-width: 1040px;
  margin: 0 auto;

  @media (min-width: 900px) { flex-direction: row; align-items: stretch; }
}

.duel-vs {
  @include center;
  align-self: center;
  z-index: 2;
  width: 58px; height: 58px;
  flex: 0 0 auto;
  border-radius: 50%;
  font-family: var(--font-display);
  font-weight: 800; font-size: 1.15rem;
  color: $alfii-cream;
  background: linear-gradient(160deg, $alfii-red, #7a2410);
  border: 2px solid rgba($alfii-cream, 0.25);
  box-shadow: 0 0 34px rgba($alfii-red, 0.6);

  // En escritorio flota montado sobre la costura de los dos paneles.
  @media (min-width: 900px) {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
  }
}

.duel-panel {
  flex: 1 1 0;
  min-width: 0;
  border-radius: 18px;
  overflow: hidden;
  backdrop-filter: blur(6px);

  header {
    @include row(10px, center, space-between);
    padding: 14px 18px;
    border-bottom: 1px solid rgba($alfii-cream, 0.08);
  }

  .dp-name {
    @include row(8px, center);
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(1.125rem, 1.8vw, 1.25rem);
    letter-spacing: -0.01em;
  }

  ul {
    list-style: none;
    @include stack(0);
  }

  li {
    @include row(10px, flex-start);
    padding: clamp(12px, 1.8vw, 16px) 18px;
    border-bottom: 1px solid rgba($alfii-cream, 0.05);
    font-family: var(--font-editorial);
    font-size: clamp(0.9375rem, 1.4vw, 1.0625rem);
    line-height: 1.55;

    &:last-child { border-bottom: none; }
  }
}

// Barra de vida compacta del header de cada panel.
.dp-hp {
  position: relative;
  flex: 1 1 auto;
  max-width: 150px;
  height: 8px;
  border-radius: 5px;
  background-color: rgba($alfii-cream, 0.08);
  border: 1px solid rgba($alfii-cream, 0.14);

  .hp-fill {
    display: block; height: 100%;
    border-radius: 5px;
    transform: scaleX(0); transform-origin: left center;
    background: linear-gradient(90deg, #7a2410, $alfii-red);
  }

  &.good .hp-fill {
    background: linear-gradient(90deg, $alfii-sage, #7fdcb2);
    box-shadow: 0 0 12px rgba($alfii-sage, 0.6);
  }

  em {
    position: absolute; right: -4px; top: -18px;
    font-style: normal;
    font-family: var(--font-editorial);
    font-size: 12px; font-weight: 700;
    color: rgba($alfii-cream, 0.6);
  }
}

.duel-bad {
  background: linear-gradient(170deg, rgba(#3a0e14, 0.5), rgba($alfii-navy, 0.85));
  border: 1px solid rgba($alfii-red, 0.22);

  .dp-name { color: rgba($alfii-cream, 0.55); }
  li { color: rgba($alfii-cream, 0.5); }
}

.duel-good {
  background: linear-gradient(170deg, rgba($alfii-sage, 0.1), rgba($alfii-navy, 0.88));
  border: 1px solid rgba($alfii-sage, 0.4);
  box-shadow: 0 0 40px rgba($alfii-sage, 0.1);

  .dp-name { color: $alfii-cream; }
  li { color: rgba($alfii-cream, 0.9); font-weight: $fw-semibold; }

  .dp-win {
    font-family: var(--font-editorial);
    font-size: 12px; font-weight: 800;
    letter-spacing: 0.18em;
    padding: 4px 9px;
    border-radius: 8px;
    color: $alfii-navy;
    background: linear-gradient(120deg, $alfii-sage, #7fdcb2);
    box-shadow: 0 0 14px rgba($alfii-sage, 0.5);
  }
}
</style>
