<script setup lang="ts">
/**
 * Expediente completo: los 6 bloques abiertos como una pieza propia.
 *
 * PORQUE no es una hoja mas: el analisis es el producto. Abrirlo en linea
 * rompia el pin de ScrollTrigger de la seccion de casos (la seccion crecia y el
 * pin terminaba donde no tocaba) y abrirlo como bottom sheet lo dejaba con
 * cara de dialogo de confirmacion.
 *
 * Aqui el panel NACE de la propia tarjeta de veredicto: Flip mide la tarjeta de
 * origen, coloca el panel encima de ella y anima la diferencia. El usuario ve
 * su veredicto convertirse en el expediente, no un panel que aparece de la nada.
 * Referencia: https://gsap.com/docs/v3/Plugins/Flip/static.fit()
 */
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import AnalysisCard from '@/components/shared/AnalysisCard.vue';
import DossierRail from '@/components/modals/DossierRail.vue';
import { gsap, ScrollTrigger, Flip } from '@/composables/useGsap';
import { archetypeByCode } from '@/config/homeArchetypes';

const props = defineProps<{
  analysis: any; // AnalysisPayload
  contact?: string;
  /** Nodo del que crece el expediente. Sin el, entrada simple por fundido. */
  origin?: HTMLElement | null;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const rootEl = ref<HTMLElement | null>(null);
const backdropEl = ref<HTMLElement | null>(null);
const panelEl = ref<HTMLElement | null>(null);
const sweepEl = ref<HTMLElement | null>(null);
const scrollEl = ref<HTMLElement | null>(null);
const barEl = ref<HTMLElement | null>(null);

/** Los seis bloques, en el mismo orden en que los pinta AnalysisCard. */
const RAIL = ['Subtexto', 'Arquetipo', 'Red flags', 'Timing', 'Scripts', 'Medidores'];

// La rival del expediente: retrato y ficha del plantel, si el arquetipo existe.
const rival = archetypeByCode(String(props.analysis?.archetypeDiagnosis?.primary ?? ''));
const confidence = Math.round((props.analysis?.archetypeDiagnosis?.confidence ?? 0) * 100);

const activeBlock = ref(0);
const closing = ref(false);

const motionOk =
  typeof window !== 'undefined' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let ctx: gsap.Context | null = null;
const triggers: ScrollTrigger[] = [];

function sections(): HTMLElement[] {
  return Array.from(panelEl.value?.querySelectorAll('.block-section') ?? []) as HTMLElement[];
}

/**
 * Barra de avance y rail activo, sobre el scroll INTERNO del panel.
 *
 * ScrollTrigger acepta cualquier contenedor como `scroller`, asi que el mismo
 * mecanismo de la pagina sirve dentro del expediente. Se montan al terminar la
 * entrada: mientras Flip mueve el panel, las medidas todavia no son las buenas.
 */
function wireScroll() {
  const scroller = scrollEl.value;
  const card = panelEl.value?.querySelector('.analysis-card');
  if (!scroller || !card) return;

  triggers.push(
    ScrollTrigger.create({
      scroller,
      trigger: card,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => gsap.set(barEl.value, { scaleX: self.progress }),
    })
  );

  sections().forEach((section, i) => {
    triggers.push(
      ScrollTrigger.create({
        scroller,
        trigger: section,
        start: 'top 45%',
        end: 'bottom 45%',
        onToggle: (self) => {
          if (self.isActive) activeBlock.value = i;
        },
      })
    );
  });
}

function buildIntro() {
  const panel = panelEl.value;
  const backdrop = backdropEl.value;
  if (!panel || !backdrop) return;

  const blocks = panel.querySelectorAll('.analysis-card > *');
  const railItems = panel.querySelectorAll('.rail-item');

  const tl = gsap.timeline({ onComplete: wireScroll });

  tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0);

  if (motionOk && props.origin) {
    // 1. El panel se coloca exactamente sobre la tarjeta de origen.
    Flip.fit(panel, props.origin, { scale: true });
    const from = Flip.getState(panel);
    // 2. Vuelve a su sitio real y Flip anima esa diferencia: el morph.
    gsap.set(panel, { clearProps: 'transform' });
    tl.add(Flip.from(from, { duration: 0.8, ease: 'power3.inOut', scale: true }), 0);
    tl.fromTo(panel, { opacity: 0.35 }, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0);
  } else {
    tl.fromTo(
      panel,
      { opacity: 0, y: 30, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' },
      0
    );
  }

  if (motionOk) {
    // Barrido de escaner: dura lo que el morph y firma el momento "analizando".
    tl.fromTo(
      sweepEl.value,
      { yPercent: -130, opacity: 0 },
      { yPercent: 130, opacity: 1, duration: 0.75, ease: 'none' },
      0.2
    ).to(sweepEl.value, { opacity: 0, duration: 0.3, ease: 'power2.out' }, 0.85);
  }

  // Los bloques entran escalonados: seis pantallas de golpe no se leen.
  tl.from(
    blocks,
    {
      y: 32,
      opacity: 0,
      filter: 'blur(8px)',
      duration: 0.55,
      stagger: 0.06,
      ease: 'power3.out',
      clearProps: 'filter',
    },
    0.4
  ).from(
    railItems,
    { x: -14, opacity: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' },
    0.5
  );
}

function goTo(i: number) {
  const target = sections()[i];
  if (!target || !scrollEl.value) return;
  gsap.to(scrollEl.value, {
    duration: 0.6,
    ease: 'power2.inOut',
    scrollTo: { y: target, offsetY: 12 },
  });
}

/** El cierre deshace el morph: el expediente vuelve a ser la tarjeta. */
function close() {
  if (closing.value) return;
  closing.value = true;

  triggers.forEach((t) => t.kill());
  triggers.length = 0;

  const panel = panelEl.value;
  const tl = gsap.timeline({ onComplete: () => emit('close') });

  if (panel && motionOk && props.origin) {
    tl.to(
      panel.querySelectorAll('.analysis-card > *'),
      { opacity: 0, y: -12, duration: 0.2, stagger: 0.015, ease: 'power2.in' },
      0
    );
    tl.add(
      Flip.fit(panel, props.origin, {
        scale: true,
        duration: 0.5,
        ease: 'power3.inOut',
      }) as gsap.core.Tween,
      0.1
    );
    tl.to(panel, { opacity: 0, duration: 0.3, ease: 'power2.in' }, 0.3);
  } else if (panel) {
    tl.to(panel, { opacity: 0, y: 18, duration: 0.25, ease: 'power2.in' }, 0);
  }

  tl.to(backdropEl.value, { opacity: 0, duration: 0.35, ease: 'power2.in' }, 0.15);
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
}

onMounted(async () => {
  await nextTick();
  window.addEventListener('keydown', onKey);
  ctx = gsap.context(buildIntro, rootEl.value ?? undefined);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  triggers.forEach((t) => t.kill());
  ctx?.revert();
});
</script>

<template>
  <Teleport to="body">
    <div ref="rootEl" class="dossier" role="dialog" aria-modal="true" aria-label="Análisis completo">
      <div ref="backdropEl" class="dossier-backdrop" @click="close"></div>

      <div ref="panelEl" class="dossier-panel">
        <div ref="sweepEl" class="dossier-sweep"></div>

        <header class="dossier-head">
          <img
            v-if="rival"
            class="head-portrait"
            :src="`/home/arch-${rival.key}.jpg`"
            alt=""
            aria-hidden="true"
          />
          <div class="head-text">
            <span class="head-tag">
              <BaseIcon name="subtext" color="red" size="xs" />
              Expediente completo
            </span>
            <h3>{{ contact || 'Análisis' }}</h3>
            <span v-if="rival" class="head-rival">
              Rival: <strong>{{ rival.name }}</strong>
              <i v-for="n in rival.stars" :key="n">◆</i>
              <em v-if="confidence">{{ confidence }}% confianza</em>
            </span>
          </div>
          <button class="head-close" @click="close" aria-label="Cerrar">
            <BaseIcon name="close" color="cream" size="sm" />
          </button>
          <div class="head-bar"><span ref="barEl"></span></div>
        </header>

        <div class="dossier-body">
          <DossierRail :items="RAIL" :active="activeBlock" @select="goTo" />

          <div ref="scrollEl" class="dossier-scroll">
            <AnalysisCard :analysis="analysis" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.dossier {
  position: fixed; inset: 0;
  z-index: 140;
  @include center;
  padding: clamp(12px, 3vw, 40px);
}

.dossier-backdrop {
  position: absolute; inset: 0;
  background:
    radial-gradient(60% 50% at 50% 20%, rgba($alfii-red, 0.18), transparent 70%),
    rgba($alfii-navy, 0.86);
  backdrop-filter: blur(10px);
}

.dossier-panel {
  position: relative; width: min(1040px, 100%);
  height: min(88dvh, 900px); display: flex;
  flex-direction: column; overflow: hidden;
  border-radius: 22px; border: 1px solid rgba($alfii-cream, 0.14);
  background:
    linear-gradient(180deg, rgba($alfii-plum, 0.98), rgba($alfii-navy, 0.99));
  box-shadow:
    0 40px 120px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba($alfii-red, 0.08) inset;
  transform-origin: center center; will-change: transform;
}

// Barrido de escaner sobre todo el panel. Decorativo: nunca captura clicks.
.dossier-sweep {
  position: absolute; inset-inline: 0;
  top: 0; height: 46%;
  pointer-events: none; z-index: 3;
  background: linear-gradient(
    180deg,
    transparent,
    rgba($alfii-red, 0.14) 45%,
    rgba($alfii-cream, 0.1) 55%,
    transparent
  );
}

.dossier-head {
  position: relative;
  @include row(14px, center, space-between);
  padding: 16px 22px 14px; border-bottom: 1px solid rgba($alfii-red, 0.25);
  flex: 0 0 auto;
  // Banda de cabecera con la firma carmesi del expediente.
  background: linear-gradient(90deg, rgba($alfii-red, 0.14), transparent 55%);

  .head-portrait {
    flex: 0 0 48px; width: 48px; height: 58px;
    border-radius: 10px; object-fit: cover; object-position: center 16%;
    border: 1px solid rgba($alfii-red, 0.5); box-shadow: 0 0 18px rgba($alfii-red, 0.25);
  }

  .head-rival {
    @include row(5px, center);
    font-family: var(--font-editorial); font-size: 12px; letter-spacing: 0.08em;
    color: rgba($alfii-cream, 0.55);

    strong { color: rgba($alfii-cream, 0.85); font-weight: 700; }
    i { font-style: normal; font-size: 8px; color: rgba($alfii-red, 0.85); }
    em {
      font-style: normal; margin-left: 6px; padding: 2px 7px;
      border-radius: 7px; border: 1px solid rgba($alfii-sage, 0.4);
      color: $alfii-sage; letter-spacing: 0.06em;
    }
  }

  .head-text { @include stack(3px); flex: 1 1 auto; min-width: 0; }

  .head-tag {
    @include row(6px, center);
    font-size: $fs-2xs; font-weight: $fw-bold;
    letter-spacing: 0.14em; text-transform: uppercase;
    color: rgba($alfii-red, 0.9);
  }

  h3 {
    font-family: var(--font-display); font-size: clamp(1.4rem, 2.6vw, 1.9rem);
    font-weight: 800; letter-spacing: -0.02em;
    color: $alfii-cream;
  }

  .head-close {
    padding: 8px; border-radius: 50%;
    border: 1px solid rgba($alfii-cream, 0.12); transition: background-color $dur-fast $ease-out;
    &:hover { background-color: rgba($alfii-cream, 0.08); }
  }

  .head-bar {
    position: absolute; left: 0;
    right: 0; bottom: -1px;
    height: 2px; background-color: rgba($alfii-cream, 0.06);

    span {
      display: block; height: 100%;
      transform: scaleX(0); transform-origin: left center;
      background: linear-gradient(90deg, $alfii-red, $alfii-sage);
    }
  }
}

// Movil: rail arriba en horizontal y contenido debajo. A partir de 900px el
// rail pasa a columna lateral y el expediente se lee como un documento.
.dossier-body {
  flex: 1 1 auto; min-height: 0;
  display: grid; grid-template-rows: auto 1fr;

  @media (min-width: 900px) {
    grid-template-rows: none; grid-template-columns: 190px 1fr;
  }
}

.dossier-scroll {
  min-height: 0; padding: 16px;
  @include scroll-y;
  -webkit-overflow-scrolling: touch;

  @media (min-width: 900px) {
    padding: 22px;
  }
}
</style>
