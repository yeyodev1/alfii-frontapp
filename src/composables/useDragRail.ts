import { onMounted, onUnmounted, type Ref } from 'vue';
import { gsap, InertiaPlugin } from '@/composables/useGsap';

/**
 * Arrastrar un carril con raton, con frenado por inercia y enganche a pieza.
 *
 * PORQUE a mano y no con Draggable ni Observer: los dos se quedan mudos sobre un
 * contenedor que YA scrollea de forma nativa (Draggable con type:'scrollLeft'
 * cede el gesto al navegador, y Observer no emite onDrag ahi). Comprobado en
 * pruebas headless: el carril no se movia ni un pixel. Mover scrollLeft a mano
 * son cuatro lineas y funciona igual en todos los navegadores.
 *
 * Lo que si aporta GSAP es el final: InertiaPlugin calcula la velocidad real
 * del gesto y decide donde parar, que es lo que da el peso de app nativa.
 * https://gsap.com/docs/v3/Plugins/InertiaPlugin
 *
 * SOLO CON PUNTERO FINO: en tactil el scroll nativo ya trae inercia y snap del
 * sistema; superponerle el nuestro da el tipico carril que se pasa de frenada.
 */
export function useDragRail(railRef: Ref<HTMLElement | null>, options: { step?: () => number } = {}) {
  let rail: HTMLElement | null = null;
  let dragging = false;
  let startX = 0;
  let startScroll = 0;

  function onPointerDown(e: PointerEvent) {
    if (!rail || e.button !== 0) return;
    dragging = true;
    startX = e.clientX;
    startScroll = rail.scrollLeft;
    gsap.killTweensOf(rail);
    rail.setPointerCapture(e.pointerId);
    rail.style.cursor = 'grabbing';
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !rail) return;
    // preventDefault evita que el gesto seleccione el texto de las tarjetas.
    e.preventDefault();
    rail.scrollLeft = startScroll - (e.clientX - startX);
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging || !rail) return;
    dragging = false;
    rail.releasePointerCapture?.(e.pointerId);
    rail.style.cursor = 'grab';

    const velocity = InertiaPlugin.getVelocity(rail, 'scrollLeft');
    const step = options.step?.() ?? 0;

    gsap.to(rail, {
      inertia: {
        scrollLeft: {
          velocity,
          // Al frenar engancha a la pieza mas cercana en vez de quedarse a
          // medio camino entre dos.
          end: step > 0 ? (natural: number) => Math.round(natural / step) * step : undefined,
        },
      },
    });
  }

  onMounted(() => {
    const el = railRef.value;
    if (!el || !window.matchMedia('(pointer: fine)').matches) return;
    if (el.scrollWidth <= el.clientWidth + 4) return;

    rail = el;
    InertiaPlugin.track(el, 'scrollLeft');
    el.dataset.dragRail = 'on';
    el.style.cursor = 'grab';

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
  });

  onUnmounted(() => {
    if (!rail) return;
    rail.removeEventListener('pointerdown', onPointerDown);
    rail.removeEventListener('pointermove', onPointerMove);
    rail.removeEventListener('pointerup', onPointerUp);
    rail.removeEventListener('pointercancel', onPointerUp);
    InertiaPlugin.untrack(rail, 'scrollLeft');
    rail = null;
  });
}
