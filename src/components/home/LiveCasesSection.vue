<script setup lang="ts">
/** Prueba viva: tres casos reales recorridos con el scroll. */
import { ref, computed, nextTick } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import ChatPhone from '@/components/home/ChatPhone.vue';
import VerdictCard from '@/components/home/VerdictCard.vue';
import CaseSelector from '@/components/home/CaseSelector.vue';
import SectionShell from '@/components/home/SectionShell.vue';
import { liveCases } from '@/config/homeContent';
import { archetypeByCode } from '@/config/homeArchetypes';
import { useGsapContext, gsap, MOTION_OK } from '@/composables/useGsap';

const emit = defineEmits<{
  (e: 'copy', script: string): void;
  (e: 'expand', payload: { index: number; origin: HTMLElement | null }): void;
  (e: 'cta'): void;
}>();

const rootEl = ref<HTMLElement | null>(null);
const verdictRef = ref<InstanceType<typeof VerdictCard> | null>(null);

const activeIndex = ref(0);
const currentCase = computed(() => liveCases[activeIndex.value] || liveCases[0]!);
/** */
const currentRival = computed(() => archetypeByCode(currentCase.value.verdict.archetype));

const motionOk =
  typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;


function selectCase(idx: number) {
  if (idx === activeIndex.value) return;
  activeIndex.value = idx;
  animateSwap();
}

/** Relevo entre casos: Vue remonta las burbujas (van con :key por caso), pero */
function animateSwap() {
  if (!motionOk) return;
  void nextTick(() => {
    const root = rootEl.value;
    if (!root) return;

    // El arquetipo se descifra en vez de cambiar de golpe: es literalmente lo
    const archetype = root.querySelector('.v-stat strong');
    if (archetype) {
      gsap.to(archetype, {
        duration: 0.9,
        scrambleText: {
          text: currentCase.value.verdict.archetype,
          chars: 'upperCase',
          speed: 0.5,
        },
      });
    }
    const bubbles = root.querySelectorAll('.wa-bubble');
    if (bubbles.length) {
      gsap.fromTo(
        bubbles,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.42, stagger: 0.07, ease: 'power2.out', overwrite: true }
      );
    }
    const verdict = root.querySelector('.verdict-card');
    if (verdict) {
      gsap.fromTo(
        verdict,
        { opacity: 0, x: 22 },
        { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out', overwrite: true }
      );
    }
  });
}

useGsapContext(({ mm }) => {
  // El caso lo elige SOLO el usuario tocando su carta: sin carrusel por
  // scroll ni swipe que roben la seleccion. El scroll solo revela.
  mm.add(MOTION_OK, () => {

    /** El telefono se endereza CON el scroll, no de una vez. */
    const phone = gsap.fromTo(
      '.phone',
      { rotateX: 14, y: 50, opacity: 0.2, transformPerspective: 900 },
      {
        rotateX: 0,
        y: 0,
        opacity: 1,
        ease: 'none',
        scrollTrigger: { trigger: '.chat-col', start: 'top 92%', end: 'top 42%', scrub: 0.5 },
      }
    );

    // Las burbujas del chat llegan una a una segun bajas: el hilo se escribe
    const bubbles = gsap.fromTo(
      '.phone .wa-bubble',
      { opacity: 0, y: 18 },
      {
        opacity: 1,
        y: 0,
        ease: 'none',
        stagger: 0.25,
        scrollTrigger: { trigger: '.phone', start: 'top 88%', end: 'bottom 50%', scrub: 0.6 },
      }
    );
    const verdict = gsap.fromTo(
      '.verdict-card',
      { opacity: 0, y: 60 },
      {
        opacity: 1,
        y: 0,
        ease: 'none',
        scrollTrigger: { trigger: '.verdict-col', start: 'top 96%', end: 'top 55%', scrub: 0.5 },
      }
    );
    return () => {
      [phone, bubbles, verdict].forEach((t) => {
        t.scrollTrigger?.kill();
        t.kill();
      });
    };
  });
}, rootEl);
</script>

