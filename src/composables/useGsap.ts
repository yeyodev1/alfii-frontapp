import { onMounted, onUnmounted, type Ref } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Observer } from 'gsap/Observer';
import { TextPlugin } from 'gsap/TextPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { CustomEase } from 'gsap/CustomEase';

/**
 * Registro unico de plugins.
 *
 * PORQUE aqui y no en cada vista: registerPlugin es idempotente pero pagarlo en
 * cada componente ensucia el arranque y esconde de donde sale cada plugin. Con
 * un solo punto, anadir uno nuevo es una linea y se ve quien lo usa.
 *
 * Quien usa que:
 * - ScrollTrigger / ScrollTo: recorridos y saltos de la pagina.
 * - SplitText: titulares por palabras con mascara de linea.
 * - Flip: el veredicto convirtiendose en expediente.
 * - Draggable + Inertia: carriles que se arrastran y frenan solos.
 * - MotionPath: el pulso que recorre la señal del hero.
 * - Observer: gestos (swipe / rueda) sin depender del scroll de la pagina.
 * - Text / ScrambleText: el ticker del hero y el descifrado del arquetipo.
 * - CustomEase: la curva de marca.
 */
gsap.registerPlugin(
  ScrollTrigger,
  SplitText,
  Flip,
  ScrollToPlugin,
  Draggable,
  InertiaPlugin,
  MotionPathPlugin,
  Observer,
  TextPlugin,
  ScrambleTextPlugin,
  CustomEase
);

/**
 * Curva de marca: sale rapido y frena largo.
 *
 * PORQUE una sola: usar power2 aqui y back alla hace que la pagina se mueva con
 * dos personalidades. Con una curva propia todo se siente del mismo sitio.
 */
CustomEase.create('alfii', '0.16, 1, 0.3, 1');

/**
 * Movil: ignorar el resize de la barra de direcciones.
 *
 * PORQUE sin esto no se puede clavar nada en un telefono: al bajar, el
 * navegador esconde su barra, el viewport cambia de alto, ScrollTrigger hace
 * refresh y todo lo clavado da un salto. Con ignoreMobileResize solo recalcula
 * cuando cambia la orientacion, que es cuando de verdad cambia el layout.
 * https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.config()
 */
ScrollTrigger.config({ ignoreMobileResize: true });

// En desarrollo, a mano desde la consola: ScrollTrigger.getAll() dice que
// recorridos existen y donde empiezan y acaban. Sin esto, depurar un scrub que
// no interpola es adivinar.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).ScrollTrigger = ScrollTrigger;
  (window as unknown as Record<string, unknown>).gsap = gsap;
}

export {
  gsap,
  ScrollTrigger,
  SplitText,
  Flip,
  ScrollToPlugin,
  Draggable,
  InertiaPlugin,
  MotionPathPlugin,
  Observer,
  CustomEase,
};

/**
 * Envuelve las animaciones de un componente en un gsap.context con limpieza.
 *
 * PORQUE es obligatorio en una SPA: al cambiar de ruta el componente muere pero
 * los ScrollTrigger siguen vivos, escuchando el scroll y apuntando a nodos que
 * ya no existen. El sintoma es un scroll que se traba a los tres o cuatro
 * cambios de vista y no hay error en consola que lo delate. `ctx.revert()`
 * mata los triggers y ademas devuelve los estilos inline que GSAP escribio, asi
 * que el DOM queda como estaba.
 *
 * El callback recibe `mm` (gsap.matchMedia) ya creado: dentro de
 * `mm.add('(prefers-reduced-motion: no-preference)', ...)` va todo lo que sea
 * decorativo. Quien pide menos movimiento en su sistema operativo no deberia
 * tener que aguantar una pagina que se mueve entera.
 */
export function useGsapContext(
  build: (ctx: { mm: gsap.MatchMedia; self: gsap.Context }) => void,
  scope?: Ref<HTMLElement | null>
) {
  let ctx: gsap.Context | null = null;
  let mm: gsap.MatchMedia | null = null;

  onMounted(() => {
    ctx = gsap.context((self) => {
      mm = gsap.matchMedia();
      build({ mm, self });
    }, scope?.value ?? undefined);
  });

  onUnmounted(() => {
    mm?.revert();
    ctx?.revert();
    ctx = null;
    mm = null;
  });
}

/** Media query para "el usuario acepta movimiento". Todo lo decorativo va dentro. */
export const MOTION_OK = '(prefers-reduced-motion: no-preference)';

/**
 * Titular que sube desde debajo del renglon, palabra a palabra.
 *
 * PORQUE por palabras y no por letras: un titular letra a letra se lee como
 * efecto, no como frase. Se parte tambien por lineas porque cada linea lleva
 * overflow:hidden (clase .split-line) y hace de mascara: las palabras entran
 * desde debajo del renglon en vez de flotar en mitad del hueco.
 *
 * Devuelve la instancia de SplitText: hay que llamar a revert() al desmontar o
 * el DOM se queda partido en divs y los lectores de pantalla leen basura.
 */
export function headingReveal(
  target: Element | null,
  options: {
    start?: string;
    duration?: number;
    stagger?: number;
    animate?: boolean;
    /**
     * 'words' parte tambien por palabras. 'lines' se queda en lineas enteras:
     * obligatorio cuando el titular lleva dentro un <span> con
     * background-clip:text, porque al partir en palabras cada trozo se queda
     * sin el fondo del que recorta y el texto sale invisible.
     */
    by?: 'words' | 'lines';
  } = {}
): SplitText | null {
  if (!target) return null;
  const { start = 'top 86%', duration = 0.9, stagger = 0.045, animate = true, by = 'words' } = options;

  const split = new SplitText(target, {
    type: by === 'lines' ? 'lines' : 'lines,words',
    linesClass: 'split-line',
  });

  // El hero no espera scroll: se parte aqui y lo anima el timeline de carga.
  if (!animate) return split;

  gsap.from(by === 'lines' ? split.lines : split.words, {
    yPercent: 118,
    duration,
    stagger,
    ease: 'expo.out',
    scrollTrigger: { trigger: target, start, once: true },
  });

  return split;
}

/**
 * Aparicion escalonada al entrar en pantalla.
 *
 * ScrollTrigger.batch agrupa los elementos que entran en el mismo frame y los
 * anima juntos. Un ScrollTrigger por tarjeta daria el mismo resultado visual
 * pero creando decenas de triggers; con seis tarjetas da igual, con una pagina
 * entera no.
 */
export function revealBatch(
  targets: gsap.DOMTarget,
  options: { y?: number; stagger?: number; duration?: number; start?: string } = {}
) {
  const { y = 34, stagger = 0.09, duration = 0.75, start = 'top 88%' } = options;

  gsap.set(targets, { opacity: 0, y });

  return ScrollTrigger.batch(targets, {
    start,
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration,
        stagger,
        ease: 'power3.out',
        overwrite: true,
      }),
  });
}
