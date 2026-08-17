<script setup lang="ts">
/**
 * Campo de señal del hero: cinco trazos que convergen en el centro.
 *
 * COMO se dibuja sin plugins de pago ni medir nada: cada <path> declara
 * pathLength="1", asi que su longitud vale 1 pase lo que pase con el viewBox.
 * Con dasharray 1 y dashoffset de 1 a 0 el trazo se pinta solo, y se comporta
 * igual en un movil de 360px que en un monitor de 27". Es la mecanica del
 * efecto de trazos de Gemini, traida a GSAP.
 *
 * El componente se anima solo: recibe el nodo del hero como disparador y monta
 * ahi su propio ScrollTrigger.
 */
import { ref } from 'vue';
import { useGsapContext, gsap, MOTION_OK } from '@/composables/useGsap';

const rootEl = ref<HTMLElement | null>(null);

/**
 * Longitud declarada de cada trazo, en unidades propias.
 *
 * PORQUE 1000 y no 1: con pathLength="1" el dibujo se anima entre 0.94px y 0px,
 * y los navegadores redondean esas longitudes al serializarlas. En movil el
 * trazo pasaba de invisible a completo de golpe: el efecto no existia. Con mil
 * unidades no hay subpixeles que redondear y el dibujo es fluido en todas
 * partes.
 */
const DRAW = 1000;

/** Cinco trazos que entran por la izquierda y se juntan en el centro-bajo. */
const PATHS = [
  { d: 'M-20 120 C 220 120 300 250 520 262 S 820 250 1220 190', color: '#d7022c', width: 2 },
  { d: 'M-20 210 C 240 210 320 262 540 268 S 860 258 1220 232', color: '#fbf0cc', width: 1.4 },
  { d: 'M-20 300 C 260 300 340 276 560 272 S 900 276 1220 300', color: '#629678', width: 1.6 },
  { d: 'M-20 390 C 240 390 330 300 560 282 S 880 300 1220 372', color: '#ff6b81', width: 1.4 },
  { d: 'M-20 470 C 200 470 300 320 540 288 S 860 320 1220 452', color: '#8fb3a0', width: 1.2 },
];

/**
 * Pulsos que recorren los trazos.
 *
 * MotionPathPlugin mueve un nodo POR la curva, no en linea recta: es la señal
 * viajando de la conversacion al veredicto. Tres pulsos desfasados bastan; seis
 * ya seria un salvapantallas.
 * https://gsap.com/docs/v3/Plugins/MotionPathPlugin
 */
function pulses(root: HTMLElement) {
  const dots = root.querySelectorAll<SVGCircleElement>('.signal-pulse');

  dots.forEach((dot, i) => {
    gsap.set(dot, { opacity: 0 });
    gsap.to(dot, {
      motionPath: { path: PATHS[i * 2]?.d ?? PATHS[0]!.d },
      duration: 6 + i * 1.4,
      ease: 'none',
      repeat: -1,
      delay: i * 2.1,
    });
    gsap.to(dot, {
      opacity: 0.55,
      duration: 1.2,
      delay: i * 2.1,
      repeat: -1,
      repeatDelay: (6 + i * 1.4) - 2.4,
      yoyo: true,
    });
  });
}

function build(trigger: HTMLElement) {
  const strokes = rootEl.value?.querySelectorAll<SVGPathElement>('.signal-live');
  if (!strokes?.length) return;

  if (rootEl.value) pulses(rootEl.value);

  // La entrada anima la OPACIDAD, nunca el trazo.
  //
  // Antes habia dos tweens sobre strokeDashoffset a la vez —uno de entrada y
  // otro con scrub— y se pisaban: el segundo registraba mal su valor de
  // partida y el trazo saltaba de invisible a completo sin dibujar nada.
  gsap.fromTo(rootEl.value, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' });

  // scrub, no once: el trazo avanza y retrocede con el dedo. Eso es lo que lo
  // hace sentir vivo en movil, donde no hay puntero que seguir.
  // fromTo y no to: con `to`, GSAP registra como punto de partida el valor que
  // encuentre en el primer render, que con un scrub puede ser cualquiera. Aqui
  // el punto de partida es explicito y el dibujo es siempre el mismo.
  //
  // El recorrido se alarga mas alla del hero (+80% de pantalla) para que el
  // trazo siga creciendo cuando ya estas entrando en la siguiente seccion.
  gsap.fromTo(
    strokes,
    { strokeDashoffset: DRAW * 0.94 },
    {
      strokeDashoffset: 0,
      ease: 'none',
      stagger: 0.04,
      scrollTrigger: {
        trigger,
        start: 'top top',
        end: () => `bottom+=${window.innerHeight * 0.8} top`,
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    }
  );

  gsap.to(rootEl.value, {
    yPercent: 16,
    opacity: 0.35,
    ease: 'none',
    scrollTrigger: { trigger, start: 'top top', end: 'bottom top', scrub: 0.5 },
  });
}

useGsapContext(({ mm }) => {
  mm.add(MOTION_OK, () => {
    // El disparador es la seccion que lo contiene. Se busca por el DOM y no por
    // una prop: los hijos montan ANTES que el padre, asi que un ref del padre
    // pasado por prop todavia valdria null en este punto.
    const trigger = rootEl.value?.closest('section');
    if (trigger instanceof HTMLElement) build(trigger);
  });
}, rootEl);
</script>

<template>
  <div ref="rootEl" class="signal-field" aria-hidden="true">
    <svg class="signal-svg" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id="signalBlur"><feGaussianBlur in="SourceGraphic" stdDeviation="7" /></filter>
      </defs>

      <g filter="url(#signalBlur)" opacity="0.45">
        <path
          v-for="p in PATHS"
          :key="`ghost-${p.d}`"
          :d="p.d"
          :stroke="p.color"
          :stroke-width="p.width * 2"
          fill="none"
        />
      </g>

      <path
        v-for="p in PATHS"
        :key="p.d"
        class="signal-live"
        :d="p.d"
        :stroke="p.color"
        :stroke-width="p.width"
        fill="none"
        :pathLength="DRAW"
      />

      <!-- Pulsos que viajan por la curva (MotionPath). -->
      <circle v-for="n in 3" :key="`pulse-${n}`" class="signal-pulse" r="3.5" />
    </svg>
  </div>
</template>

<style lang="scss" scoped>
.signal-field {
  position: absolute;
  inset: -6% -10% 0;
  z-index: 0;
  pointer-events: none;
  // La mascara evita que los trazos lleguen a los bordes y compitan con el
  // texto: la señal se insinua, no decora.
  mask-image: radial-gradient(120% 85% at 50% 42%, #000 42%, transparent 78%);

  .signal-svg {
    width: 100%;
    height: 100%;
    opacity: 0.75;
  }

  // dasharray = pathLength declarado (1000): el trazo se dibuja en proporcion
  // a su propia longitud, no en pixeles, asi que da igual el tamaño de la
  // pantalla. Ver la constante DRAW para el porque de mil y no uno.
  .signal-live {
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    stroke-linecap: round;
  }

  .signal-pulse {
    fill: $alfii-cream;
    filter: drop-shadow(0 0 10px rgba($alfii-red, 0.9));
  }
}
</style>