<template>
  <div ref="rootEl" class="live-wrap">
    <SectionShell
      eyebrow="Gameplay real · Sin subir nada todavía"
      eyebrow-icon="bolt"
      title="Elige tu partida y mira la jugada"
      subtitle="Análisis reales de Alfii. Toca una situación y mira el veredicto, jugada a jugada."
    >
      <CaseSelector :cases="liveCases" :active="activeIndex" @select="selectCase" />
      <div class="live-layout">
        <div class="chat-col">
          <ChatPhone :live-case="currentCase" :case-index="activeIndex" />
        </div>

        <div class="verdict-col">
          <div v-if="currentRival" class="rival-banner" :key="currentRival.key">
            <img :src="`/home/arch-${currentRival.key}.jpg`" alt="" loading="lazy" />
            <div class="rb-text">
              <span class="rb-label">Estás jugando contra</span>
              <strong>{{ currentRival.name }}
                <i v-for="n in currentRival.stars" :key="n">◆</i>
              </strong>
              <em>{{ currentRival.tag }}</em>
            </div>
          </div>

          <VerdictCard
            ref="verdictRef"
            :live-case="currentCase"
            @copy="emit('copy', currentCase.verdict.script)"
            @expand="emit('expand', { index: activeIndex, origin: verdictRef?.cardEl ?? null })"
          />
        </div>
      </div>
      <button class="section-cta" @click="emit('cta')">
        <BaseIcon name="upload" color="cream" size="xs" />
        <span>Ahora hazlo con tu chat real</span>
      </button>
    </SectionShell>
  </div>
</template>

<style lang="scss" scoped>
// Tipografia editorial del recorrido.
:deep(.section-head h2) { font-family: var(--font-display); font-weight: 800; font-size: clamp(2.1rem, 6.4vw, 4rem); letter-spacing: -0.03em; line-height: 1.02; }
:deep(.eyebrow) { font-family: var(--font-editorial); letter-spacing: 0.22em; text-transform: uppercase; }

.live-wrap {
  // Atmosfera de arena: foco carmesi de ella, salvia de Alfii.
  background:
    radial-gradient(52% 40% at 18% 25%, rgba($alfii-red, 0.08) 0%, transparent 70%),
    radial-gradient(50% 42% at 84% 70%, rgba($alfii-sage, 0.06) 0%, transparent 70%),
    rgba($alfii-plum, 0.28);
  border-top: 1px solid rgba($alfii-cream, 0.08); border-bottom: 1px solid rgba($alfii-cream, 0.08);

  // Donde la seccion se clava tiene que caber ENTERA en la pantalla, o su
  // ultima fila (el boton del expediente) queda inalcanzable. Aqui se le baja
  // el aire para que quepa; el resto de secciones conserva el suyo.
  @media (min-width: 1024px) and (min-height: 820px) {
    :deep(.section-inner) {
      padding-top: clamp(28px, 4vh, 48px); padding-bottom: clamp(28px, 4vh, 48px);
      gap: clamp(16px, 2.4vh, 26px);
    }

    :deep(.section-head) { gap: 8px; }

    :deep(.section-head h2) { font-size: clamp(1.6rem, 2.6vw, 2.1rem); }
  }
}

.live-layout {
  display: flex; flex-direction: column; gap: clamp(20px, 3vw, 34px);

  @media (min-width: 1024px) { flex-direction: row; align-items: flex-start; gap: clamp(28px, 3vw, 44px); }
}

.chat-col {
  @include center;
  width: 100%;

  @media (min-width: 1024px) { flex: 0 0 340px; align-self: flex-start; }
}

.verdict-col {
  flex: 1; width: 100%;
  @include stack(16px);
}

.rival-banner {
  @include row(14px, center);
  padding: 10px 14px; border-radius: 14px;
  background: linear-gradient(90deg, rgba($alfii-red, 0.14), rgba($alfii-navy, 0.6) 75%);
  border: 1px solid rgba($alfii-red, 0.4); animation: fadeInUp $dur-base $ease-out both;

  img {
    flex: 0 0 52px; width: 52px; height: 62px;
    border-radius: 10px; object-fit: cover; object-position: center 16%;
    border: 1px solid rgba($alfii-cream, 0.2);
  }

  .rb-text { @include stack(2px); min-width: 0; }

  .rb-label {
    font-family: var(--font-editorial); font-size: 12px; font-weight: 600;
    letter-spacing: 0.18em; text-transform: uppercase; color: rgba($alfii-cream, 0.5);
  }

  strong {
    @include row(6px, center);
    font-family: var(--font-display); font-weight: 800; font-size: $fs-md; color: $alfii-cream;

    i { font-style: normal; font-size: 8px; color: rgba($alfii-red, 0.85); }
  }

  em {
    font-style: normal; font-family: var(--font-editorial);
    font-size: $fs-2xs; color: rgba($alfii-cream, 0.6);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
}

.section-cta {
  @include row(10px, center, center);
  align-self: center; padding: 15px 28px; border-radius: 13px; font-size: $fs-sm;
  font-weight: $fw-bold; background-color: $alfii-red;
  color: $alfii-cream; box-shadow: 0 8px 24px rgba($alfii-red, 0.4);
}
</style>
