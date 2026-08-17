import type { Ref } from 'vue';
import { gsap } from '@/composables/useGsap';

/**
 * Teletipo que escribe frases sobre el mismo nodo (TextPlugin).
 *
 * Borra antes de escribir: pasando de una frase a otra directamente, TextPlugin
 * sustituye caracter a caracter y por el camino se leen mezclas sin sentido
 * ('un vistoe aviso"'), que parecen un error de la pagina.
 * https://gsap.com/docs/v3/Plugins/TextPlugin
 */
export function tickerLoop(el: Ref<HTMLElement | null>, frases: string[]) {
  const node = el.value;
  if (!node || !frases.length) return null;

  const tl = gsap.timeline({ repeat: -1, delay: 1.4 });

  frases.forEach((frase) => {
    tl.to(node, { duration: 0.28, text: { value: '' }, ease: 'none' })
      .to(node, { duration: 0.6, text: { value: frase }, ease: 'none' })
      .to({}, { duration: 1.9 });
  });

  return tl;
}
