<script setup lang="ts">
/**
 * Envoltorio comun de las secciones del home.
 *
 * PORQUE existe: las ocho secciones repetian el mismo bloque de cabecera, el
 * mismo ancho maximo y la misma entrada. Centralizarlo deja cada seccion
 * ocupandose solo de lo suyo y hace que el ritmo de la pagina sea identico en
 * todas: mismo aire, misma revelacion, mismo idioma.
 *
 * El titular entra por palabras con mascara de linea (SplitText). Se revierte
 * al desmontar o el DOM se queda partido en divs.
 */
import { ref } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import type { IconName } from '@/config/icons';
import { useGsapContext, gsap, headingReveal, MOTION_OK, type SplitText } from '@/composables/useGsap';

defineProps<{
  eyebrow?: string;
  eyebrowIcon?: IconName;
  eyebrowColor?: 'red' | 'sage' | 'cream';
  title?: string;
  subtitle?: string;
}>();

const rootEl = ref<HTMLElement | null>(null);
const headEl = ref<HTMLElement | null>(null);

useGsapContext(({ mm }) => {
  mm.add(MOTION_OK, () => {
    const splits: SplitText[] = [];
    const head = headEl.value;
    if (!head) return;

    const s = headingReveal(head.querySelector('h2'));
    if (s) splits.push(s);

    // El resto de la cabecera llega detras del titular, no a la vez: primero
    // se lee la promesa y despues el matiz.
    const rest = head.querySelectorAll('.eyebrow, .section-sub');
    if (rest.length) {
      gsap.from(rest, {
        y: 20,
        opacity: 0,
        duration: 0.6,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: head, start: 'top 90%', once: true },
      });
    }

    return () => splits.forEach((sp) => sp.revert());
  });
}, rootEl);
</script>

<template>
  <section ref="rootEl" class="home-section">
    <div class="section-inner">
      <div v-if="title || eyebrow" ref="headEl" class="section-head">
        <span v-if="eyebrow" class="eyebrow">
          <BaseIcon v-if="eyebrowIcon" :name="eyebrowIcon" :color="eyebrowColor || 'red'" size="xs" />
          <!-- El texto envuelto en su propio span: como nodo suelto, cuando el
               eyebrow ocupa dos lineas el icono se descuelga del renglon. -->
          <span class="eyebrow-text">{{ eyebrow }}</span>
        </span>
        <h2 v-if="title">{{ title }}</h2>
        <p v-if="subtitle" class="section-sub">{{ subtitle }}</p>
      </div>

      <slot />
    </div>

    <!--
      Ranura a sangre: lo que va aqui ocupa el ancho completo de la pantalla,
      sin el margen del contenido. Es donde viven los carriles horizontales, que
      necesitan toda la ventana para que las piezas puedan ser grandes.
    -->
    <div v-if="$slots.bleed" class="section-bleed">
      <slot name="bleed" />
    </div>

    <div v-if="$slots.foot" class="section-inner section-foot">
      <slot name="foot" />
    </div>
  </section>
</template>

<style lang="scss" scoped>
// Ritmo de la pagina. El aire es parte del mensaje: un bloque apretado se lee
// como folleto, y aqui se esta pidiendo confianza para subir una conversacion
// privada. Los numeros suben con la pantalla, no de golpe en un breakpoint.
.section-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(44px, 8vw, 104px) clamp(20px, 5vw, 40px);
  @include stack(clamp(22px, 3.4vw, 44px));
}

// Cuando hay ranura a sangre, la cabecera cede su aire de abajo al carril.
.home-section:has(.section-bleed) .section-inner:not(.section-foot) {
  padding-bottom: clamp(24px, 3vw, 40px);
}

.section-bleed {
  width: 100%;
}

// El pie del carril va pegado a el: su aire de arriba ya lo pone el carril, y
// el de abajo lo cierra la seccion. Con el padding completo quedaban dos
// pantallas de vacio entre una seccion y la siguiente.
.section-foot {
  padding-top: clamp(14px, 2vw, 24px);
  padding-bottom: clamp(36px, 6vw, 88px);
}

/**
 * Cabecera de seccion.
 *
 * EN MOVIL VA A LA IZQUIERDA. Centrado, un titular de tres lineas y un parrafo
 * de cuatro forman un bloque simetrico que se lee como plantilla y obliga al
 * ojo a buscar el principio de cada linea. Alineado, hay un solo margen de
 * lectura y la pagina parece escrita, no maquetada. Centrado solo a partir de
 * 768px, donde las lineas son cortas y el centro si ordena.
 */
.section-head {
  @include stack(clamp(12px, 1.8vw, 18px));
  text-align: left;
  max-width: 680px;

  @media (min-width: 768px) {
    align-items: center;
    text-align: center;
    margin: 0 auto;
  }

  // En bloque y con el icono en linea, no en flex: cuando el texto ocupa dos
  // renglones, un icono flex se descuelga solo a la izquierda y parece un
  // error de maquetacion. Asi el icono viaja con la primera palabra.
  // Etiqueta con guion delante: marca el arranque de la seccion como un
  // epigrafe de revista, en vez de flotar centrada sobre el titular.
  .eyebrow {
    display: block;
    max-width: 460px;
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.1em;
    line-height: 1.7;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.55);

    &::before {
      content: '';
      display: inline-block;
      width: 22px;
      height: 1px;
      margin-right: 10px;
      vertical-align: 4px;
      background-color: rgba($alfii-red, 0.8);
    }

    // En movil manda el guion: guion e icono juntos se amontonan delante de la
    // primera palabra y parecen basura tipografica. BaseIcon pinta un <i>.
    :deep(i) {
      display: none;
      vertical-align: -2px;
      margin-right: 7px;
    }

    @media (min-width: 768px) {
      max-width: none;
      margin: 0 auto;
      letter-spacing: 0.14em;

      &::before { display: none; }
      :deep(i) { display: inline-block; }
    }
  }

  h2 {
    font-size: clamp(1.7rem, 7.4vw, 2.9rem);
    font-weight: $fw-extrabold;
    // Mas apretado en movil: con 1.14 las tres lineas de un titular se
    // separaban tanto que dejaban de leerse como una sola frase.
    line-height: 1.08;
    letter-spacing: -0.03em;
    text-wrap: balance;

    @media (min-width: 768px) {
      line-height: 1.14;
    }
  }

  .section-sub {
    font-size: clamp(1.0625rem, 1.6vw, 1.1875rem);
    line-height: 1.65;
    // 38 caracteres por linea: el ancho que se lee de una pasada en un movil.
    max-width: 38ch;
    color: rgba($alfii-cream, 0.66);
    text-wrap: pretty;

    @media (min-width: 768px) {
      max-width: none;
      line-height: 1.75;
    }
  }
}

// SplitText crea estas lineas en runtime: sin :deep() el scoped CSS no las
// alcanza y la mascara del titular no existe.
:deep(.split-line) {
  overflow: hidden;
  padding-bottom: 0.12em;
}
</style>
