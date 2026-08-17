<script setup lang="ts">
/**
 * FICHA DE RIVAL — pantalla de detalle de personaje.
 *
 * Se abre al tocar una carta del plantel: retrato con glow, stats que se
 * llenan al entrar, sus jugadas como move-list y el plan de juego de Alfii.
 * Cierra con el CTA de partida. Todo en un solo modal a pantalla casi
 * completa, como la ficha de un fighting game.
 */
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import { gsap } from '@/composables/useGsap';
import type { HomeArchetype } from '@/config/homeArchetypes';

const props = defineProps<{ archetype: HomeArchetype }>();

const emit = defineEmits<{ (e: 'close'): void; (e: 'cta'): void }>();

const panel = ref<HTMLElement | null>(null);
const backdrop = ref<HTMLElement | null>(null);
const imgFailed = ref(false);

const STAT_LABELS: Record<string, string> = {
  testeo: 'Testeo',
  hermetismo: 'Hermetismo',
  riesgo: 'Riesgo',
};

const motionOk =
  typeof window !== 'undefined' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let ctx: gsap.Context | null = null;

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
}

onMounted(() => {
  window.addEventListener('keydown', onKey);
  if (!motionOk) return;

  void nextTick(() => {
    ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from(backdrop.value, { opacity: 0, duration: 0.25 }, 0)
        .from(panel.value, { y: 46, opacity: 0, scale: 0.96, duration: 0.5, ease: 'back.out(1.2)' }, 0.05)
        .from('.rd-portrait', { x: -30, opacity: 0, duration: 0.55, clearProps: 'opacity,transform' }, 0.2)
        .from('.rd-head > *', { y: 16, opacity: 0, stagger: 0.06, duration: 0.45, clearProps: 'opacity,transform' }, 0.25)
        .from('.rd-block', { y: 20, opacity: 0, stagger: 0.09, duration: 0.5, clearProps: 'opacity,transform' }, 0.35);

      // Las stats se llenan como en una pantalla de personaje.
      gsap.utils.toArray<HTMLElement>('.rd-stat i').forEach((bar) => {
        gsap.fromTo(
          bar,
          { scaleX: 0 },
          { scaleX: Number(bar.dataset.v ?? 0) / 100, duration: 0.9, ease: 'power2.out', delay: 0.45 }
        );
      });
    }, panel.value ?? undefined);
  });
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  ctx?.revert();
});
</script>

<template>
  <Teleport to="body">
    <div ref="backdrop" class="rd-backdrop" @click.self="emit('close')">
      <div ref="panel" class="rd-panel">
        <button class="rd-close" aria-label="Cerrar" @click="emit('close')">
          <BaseIcon name="close" size="sm" color="cream" />
        </button>

        <!-- Retrato con su aura -->
        <figure class="rd-portrait" aria-hidden="true">
          <img
            v-if="!imgFailed"
            :src="`/home/arch-${archetype.key}.jpg`"
            :alt="archetype.name"
            @error="imgFailed = true"
          />
          <span v-else class="rd-fallback">{{ archetype.name.charAt(0) }}</span>
        </figure>

        <div class="rd-body">
          <header class="rd-head">
            <p class="rd-eyebrow">Ficha de rival · Arquetipo</p>
            <h2>{{ archetype.name }}</h2>
            <p class="rd-diff">
              Dificultad
              <span><i v-for="n in 5" :key="n" :class="{ on: n <= archetype.stars }">◆</i></span>
            </p>
            <blockquote class="rd-quote">{{ archetype.quote }}</blockquote>
          </header>

          <!-- Stats -->
          <div class="rd-block rd-stats">
            <p v-for="(v, k) in archetype.stats" :key="k" class="rd-stat">
              <span class="st-label">{{ STAT_LABELS[k] }}</span>
              <span class="st-track"><i :data-v="v"></i></span>
              <span class="st-val">{{ v }}</span>
            </p>
          </div>

          <!-- Sus jugadas -->
          <div class="rd-block">
            <h3><BaseIcon name="archetype" size="xs" color="red" /> Cómo juega</h3>
            <ul>
              <li v-for="m in archetype.moves" :key="m">{{ m }}</li>
            </ul>
          </div>

          <!-- El plan -->
          <div class="rd-block">
            <h3><BaseIcon name="listCheck" size="xs" color="sage" /> El plan de Alfii</h3>
            <ul class="plan">
              <li v-for="p in archetype.plan" :key="p">{{ p }}</li>
            </ul>
          </div>

          <p v-if="archetype.warning" class="rd-block rd-warning">
            <BaseIcon name="info" size="xs" color="red" />
            <span>{{ archetype.warning }}</span>
          </p>

          <button class="rd-cta rd-block" @click="emit('cta')">
            Jugar contra {{ archetype.name }} · Sube tu captura
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.rd-backdrop {
  position: fixed; inset: 0;
  z-index: 95;
  display: flex; align-items: center; justify-content: center;
  padding: clamp(10px, 3vw, 40px);
  background: rgba($alfii-navy, 0.82);
  backdrop-filter: blur(10px);
  overflow-y: auto;
}

