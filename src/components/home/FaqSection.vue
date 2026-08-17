<script setup lang="ts">
/**
 * Objeciones. Acordeon con la primera abierta: una lista cerrada del todo
 * parece un pie de pagina legal y nadie la toca.
 *
 * El despliegue lo lleva GSAP desde los hooks de <Transition> con height:'auto'
 * medido en el momento. Con v-if a secas la respuesta aparecia de golpe y el
 * acordeon daba un salto en vez de abrirse.
 */
import { ref } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import SectionShell from '@/components/home/SectionShell.vue';
import { faqs } from '@/config/homeContent';
import { useGsapContext, gsap, revealBatch, MOTION_OK } from '@/composables/useGsap';

const rootEl = ref<HTMLElement | null>(null);
const openFaq = ref<number | null>(0);

function toggle(idx: number) {
  openFaq.value = openFaq.value === idx ? null : idx;
}

function onEnter(el: Element, done: () => void) {
  gsap.set(el, { height: 0, opacity: 0, overflow: 'hidden' });
  gsap.to(el, {
    height: 'auto',
    opacity: 1,
    duration: 0.42,
    ease: 'power3.out',
    onComplete: () => {
      gsap.set(el, { clearProps: 'height,overflow' });
      done();
    },
  });
}

function onLeave(el: Element, done: () => void) {
  gsap.set(el, { overflow: 'hidden' });
  gsap.to(el, { height: 0, opacity: 0, duration: 0.26, ease: 'power2.in', onComplete: done });
}

useGsapContext(({ mm }) => {
  mm.add(MOTION_OK, () => {
    revealBatch('.faq-item', { y: 26, stagger: 0.06, start: 'top 94%' });
  });
}, rootEl);
</script>

<template>
  <div ref="rootEl" class="faq-wrap">
    <SectionShell
      eyebrow="Lo que todo el mundo pregunta antes de subir la primera"
      eyebrow-icon="info"
      eyebrow-color="sage"
      title="Dudas razonables"
    >
      <div class="faq-list">
        <article v-for="(f, i) in faqs" :key="f.q" class="faq-item" :class="{ open: openFaq === i }">
          <button class="faq-q" @click="toggle(i)">
            <span>{{ f.q }}</span>
            <BaseIcon :name="openFaq === i ? 'close' : 'expand'" color="cream" size="xs" />
          </button>

          <Transition :css="false" @enter="onEnter" @leave="onLeave">
            <p v-if="openFaq === i" class="faq-a">{{ f.a }}</p>
          </Transition>
        </article>
      </div>
    </SectionShell>
  </div>
</template>

<style lang="scss" scoped>
// Tipografia editorial del recorrido: titular display + eyebrow espaciado.
:deep(.section-head h2) {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(2.1rem, 6.4vw, 4rem);
  letter-spacing: -0.03em;
  line-height: 1.02;
}
:deep(.eyebrow) {
  font-family: var(--font-editorial);
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.faq-wrap {
  background-color: rgba($alfii-plum, 0.2);
  border-top: 1px solid rgba($alfii-cream, 0.08);
}

.faq-list {
  @include stack(9px);
  max-width: 760px;
  width: 100%;
  margin: 0 auto;
}

.faq-item {
  border-radius: 14px;
  overflow: hidden;
  background-color: rgba($alfii-navy, 0.55);
  border: 1px solid rgba($alfii-cream, 0.09);
  transition: border-color $dur-fast $ease-out, background-color $dur-fast $ease-out;

  &:hover { border-color: rgba($alfii-cream, 0.2); }

  &.open {
    border-color: rgba($alfii-red, 0.4);
    background-color: rgba($alfii-plum, 0.55);
  }

  .faq-q {
    @include row(14px, center, space-between);
    width: 100%;
    padding: clamp(16px, 2.2vw, 22px) clamp(18px, 2.4vw, 26px);
    text-align: left;
    font-size: clamp(1.0625rem, 1.6vw, 1.1875rem);
    line-height: 1.45;
    font-weight: $fw-bold;
    color: $alfii-cream;
  }

  .faq-a {
    padding: 0 clamp(18px, 2.4vw, 26px) clamp(18px, 2.4vw, 24px);
    font-size: clamp(1rem, 1.4vw, 1.0625rem);
    line-height: 1.8;
    color: rgba($alfii-cream, 0.72);
  }
}
</style>
