import { onMounted, onUnmounted, type Ref } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

/**
 * Registro unico de plugins.
 *
 * PORQUE aqui y no en cada vista: registerPlugin es idempotente pero pagarlo en
 * cada componente ensucia el arranque y esconde de donde sale cada plugin. Con
 * un solo punto, anadir uno nuevo es una linea y se ve quien lo usa.
 */
gsap.registerPlugin(ScrollTrigger, SplitText);

export { gsap, ScrollTrigger, SplitText };

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