.rd-panel {
  position: relative;
  display: flex;
  width: 100%; max-width: 920px;
  max-height: min(92dvh, 780px);
  border-radius: 22px;
  overflow: hidden;
  border: 1px solid rgba($alfii-red, 0.35);
  background:
    radial-gradient(80% 60% at 20% 0%, rgba($alfii-red, 0.14) 0%, transparent 70%),
    linear-gradient(160deg, rgba($alfii-plum, 0.98) 0%, rgba($alfii-navy, 0.99) 100%);
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.65), 0 0 60px rgba($alfii-red, 0.15);

  @media (max-width: 767px) { flex-direction: column; overflow-y: auto; }
}

.rd-close {
  position: absolute; top: 12px; right: 12px;
  z-index: 3;
  @include center;
  width: 38px; height: 38px;
  border-radius: 50%;
  background-color: rgba($alfii-navy, 0.7);
  border: 1px solid rgba($alfii-cream, 0.2);
  cursor: pointer;

  &:hover { border-color: $alfii-red; }
}

.rd-portrait {
  position: relative;
  flex: 0 0 42%;
  min-height: 240px;
  background: linear-gradient(160deg, rgba($alfii-red, 0.2), rgba($alfii-navy, 0.9));

  img {
    width: 100%; height: 100%;
    object-fit: cover; object-position: center 15%;
  }

  .rd-fallback {
    position: absolute; inset: 0;
    @include center;
    font-family: var(--font-display);
    font-size: 5rem; font-weight: 800;
    color: rgba($alfii-cream, 0.4);
  }

  // El retrato funde hacia el contenido, no se corta a hachazo.
  &::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent 65%, rgba($alfii-plum, 0.95) 100%);

    @media (max-width: 767px) {
      background: linear-gradient(180deg, transparent 55%, rgba($alfii-plum, 0.98) 100%);
    }
  }

  @media (max-width: 767px) { flex: 0 0 300px; }
}

.rd-body {
  flex: 1 1 auto;
  min-width: 0;
  @include stack(clamp(12px, 2vh, 18px));
  padding: clamp(18px, 3vw, 30px);
  overflow-y: auto;
}

.rd-head { @include stack(6px); }

.rd-eyebrow {
  font-family: var(--font-editorial);
  font-size: 12px; font-weight: 600;
  letter-spacing: 0.2em; text-transform: uppercase;
  color: rgba($alfii-cream, 0.5);
}

.rd-head h2 {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(1.9rem, 4.5vw, 2.8rem);
  letter-spacing: -0.02em;
  color: $alfii-cream;
}

.rd-diff {
  @include row(8px, center);
  font-family: var(--font-editorial);
  font-size: $fs-2xs; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: rgba($alfii-cream, 0.55);

  i {
    font-style: normal; font-size: 12px;
    color: rgba($alfii-cream, 0.18);
    &.on { color: $alfii-red; text-shadow: 0 0 6px rgba($alfii-red, 0.6); }
  }
}

.rd-quote {
  font-family: var(--font-editorial);
  font-size: $fs-sm; font-style: italic;
  color: rgba($alfii-cream, 0.7);
  padding-left: 12px;
  border-left: 2px solid rgba($alfii-red, 0.6);
}

.rd-stats { @include stack(8px); }

.rd-stat {
  @include row(10px, center);
  font-family: var(--font-editorial);
  font-size: $fs-2xs;

  .st-label { flex: 0 0 92px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: rgba($alfii-cream, 0.6); }

  .st-track {
    flex: 1 1 auto;
    height: 7px; border-radius: 4px;
    background-color: rgba($alfii-cream, 0.08);
    border: 1px solid rgba($alfii-cream, 0.1);
    overflow: hidden;

    i {
      display: block; height: 100%;
      transform: scaleX(0); transform-origin: left center;
      background: linear-gradient(90deg, $alfii-red, #ff6b81);
      box-shadow: 0 0 10px rgba($alfii-red, 0.5);
    }
  }

  .st-val { flex: 0 0 28px; text-align: right; font-weight: 700; color: $alfii-cream; }
}

.rd-block h3 {
  @include row(8px, center);
  font-family: var(--font-display);
  font-weight: 700; font-size: $fs-sm;
  color: $alfii-cream;
  margin-bottom: 8px;
}

.rd-block ul {
  list-style: none;
  @include stack(7px);

  li {
    position: relative;
    padding-left: 16px;
    font-family: var(--font-editorial);
    font-size: clamp(0.9375rem, 1.3vw, 1rem);
    line-height: 1.55;
    color: rgba($alfii-cream, 0.78);

    &::before {
      content: '▸';
      position: absolute; left: 0;
      color: rgba($alfii-red, 0.85);
    }
  }

  &.plan li::before { color: $alfii-sage; }
}

.rd-warning {
  @include row(10px, flex-start);
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba($alfii-red, 0.45);
  background-color: rgba($alfii-red, 0.1);
  font-family: var(--font-editorial);
  font-size: $fs-2xs; line-height: 1.55;
  color: rgba($alfii-cream, 0.85);
}

.rd-cta {
  @include row(10px, center, center);
  padding: 14px 22px;
  border-radius: 999px;
  background-color: $alfii-red;
  font-family: var(--font-editorial);
  font-size: $fs-sm; font-weight: 600;
  color: $alfii-cream;
  cursor: pointer;
  box-shadow: 0 10px 30px rgba($alfii-red, 0.45);

  &:hover { filter: brightness(1.08); }
}
</style>
