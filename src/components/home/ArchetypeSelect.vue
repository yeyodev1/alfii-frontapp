<script setup lang="ts">
/**
 * SELECCIÓN DE RIVAL — los 7 arquetipos del producto como pantalla de
 * seleccion de personaje. Son los mismos arquetipos que Alfii diagnostica en
 * la app (Koakuma, Himedere, Onee-san, Tsun-kuudere, Deredere, Dandere,
 * Yandere): la landing enseña el catalogo real, no uno de mentira.
 */
import { ref } from 'vue';
import SectionShell from '@/components/home/SectionShell.vue';
import ArchetypeDossier from '@/components/home/ArchetypeDossier.vue';
import { HOME_ARCHETYPES, type HomeArchetype } from '@/config/homeArchetypes';
import { useModal } from '@/composables/useModal';
import { useGsapContext, gsap, MOTION_OK } from '@/composables/useGsap';

const emit = defineEmits<{ (e: 'cta'): void }>();

const rootEl = ref<HTMLElement | null>(null);
const { open, close } = useModal();

const ARCHETYPES = HOME_ARCHETYPES;

const failed = ref<Set<string>>(new Set());
function markFailed(key: string) {
  failed.value = new Set([...failed.value, key]);
}

/** Tocar una carta abre su ficha de rival completa. */
function openDossier(archetype: HomeArchetype) {
  open('archetypeDossier', ArchetypeDossier, {
    archetype,
    onCta: () => {
      close();
      emit('cta');
    },
  });
}

useGsapContext(({ mm }) => {
  mm.add(MOTION_OK, () => {
    gsap.from('.rival-card', {
      opacity: 0, y: 40, duration: 0.6, stagger: 0.07, ease: 'power3.out',
      scrollTrigger: { trigger: '.rival-grid', start: 'top 84%', once: true },
    });
  });
}, rootEl);
</script>

<template>
  <div ref="rootEl" class="rival-wrap">
    <SectionShell
      eyebrow="Selección de rival · 7 arquetipos"
      title="¿Contra quién estás jugando?"
      subtitle="Alfii diagnostica su arquetipo con la primera captura. Este es el plantel completo — cada una se juega distinto."
    >
      <ul class="rival-grid">
        <li v-for="a in ARCHETYPES" :key="a.key">
          <button type="button" class="rival-card" @click="openDossier(a)">
          <figure class="rc-media">
            <img
              v-if="!failed.has(a.key)"
              :src="`/home/arch-${a.key}.jpg`"
              :alt="a.name"
              loading="lazy"
              @error="markFailed(a.key)"
            />
            <span v-else class="rc-fallback">{{ a.name.charAt(0) }}</span>
          </figure>

          <div class="rc-body">
            <span class="rc-diff" :aria-label="`Dificultad ${a.stars} de 5`">
              <i v-for="n in 5" :key="n" :class="{ on: n <= a.stars }">◆</i>
            </span>
            <h3>{{ a.name }}</h3>
            <p>{{ a.tag }}</p>
            <span class="rc-open">Ver ficha de rival →</span>
          </div>
          </button>
        </li>
      </ul>

      <template #foot>
        <button type="button" class="rival-cta" @click="emit('cta')">
          Sube tu captura y descubre contra quién juegas
          <span aria-hidden="true">→</span>
        </button>
      </template>
    </SectionShell>
  </div>
</template>

<style lang="scss" scoped>
.rival-wrap {
  border-top: 1px solid rgba($alfii-cream, 0.06);
}

.rival-wrap :deep(.section-head h2) {
  font-family: var(--font-display); font-weight: 800;
  font-size: clamp(2.1rem, 6.4vw, 4rem);
  letter-spacing: -0.03em; line-height: 1.02;
}

.rival-wrap :deep(.eyebrow) {
  font-family: var(--font-editorial);
  letter-spacing: 0.22em; text-transform: uppercase;
}

// Plantel con gap: 2 columnas en movil, hasta 4 en escritorio. Las cartas
// respiran entre si — es un roster, no un collage.
.rival-grid {
  list-style: none;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(10px, 1.8vw, 18px);

  @media (min-width: 768px) { grid-template-columns: repeat(3, 1fr); }
  @media (min-width: 1180px) { grid-template-columns: repeat(4, 1fr); }
}

.rival-card {
  display: block;
  width: 100%;
  text-align: left;
  cursor: pointer;
  border-radius: 16px;
  overflow: hidden;
  background-color: rgba($alfii-plum, 0.5);
  border: 1px solid rgba($alfii-cream, 0.12);
  transition: transform $dur-fast $ease-out, border-color $dur-fast $ease-out,
    box-shadow $dur-fast $ease-out;

  &:hover {
    transform: translateY(-5px);
    border-color: rgba($alfii-red, 0.7);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55), 0 0 28px rgba($alfii-red, 0.2);

    .rc-media img { transform: scale(1.05); }
  }

  .rc-media {
    aspect-ratio: 3 / 4;
    overflow: hidden;
    position: relative;
    background: linear-gradient(160deg, rgba($alfii-red, 0.2), rgba($alfii-navy, 0.9));

    img {
      width: 100%; height: 100%;
      object-fit: cover;
      object-position: center 22%;
      transition: transform 0.6s $ease-out;
    }

    .rc-fallback {
      position: absolute; inset: 0;
      @include center;
      font-family: var(--font-display);
      font-size: 3rem; font-weight: 800;
      color: rgba($alfii-cream, 0.5);
    }

    // La carta funde hacia su pie: el nombre siempre se lee.
    &::after {
      content: '';
      position: absolute;
      left: 0; right: 0; bottom: 0;
      height: 46%;
      background: linear-gradient(180deg, transparent, rgba($alfii-navy, 0.92));
    }
  }

  .rc-body {
    @include stack(4px);
    padding: 12px 14px 14px;
    margin-top: -44px;
    position: relative;
  }

  .rc-diff {
    @include row(2px, center);

    i {
      font-style: normal;
      font-size: 12px;
      color: rgba($alfii-cream, 0.18);

      &.on { color: $alfii-red; text-shadow: 0 0 6px rgba($alfii-red, 0.6); }
    }
  }

  h3 {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(1.05rem, 1.8vw, 1.3rem);
    letter-spacing: -0.01em;
    color: $alfii-cream;
  }

  p {
    font-family: var(--font-editorial);
    font-size: clamp(0.875rem, 1.2vw, 0.9375rem);
    line-height: 1.5;
    color: rgba($alfii-cream, 0.62);
  }

  .rc-open {
    font-family: var(--font-editorial);
    font-size: 12px; font-weight: 600;
    letter-spacing: 0.1em; text-transform: uppercase;
    color: rgba($alfii-red, 0.85);
    opacity: 0;
    transition: opacity $dur-fast $ease-out;
  }

  &:hover .rc-open { opacity: 1; }
}

.rival-cta {
  @include row(10px, center, center);
  margin: 0 auto;
  padding: 14px 26px;
  border-radius: 999px;
  border: 1px solid rgba($alfii-red, 0.6);
  background-color: rgba($alfii-red, 0.12);
  font-family: var(--font-editorial);
  font-size: $fs-sm; font-weight: 600;
  color: $alfii-cream;
  cursor: pointer;
  transition: background-color $dur-fast $ease-out, box-shadow $dur-fast $ease-out;

  &:hover {
    background-color: rgba($alfii-red, 0.25);
    box-shadow: 0 0 30px rgba($alfii-red, 0.3);
  }

  span { color: $alfii-red; }
}
</style>
