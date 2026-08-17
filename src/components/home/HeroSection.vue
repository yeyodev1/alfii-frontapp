<script setup lang="ts">
/**
 * Escena 01 — la pelicula del expediente, gobernada por el scroll.
 *
 * La seccion mide varias pantallas; dentro, un escenario sticky sostiene el
 * video mientras el scroll AVANZA su reproduccion (currentTime = progreso).
 * Bajar es reproducir: la pelicula tiene inicio y fin exactos con el dedo.
 * Encima, tres etapas de texto se relevan segun el tramo del recorrido.
 */
import { ref } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import HeroDropzone from '@/components/home/HeroDropzone.vue';
import { useGsapContext, gsap, MOTION_OK } from '@/composables/useGsap';

defineProps<{ uploading?: boolean; isDragOver?: boolean }>();

const emit = defineEmits<{
  (e: 'upload'): void;
  (e: 'drop', ev: DragEvent): void;
  (e: 'dragstate', v: boolean): void;
}>();

const rootEl = ref<HTMLElement | null>(null);
const videoEl = ref<HTMLVideoElement | null>(null);

const SPECS = ['Subtexto', 'Arquetipo', 'Timing exacto', '3 scripts'];

useGsapContext(({ mm }) => {
  mm.add(MOTION_OK, () => {
    const root = rootEl.value;
    const video = videoEl.value;
    if (!root) return;

    let duration = 0;
    const onMeta = () => (duration = video?.duration ?? 0);
    if (video) {
      video.addEventListener('loadedmetadata', onMeta);
      if (video.readyState >= 1) onMeta();
      video.addEventListener('error', () => (video.style.opacity = '0'), { once: true });
    }

    let pending = -1, raf = 0;
    const seek = (p: number) => {
      pending = p;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (video && duration && pending >= 0) {
          video.currentTime = Math.min(duration - 0.05, pending * duration);
        }
      });
    };

    gsap.to('.film-progress-bar', {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => seek(self.progress),
      },
    });

    const stages = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: true },
    });

    stages
      .to('.start-cue', { opacity: 0, duration: 0.04 }, 0.01)
      .to('.stage-1', { opacity: 0, yPercent: -12, duration: 0.14 }, 0.2)
      .fromTo('.stage-2', { opacity: 0, yPercent: 10 }, { opacity: 1, yPercent: 0, duration: 0.12 }, 0.36)
      .to('.stage-2', { opacity: 0, yPercent: -10, duration: 0.12 }, 0.56)
      .fromTo('.stage-3', { opacity: 0, yPercent: 10 }, { opacity: 1, yPercent: 0, duration: 0.14 }, 0.7);

    return () => {
      video?.removeEventListener('loadedmetadata', onMeta);
      if (raf) cancelAnimationFrame(raf);
    };
  });

  // Con movimiento reducido: sin pelicula por scroll, el poster basta.
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.stage-2, .stage-3', { display: 'none' });
  });
}, rootEl);
</script>

<template>
  <section ref="rootEl" class="film">
    <div class="film-stage">
      <img class="film-fallback" src="/home/hero.jpg" alt="" aria-hidden="true" />
      <video
        ref="videoEl"
        class="film-video"
        src="/home/hero-film.mp4"
        poster="/home/hero.jpg"
        muted
        playsinline
        preload="auto"
        aria-hidden="true"
      ></video>
      <div class="film-scrim" aria-hidden="true"></div>

      <div class="hud" aria-hidden="true">
        <span class="hud-left">Jugador 1 · Expediente 01</span>
        <span class="hud-right">
          <span v-for="m in ['BESO', 'CITA', 'NOCHE']" :key="m" class="hud-meter">
            {{ m }}<i><b></b></i>
          </span>
        </span>
      </div>

      <!-- Tramo 1: la promesa y la accion -->
      <div class="stage stage-1">
        <p class="scene-eyebrow">El juego ya empezó</p>
        <h1 class="scene-title">Ella ya te dijo<br />la verdad.</h1>
        <p class="scene-copy">
          Tú no la leíste. Sube una captura del chat y en diez segundos tienes el
          subtexto, el arquetipo y exactamente qué responder.
        </p>

        <HeroDropzone
          :uploading="uploading"
          :is-drag-over="isDragOver"
          @upload="emit('upload')"
          @drop="emit('drop', $event)"
          @dragstate="emit('dragstate', $event)"
        />

        <p class="scene-trust">
          <BaseIcon name="privacy" color="sage" size="xs" />
          <span>Gratis la primera captura · privado · sin crear cuenta</span>
        </p>
      </div>

      <!-- Tramo 2: el problema en una frase -->
      <div class="stage stage-2 stage-mid">
        <p class="scene-eyebrow">Cada mensaje es una jugada</p>
        <h2 class="scene-title">Te está probando.<br />Y no lo ves.</h2>
      </div>

      <!-- Tramo 3: la resolucion -->
      <div class="stage stage-3 stage-mid">
        <p class="scene-eyebrow">Alfii la lee por ti</p>
        <h2 class="scene-title">La jugada correcta,<br />antes de responder.</h2>
        <ul class="spec-chips">
          <li v-for="s in SPECS" :key="s">{{ s }}</li>
        </ul>
      </div>

      <div class="start-cue" aria-hidden="true">
        <span class="sc-mouse"><i></i></span>
        <span class="sc-text">Haz scroll para iniciar la partida</span>
        <span class="sc-chevrons"><b>▾</b><b>▾</b></span>
      </div>

      <div class="film-progress" aria-hidden="true">
        <span class="film-progress-bar"></span>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
// Cuatro pantallas de recorrido = duracion de la pelicula bajo el dedo.
.film { position: relative; height: 420vh; }

