import type { Ref } from 'vue';
import { useGsapContext, gsap, ScrollTrigger, MOTION_OK } from '@/composables/useGsap';

/**
 * Carril horizontal empujado por el scroll vertical. Movil incluido.
 *
 * PORQUE tambien en movil: la version anterior dejaba el telefono con un
 * carrusel de scroll nativo y nada mas, asi que bajar por la pagina era bajar
 * por una lista. Aqui la seccion se clava y el dedo, bajando, empuja el carril
 * de lado: el mismo gesto de siempre produce un movimiento que no esperabas.
 *
 * CONDICION DE ALTURA: clavar solo vale si la seccion cabe entera en la
 * pantalla. Si no cabe, el ultimo elemento queda inalcanzable (ya paso una vez
 * con la seccion de casos). Por debajo de `minHeight` no se clava nada y el
 * carril se queda con su scroll nativo, que siempre funciona.
 *
 * Las piezas ademas se acomodan al pasar por el centro. Eso se hace con
 * `containerAnimation`: ScrollTrigger sabe traducir la posicion horizontal de
 * cada pieza dentro del tween del carril a un progreso propio.
 * https://gsap.com/docs/v3/Plugins/ScrollTrigger/#containerAnimation
 */
/** Entrada escalonada para cuando la seccion no se clava. */
function revealItems(root: HTMLElement, item: string) {
  const batch = ScrollTrigger.batch(gsap.utils.toArray<HTMLElement>(item, root), {
    // Pronto: en pantallas bajas la seccion entra casi entera de golpe y con
    // un disparo tardio se veia el carril vacio durante un instante.
    start: 'top 98%',
    once: true,
    onEnter: (items) =>
      gsap.fromTo(
        items,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'alfii', overwrite: true }
      ),
  });
  return () => batch.forEach((t) => t.kill());
}

