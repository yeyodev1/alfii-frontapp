<script setup lang="ts">
/**
 * EL BOTÍN — inventario de partida.
 *
 * El maletin (cofre) abre la seccion y debajo, la rejilla de 6 slots estilo
 * inventario de juego: marco por rareza, icono grande, nombre y una linea.
 * El slot LEGENDARIO respira con glow propio. Nada de listas editoriales:
 * esto es el loot que suelta cada captura.
 */
import { ref } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import SectionShell from '@/components/home/SectionShell.vue';
import { deliverables } from '@/config/homeContent';
import { useGsapContext, gsap, MOTION_OK } from '@/composables/useGsap';

const rootEl = ref<HTMLElement | null>(null);

const RARITY = ['RARO', 'ÉPICO', 'LEGENDARIO', 'ÉPICO', 'RARO', 'LEGENDARIO'] as const;

useGsapContext(({ mm }) => {
  mm.add(MOTION_OK, () => {
    const root = rootEl.value;
    if (!root) return;

    // El cofre se abre al llegar: sube, escala y suelta el brillo.
    gsap.from('.loot-chest', {
      opacity: 0, y: 40, scale: 0.96, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: '.loot-chest', start: 'top 85%', once: true },
    });

    // Los slots caen como drops: uno a uno, con rebote corto.
    gsap.from('.loot-slot', {
      opacity: 0, y: 34, scale: 0.92, duration: 0.6, stagger: 0.09,
      ease: 'back.out(1.5)',
      scrollTrigger: { trigger: '.loot-grid', start: 'top 82%', once: true },
    });
  });
}, rootEl);
</script>

<template>
  <div id="expediente" ref="rootEl" class="loot-wrap">
    <SectionShell
      eyebrow="Botín · Se suelta al subir una captura"
      title="Cada partida deja loot"
      subtitle="Subes la captura y estos seis items caen a tu inventario, completos, en diez segundos."
    >
      <figure class="loot-chest" aria-hidden="true">
        <img src="/home/arsenal.jpg" alt="" loading="lazy" />
        <figcaption>El expediente: tu inventario de la partida</figcaption>
      </figure>

      <ul class="loot-grid">
        <li
          v-for="(d, i) in deliverables"
          :key="d.title"
          class="loot-slot"
          :class="`rarity-${RARITY[i]}`"
        >
          <span class="ls-top">
            <span class="ls-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <em class="ls-rarity">{{ RARITY[i] }}</em>
          </span>

          <span class="ls-icon">
            <BaseIcon :name="d.icon" size="xl" color="cream" />
          </span>

          <h3>{{ d.title }}</h3>
          <p>{{ d.text }}</p>
        </li>
      </ul>
    </SectionShell>
  </div>
</template>

<style lang="scss" scoped>
.loot-wrap {
  border-top: 1px solid rgba($alfii-cream, 0.06);
  background:
    radial-gradient(80% 50% at 50% 0%, rgba($alfii-red, 0.07) 0%, transparent 70%),
    rgba($alfii-plum, 0.16);
}

.loot-wrap :deep(.section-head h2) {
  font-family: var(--font-display); font-weight: 800;
  font-size: clamp(2.1rem, 6.4vw, 4rem);
  letter-spacing: -0.03em; line-height: 1.02;
}

.loot-wrap :deep(.eyebrow) {
  font-family: var(--font-editorial);
  letter-spacing: 0.22em; text-transform: uppercase;
}

// El cofre: banner ancho con la caja de loot, recortado cinematografico.
.loot-chest {
  width: 100%; max-width: 880px;
  margin: 0 auto;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba($alfii-red, 0.35);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba($alfii-red, 0.12);
  position: relative;

  img {
    display: block;
    width: 100%;
    aspect-ratio: 21 / 9;
    object-fit: cover;
    object-position: center 62%;
  }

  figcaption {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    padding: 22px 18px 12px;
    text-align: center;
    font-family: var(--font-editorial);
    font-size: $fs-2xs; font-weight: 600;
    letter-spacing: 0.16em; text-transform: uppercase;
    color: rgba($alfii-cream, 0.8);
    background: linear-gradient(180deg, transparent, rgba($alfii-navy, 0.9));
  }
}

// Rejilla de inventario: slots con gap, 1 col movil, 2 tablet, 3 escritorio.
.loot-grid {
  list-style: none;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(12px, 2vw, 20px);
  margin-top: clamp(8px, 1.6vw, 16px);

  @media (min-width: 620px) { grid-template-columns: 1fr 1fr; }
  @media (min-width: 1024px) { grid-template-columns: 1fr 1fr 1fr; }
}

.loot-slot {
  position: relative;
  @include stack(10px);
  padding: clamp(18px, 2.6vw, 26px);
  border-radius: 16px;
  background:
    linear-gradient(160deg, rgba($alfii-navy, 0.85) 0%, rgba($alfii-plum, 0.55) 100%);
  border: 1px solid var(--slot, rgba($alfii-cream, 0.14));
  transition: transform $dur-fast $ease-out, box-shadow $dur-fast $ease-out;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.5), 0 0 26px color-mix(in srgb, var(--slot) 55%, transparent);
  }

  .ls-top {
    @include row(8px, center, space-between);
  }

  .ls-num {
    font-family: var(--font-editorial);
    font-size: 12px; font-weight: 600;
    letter-spacing: 0.14em;
    color: rgba($alfii-cream, 0.45);
  }

  .ls-rarity {
    font-style: normal;
    font-family: var(--font-editorial);
    font-size: 12px; font-weight: 700;
    letter-spacing: 0.16em;
    padding: 3px 9px;
    border-radius: 7px;
    color: var(--slot);
    border: 1px solid color-mix(in srgb, var(--slot) 60%, transparent);
    background-color: color-mix(in srgb, var(--slot) 10%, transparent);
  }

  // Vitrina del item: el icono grande en su pedestal con el glow de rareza.
  .ls-icon {
    @include center;
    width: 64px; height: 64px;
    border-radius: 14px;
    background:
      radial-gradient(60% 60% at 50% 40%, color-mix(in srgb, var(--slot) 26%, transparent) 0%, transparent 100%),
      rgba($alfii-navy, 0.7);
    border: 1px solid color-mix(in srgb, var(--slot) 40%, transparent);
  }

  h3 {
    font-family: var(--font-display);
    font-weight: 700;
    font-size: clamp(1.05rem, 1.9vw, 1.25rem);
    letter-spacing: -0.01em;
    line-height: 1.2;
    color: $alfii-cream;
  }

  p {
    font-family: var(--font-editorial);
    font-size: clamp(0.9375rem, 1.3vw, 1rem);
    line-height: 1.6;
    color: rgba($alfii-cream, 0.62);
  }

  // Colores de rareza: azul raro, morado epico, dorado legendario.
  &.rarity-RARO { --slot: #9db8dd; }
  &.rarity-ÉPICO { --slot: #c79bf0; }
  &.rarity-LEGENDARIO {
    --slot: #eec25f;
    animation: legendaryBreath 3.4s ease-in-out infinite;
  }
}

@keyframes legendaryBreath {
  0%, 100% { box-shadow: 0 0 0 rgba(#eec25f, 0); }
  50% { box-shadow: 0 0 30px rgba(#eec25f, 0.22); }
}

@media (prefers-reduced-motion: reduce) {
  .loot-slot.rarity-LEGENDARIO { animation: none; }
}
</style>