.film-stage { position: sticky; top: 0; height: 100dvh; overflow: clip; display: flex; align-items: flex-end; }

// Respaldo DETRAS del video: si falla o no pinta, queda la portada, no negro.
.film-fallback, .film-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 42%; }

.film-scrim {
  position: absolute; inset: 0; pointer-events: none;
  background:
    linear-gradient(180deg, rgba($alfii-navy, 0.5) 0%, rgba($alfii-navy, 0.12) 38%, rgba($alfii-navy, 0.9) 90%),
    radial-gradient(110% 80% at 50% 45%, transparent 0%, rgba($alfii-navy, 0.4) 100%);
}

.stage {
  position: relative; z-index: 1; width: 100%; max-width: 1180px;
  margin: 0 auto; padding: clamp(80px, 14vh, 150px) clamp(20px, 5vw, 48px) clamp(44px, 8vh, 80px);
  @include stack(clamp(13px, 2vh, 20px));
}

// Los tramos 2 y 3 viven encima del 1, centrados en la pantalla.
.stage-mid {
  position: absolute; inset: 0; justify-content: center; padding-bottom: clamp(60px, 10vh, 110px); opacity: 0; pointer-events: none;
}

.scene-eyebrow {
  font-family: var(--font-editorial); font-size: $fs-2xs; font-weight: 600; letter-spacing: 0.22em;
  text-transform: uppercase; color: rgba($alfii-cream, 0.62);
}

.scene-title {
  font-family: var(--font-display); font-weight: 800;
  font-size: clamp(2.8rem, 10vw, 6rem); line-height: 0.98; letter-spacing: -0.03em; color: $alfii-cream;
  text-wrap: balance; text-shadow: 0 4px 34px rgba($alfii-navy, 0.7);
}

.scene-copy {
  font-family: var(--font-editorial); font-size: clamp(1.125rem, 1.9vw, 1.25rem);
  line-height: 1.6; color: rgba($alfii-cream, 0.84); max-width: 46ch;
}

.spec-chips {
  @include row(8px, center, flex-start);
  flex-wrap: wrap; list-style: none;

  li {
    padding: 7px 13px; border-radius: 999px; border: 1px solid rgba($alfii-cream, 0.28); font-family: var(--font-editorial);
    font-size: $fs-2xs; font-weight: 500; letter-spacing: 0.04em; color: rgba($alfii-cream, 0.85); backdrop-filter: blur(4px);
  }
}

:deep(.dropzone) { max-width: 560px; }

.scene-trust {
  @include row(8px, center, flex-start);
  font-family: var(--font-editorial); font-size: $fs-2xs; letter-spacing: 0.06em; color: rgba($alfii-cream, 0.6);
}

.start-cue {
  position: absolute; left: 50%; bottom: 22px; transform: translateX(-50%); z-index: 2;
  @include stack(7px, center);
  pointer-events: none;

  .sc-mouse {
    display: block; width: 22px; height: 34px; border-radius: 12px; border: 2px solid rgba($alfii-cream, 0.55);

    i {
      display: block; width: 3px; height: 7px; margin: 5px auto 0; border-radius: 2px;
      background-color: $alfii-red; box-shadow: 0 0 8px rgba($alfii-red, 0.8); animation: wheelDrop 1.8s ease-in-out infinite;
    }
  }

  .sc-text {
    font-family: var(--font-editorial); font-size: $fs-2xs; font-weight: 600;
    letter-spacing: 0.2em; text-transform: uppercase; color: rgba($alfii-cream, 0.75);
    text-shadow: 0 2px 12px rgba($alfii-navy, 0.9);
  }

  .sc-chevrons {
    @include stack(0, center);
    line-height: 0.55;

    b {
      font-weight: 400; font-size: 15px; color: rgba($alfii-red, 0.9); animation: chevPulse 1.8s ease-in-out infinite;

      &:last-child { animation-delay: 0.22s; opacity: 0.5; }
    }
  }
}

@keyframes wheelDrop { 0%, 100% { transform: translateY(0); opacity: 1; } 55% { transform: translateY(9px); opacity: 0.2; } }

@keyframes chevPulse { 0%, 100% { transform: translateY(0); opacity: 0.5; } 50% { transform: translateY(4px); opacity: 1; } }

.hud {
  position: absolute; top: max(14px, env(safe-area-inset-top)); left: 0; right: 0; z-index: 2;
  @include row(12px, center, space-between);
  padding: 0 clamp(16px, 4vw, 40px); pointer-events: none; font-family: var(--font-editorial);
  font-size: 12px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: rgba($alfii-cream, 0.55);

  .hud-right { @include row(10px, center); }

  .hud-meter {
    @include row(5px, center);

    i {
      display: inline-block; width: 34px; height: 5px;
      border-radius: 3px; background-color: rgba($alfii-cream, 0.12); overflow: hidden;

      b {
        display: block; height: 100%; width: 22%; background: linear-gradient(90deg, $alfii-red, #ff6b81);
        animation: hudPulse 3.2s ease-in-out infinite;
      }
    }

    &:nth-child(2) i b { width: 38%; animation-delay: 0.6s; }
    &:nth-child(3) i b { width: 12%; animation-delay: 1.1s; }
  }
}

@keyframes hudPulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.film-progress {
  position: absolute; left: 0; right: 0; bottom: 0; height: 3px; z-index: 2; background-color: rgba($alfii-cream, 0.08);

  .film-progress-bar {
    display: block; height: 100%; transform: scaleX(0); transform-origin: left center;
    background: linear-gradient(90deg, $alfii-red, rgba($alfii-sage, 0.9));
  }
}
</style>