export function useHorizontalRail(opts: {
  root: Ref<HTMLElement | null>;
  rail: Ref<HTMLElement | null>;
  track: Ref<HTMLElement | null>;
  /** Selector de las piezas dentro del carril, para el efecto de entrada. */
  item: string;
  /** Alto minimo de pantalla para permitir el pin. */
  minHeight?: number;
  /** Margen extra de scroll tras terminar el recorrido, en fracciones de pantalla. */
  tail?: number;
  onProgress?: (progress: number) => void;
}) {
  const { root, rail, track, item, minHeight = 620, tail = 0.45, onProgress } = opts;

  useGsapContext(({ mm }) => {
    mm.add(`(min-height: ${minHeight}px) and ${MOTION_OK}`, () => {
      const rootEl = root.value;
      const railEl = rail.value;
      const trackEl = track.value;
      if (!rootEl || !railEl || !trackEl) return;

      // Lo que sobra del carril. Recalculado en cada refresh: al girar el
      // telefono cambia y el recorrido tiene que cuadrar igual.
      /**
       * Lo que sobra del carril, medido contra el ancho INTERIOR.
       *
       * clientWidth incluye el margen lateral del carril, y ese margen es
       * justo lo que centra cada ficha. Restandolo de mas, el recorrido se
       * quedaba 65px corto y ninguna ficha llegaba a quedar centrada: siempre
       * se paraba con dos medias fichas en pantalla.
       */
      const interior = () => {
        const cs = getComputedStyle(railEl);
        return railEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      };
      const distance = () => Math.max(0, trackEl.scrollWidth - interior());
      if (distance() <= 0) return;

      // La comprobacion que de verdad importa: ¿cabe la seccion en la pantalla?
      // Un breakpoint de altura es una aproximacion; esto es el dato. Si no
      // cabe, clavarla dejaria su ultima fila fuera de alcance.
      if (rootEl.scrollHeight > window.innerHeight) {
        return revealItems(rootEl, item);
      }

      // Con el carril clavado manda el scroll: dejarle ademas scroll nativo
      // permitiria moverlo por su cuenta y descuadrarlo del recorrido.
      rootEl.classList.add('is-railed');

      // Donde solo cabe una ficha, el carril descansa en fichas enteras.
      //
      // Sin puntos de reposo el recorrido para en cualquier sitio y casi
      // siempre deja dos medias fichas en pantalla, con las frases cortadas.
      // En escritorio no hace falta: ahi caben varias y el paso continuo se ve
      // mejor que un carrusel a saltos.
      const items = gsap.utils.toArray<HTMLElement>(item, rootEl);
      const unaPorPantalla = window.matchMedia('(max-width: 1023px)').matches;
      const paradas = items.length - 1;

      const tween = gsap.to(trackEl, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: rootEl,
          start: 'top top',
          end: () => `+=${distance() + window.innerHeight * tail}`,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: 0.7,
          invalidateOnRefresh: true,
          ...(unaPorPantalla && paradas > 0
            ? {
                snap: {
                  /**
                   * Una parada por ficha, repartidas en TODO el recorrido.
                   *
                   * `tail` no es una cola muerta: el tween del carril esta
                   * ligado al recorrido completo, asi que alargar el final solo
                   * hace que el carril avance mas despacio. Las fichas caen en
                   * k/(n-1) del progreso total, y con el margen lateral
                   * calculado eso deja cada una centrada.
                   */
                  snapTo: 1 / paradas,
                  duration: { min: 0.15, max: 0.35 },
                  delay: 0.12,
                  ease: 'power2.inOut',
                },
              }
            : {}),
          onUpdate: (self) => onProgress?.(self.progress),
        },
      });

      /**
       * Cada pieza entra por la derecha y SALE por la izquierda.
       *
       * Sin la salida, la tarjeta que abandona el carril se cortaba a media
       * palabra contra el borde de la pantalla: se leia media frase suelta y
       * parecia un error de maquetacion. Ahora se apaga antes de llegar.
       *
       * Nada de `y` en la entrada: mover cada tarjeta en vertical por separado
       * las descuadraba entre si, porque cada una va por su propio progreso.
       */
      const tweens = items.flatMap((el) => [
        gsap.fromTo(
          el,
          { opacity: 0.2, scale: 0.92 },
          {
            opacity: 1,
            scale: 1,
            ease: 'none',
            // Termina de aparecer cuando ya esta dentro de verdad (65% del
            // ancho): antes se veia entera todavia pegada al borde derecho.
            scrollTrigger: {
              trigger: el,
              containerAnimation: tween,
              start: 'left 100%',
              end: 'left 62%',
              scrub: true,
            },
          }
        ),
        gsap.fromTo(
          el,
          { opacity: 1 },
          {
            opacity: 0,
            ease: 'none',
            /**
             * Se apaga en cuanto deja de estar en su sitio.
             *
             * En reposo la ficha ocupa casi todo el ancho (borde derecho al
             * 98%), asi que empezar el apagado al 88% significa: entera
             * mientras esta parada, apagada en cuanto el carril se mueve. Con
             * margenes mas tardios, la ficha saliente seguia legible a medias
             * contra el borde y eso era justo lo que se veia mal.
             */
            scrollTrigger: {
              trigger: el,
              containerAnimation: tween,
              start: 'right 88%',
              end: 'right 40%',
              scrub: true,
            },
          }
        ),
      ]);

      return () => {
        rootEl.classList.remove('is-railed');
        tweens.forEach((t) => {
          t.scrollTrigger?.kill();
          t.kill();
        });
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    });

    // Pantallas bajas o movimiento reducido: sin pin. El carril conserva su
    // scroll nativo y las piezas entran de una vez, sin depender del gesto.
    mm.add(`(max-height: ${minHeight - 1}px), (prefers-reduced-motion: reduce)`, () => {
      const rootEl = root.value;
      if (!rootEl) return;
      return revealItems(rootEl, item);
    });
  }, root);
}
