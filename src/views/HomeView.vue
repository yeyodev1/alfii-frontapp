<script setup lang="ts">
import AlfiiLogo from '@/components/shared/AlfiiLogo.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import AnalysisCard from '@/components/shared/AnalysisCard.vue';
import WingmanIntroSheet from '@/components/modals/WingmanIntroSheet.vue';
import type { IconName } from '@/config/icons';
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useModal } from '@/composables/useModal';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useGsapContext, gsap, ScrollTrigger, SplitText, revealBatch, MOTION_OK } from '@/composables/useGsap';
import { useFirstAnalysisStore, type FirstAnalysisResponse } from '@/stores/firstAnalysis';
import api from '@/services/http';

const router = useRouter();
const { open } = useModal();
const authStore = useAuthStore();
const toastStore = useToastStore();
const firstAnalysisStore = useFirstAnalysisStore();

/**
 * Raiz de la pagina: alcance del gsap.context.
 *
 * Todo selector de las animaciones se resuelve DENTRO de este nodo. Sin el, un
 * `.chip` del home tambien alcanzaria los chips de cualquier otra vista montada.
 */
const pageRef = ref<HTMLElement | null>(null);
const hudBar = ref<HTMLElement | null>(null);

/** Con movimiento reducido no hay coreografia: la pagina se lee quieta. */
const motionOk =
  typeof window !== 'undefined' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const showSticky = ref(false);
const isDragOver = ref(false);
const activeCaseIndex = ref(0);
const showFullAnalysis = ref(false);

// ---------------------------------------------------------------------------
// Casos vivos: cada uno trae su hilo de chat y su analisis completo de 6 bloques.
// Es la demostracion del producto real, no un mockup decorativo.
// ---------------------------------------------------------------------------
const liveCases = [
  {
    tag: 'Mensaje de madrugada',
    hook: '"y tú qué haces despierto a esta hora 👀"',
    contact: 'Sofi',
    thread: [
      { from: 'him', text: 'entonces sí te gustó el lugar', time: '23:45' },
      { from: 'her', text: 'sí estuvo lindo, aunque la música media rara jaja', time: '23:46' },
      { from: 'him', text: 'la próxima elijo yo la playlist entonces', time: '23:46' },
      { from: 'her', text: 'uy no sé si confiarte eso', time: '23:47', flag: true },
      { from: 'her', text: 'y tú qué haces despierto a esta hora 👀', time: '23:47', flag: true, live: true },
    ],
    verdict: {
      subtext: 'No es curiosidad inocente. Es un anzuelo: mide si estás disponible o si tienes una vida que la obliga a competir por tu atención.',
      archetype: 'KOAKUMA',
      confidence: 85,
      timing: '15 min',
      scriptStyle: 'PODER',
      script: 'Resolviendo un par de problemas. Y evaluando si te doy una segunda oportunidad con la música. Deberías dormir.',
    },
    analysis: {
      lead: 'La partida va a tu favor. Está enganchada y te está midiendo de madrugada.',
      subtext: {
        reading: 'Ella hace dos movimientos. Primero un shit test suave ("uy no sé si confiarte eso") para ver si te justificas sobre tu gusto musical. Después lanza un anzuelo nocturno ("y tú qué haces despierto 👀"). Ese emoji delata interés en prolongar la interacción, no curiosidad neutra.',
        frameDetected: 'Tensión juguetona: ella sondea tu disponibilidad y tu firmeza.',
        shitTestDetected: true,
        shitTestType: 'Reto juguetón / Cualificación',
      },
      archetypeDiagnosis: {
        primary: 'KOAKUMA',
        hybrid: ['DEREDERE'],
        confidence: 0.85,
        reasoning: 'Combina la provocación y el testeo ligero de la Koakuma con el interés receptivo de la Deredere al buscar alargar la charla a deshoras.',
      },
      riskRadar: {
        level: 'LIMPIO',
        transactionalRisk: 5,
        flags: [],
        userPostureCorrection: null,
      },
      timing: {
        waitMinutes: 15,
        recommendedReadAt: null,
        rationale: 'Responder al instante de madrugada te quita misterio y te muestra demasiado disponible. Un margen de 15 a 20 minutos sostiene el marco sin enfriar el momento.',
      },
      scripts: [
        {
          style: 'PODER',
          text: 'Resolviendo un par de problemas. Y evaluando si te doy una segunda oportunidad con la música. Deberías dormir.',
          rationale: 'Marco de hombre ocupado, invierte los papeles (tú la evalúas a ella) y cierra en el pico de interés.',
        },
        {
          style: 'CABALLERO',
          text: 'Revisando unos datos del trabajo. El silencio de esta hora es perfecto para pensar. ¿Tú qué excusa tienes para no dormir?',
          rationale: 'Comunica tus activos reales sin alardear y le devuelve la pelota con calidez.',
        },
        {
          style: 'PICARO',
          text: 'Armando la tesis de por qué mi playlist es superior. Requiere concentración. 👀',
          rationale: 'Usa su propio emoji y conecta con el shit test anterior. Misterio sin intimidarte.',
        },
      ],
      meters: { kiss: 25, firstDate: 35, firstNight: 15 },
    },
  },
  {
    tag: 'Shit test de disponibilidad',
    hook: '"yo te aviso / yo te confirmo"',
    contact: 'Andrea',
    thread: [
      { from: 'him', text: 'oye, el viernes hay un bar nuevo cerca del malecón. vamos?', time: '18:12' },
      { from: 'her', text: 'mmm suena bien', time: '18:40' },
      { from: 'her', text: 'yo te aviso, esta semana ando full', time: '18:40', flag: true, live: true },
    ],
    verdict: {
      subtext: 'Clásico test de estatus o evasiva suave. Mide si te descolocas, si insistes o si te quedas en reserva esperando su confirmación.',
      archetype: 'HIMEDERE',
      confidence: 78,
      timing: '45 min',
      scriptStyle: 'PODER',
      script: 'Dale. Si no me organizo con otro plan te aviso yo.',
    },
    analysis: {
      lead: 'Te dejó en lista de espera. No confirmes tu disponibilidad indefinida: recupera el marco.',
      subtext: {
        reading: 'El "yo te aviso" no es un no, es una prueba de estatus. Te coloca en reserva mientras ella conserva la opción abierta. Si insistes o pides fecha exacta, confirmas que tu agenda gira alrededor de la suya.',
        frameDetected: 'Ella controla el calendario y tú esperas. Marco invertido.',
        shitTestDetected: true,
        shitTestType: 'Test de disponibilidad / Estatus',
      },
      archetypeDiagnosis: {
        primary: 'HIMEDERE',
        hybrid: ['TSUN_KUUDERE'],
        confidence: 0.78,
        reasoning: 'Espera que el otro se acomode a su agenda y ofrece reciprocidad difusa. Rasgo central de la Himedere: recibe atención sin comprometer nada.',
      },
      riskRadar: {
        level: 'VIGILAR',
        transactionalRisk: 35,
        flags: [
          { code: 'BAJA_RECIPROCIDAD', description: 'Acepta la propuesta pero no aporta fecha ni alternativa.' },
        ],
        userPostureCorrection: 'No vuelvas a proponer plan hasta que ella mueva ficha. Insistir aquí te cuesta valor.',
      },
      timing: {
        waitMinutes: 45,
        recommendedReadAt: null,
        rationale: 'Responder rápido delata que estabas pendiente del teléfono. 45 minutos comunica que tienes tu propia semana ocupada.',
      },
      scripts: [
        {
          style: 'PODER',
          text: 'Dale. Si no me organizo con otro plan te aviso yo.',
          rationale: 'Retira la propuesta con serenidad y devuelve el control de la agenda a tu lado.',
        },
        {
          style: 'CABALLERO',
          text: 'Tranquila, yo también ando con la semana cargada. Cuando se te despeje me dices.',
          rationale: 'Cierra sin presión, valida su agenda y deja la pelota de su lado sin drama.',
        },
        {
          style: 'PICARO',
          text: 'Perfecto, el bar tampoco se va a mover. Yo sí, capaz. 😉',
          rationale: 'Humor con subtexto de escasez: existes fuera de esa conversación.',
        },
      ],
      meters: { kiss: 12, firstDate: 20, firstNight: 6 },
    },
  },
  {
    tag: 'Enfriamiento repentino',
    hook: '3 días fluido y de pronto 8 horas de silencio',
    contact: 'Camila',
    thread: [
      { from: 'him', text: 'jaja te lo dije, ese lugar no falla', time: '11:02' },
      { from: 'him', text: 'qué haces mañana?', time: '11:03' },
      { from: 'her', text: 'holaa perdón, recién veo', time: '19:24', flag: true, live: true },
    ],
    verdict: {
      subtext: 'Cambio de ritmo deliberado o pérdida de tensión. Mide si entras en ansiedad y le escribes doble mensaje.',
      archetype: 'TSUN_KUUDERE',
      confidence: 72,
      timing: '2 h',
      scriptStyle: 'CABALLERO',
      script: 'Tranquila. Te cuento: al final fui y estuvo mejor que la primera vez.',
    },
    analysis: {
      lead: 'Enfriamiento real. Cero reclamos: la única jugada es igualar su ritmo, no perseguir.',
      subtext: {
        reading: 'Tu doble mensaje ("qué haces mañana?") llegó antes de que ella respondiera el anterior. Eso adelanta tu interés y baja la tensión. Su "recién veo" a las 8 horas es un reajuste de ritmo, no necesariamente rechazo.',
        frameDetected: 'Tú persigues, ella regula el ritmo.',
        shitTestDetected: false,
        shitTestType: null,
      },
      archetypeDiagnosis: {
        primary: 'TSUN_KUUDERE',
        hybrid: ['DANDERE'],
        confidence: 0.72,
        reasoning: 'Respuesta corta, distante y sin contrapropuesta. Reserva emocional típica: mide perseverancia sin dar señales explícitas.',
      },
      riskRadar: {
        level: 'VIGILAR',
        transactionalRisk: 20,
        flags: [
          { code: 'RITMO_DESIGUAL', description: 'Tú envías dos mensajes por cada uno de ella.' },
        ],
        userPostureCorrection: 'El doble mensaje fue el error, no su silencio. Un mensaje por turno hasta que ella iguale el ritmo.',
      },
      timing: {
        waitMinutes: 120,
        recommendedReadAt: null,
        rationale: 'Contestar al segundo confirma que estabas esperando. Dos horas devuelve la simetría sin castigarla ni desaparecer.',
      },
      scripts: [
        {
          style: 'CABALLERO',
          text: 'Tranquila. Te cuento: al final fui y estuvo mejor que la primera vez.',
          rationale: 'Cero reclamo, aporta novedad y demuestra que tu vida siguió sin su respuesta.',
        },
        {
          style: 'PODER',
          text: 'Todo bien. Estuve con full trabajo igual.',
          rationale: 'Marco simétrico: su silencio no te afectó porque tenías tu propio frente abierto.',
        },
        {
          style: 'PICARO',
          text: 'Ya te iba a reportar como desaparecida jaja',
          rationale: 'Señala el silencio con humor, sin reproche ni necesidad. Solo si el tono previo era juguetón.',
        },
      ],
      meters: { kiss: 15, firstDate: 18, firstNight: 8 },
    },
  },
];

const currentCase = computed(() => liveCases[activeCaseIndex.value] || liveCases[0]!);

// ---------------------------------------------------------------------------
// Agitacion: el dolor antes de la solucion.
//
// PORQUE va antes de explicar el producto: quien llega aqui no busca "una IA
// que analiza chats", busca dejar de sentirse asi. Si la pagina no nombra su
// situacion exacta primero, el resto se lee como una herramienta mas.
// ---------------------------------------------------------------------------
const painPoints: { icon: IconName; text: string }[] = [
  { icon: 'subtext', text: 'Lees el mismo mensaje seis veces y sigues sin saber qué te quiso decir.' },
  { icon: 'timing', text: 'Respondes en dos segundos y te arrepientes antes de que salga el mensaje.' },
  { icon: 'thinking', text: 'Te deja en visto y no sabes si insistir o desaparecer.' },
  { icon: 'risk', text: 'Notas que algo no cuadra, pero no sabes ponerle nombre.' },
  { icon: 'scripts', text: 'Le preguntas a tu amigo, que improvisa exactamente igual que tú.' },
  { icon: 'history', text: 'Reescribes el mismo mensaje cuatro veces y acabas mandando el más soso.' },
];

// Los 6 bloques como entregable, no como funcionalidad: el usuario no compra
// "analisis de subtexto", compra saber que le estan probando.
const deliverables: { icon: IconName; title: string; text: string }[] = [
  {
    icon: 'subtext',
    title: 'Lo que de verdad te dijo',
    text: 'La lectura entre líneas: qué te está probando y qué marco está montando.',
  },
  {
    icon: 'archetype',
    title: 'Con quién estás hablando',
    text: 'Su arquetipo, con porcentaje de confianza y el razonamiento detrás.',
  },
  {
    icon: 'risk',
    title: 'Las red flags que no viste',
    text: 'Señales de riesgo con su código, y la corrección si el que se está saliendo del marco eres tú.',
  },
  {
    icon: 'timing',
    title: 'Cuándo responder',
    text: 'Los minutos exactos que conviene esperar, y por qué esa ventana y no otra.',
  },
  {
    icon: 'scripts',
    title: 'Qué escribirle, literal',
    text: 'Tres versiones listas para pegar: Poder, Caballero y Pícaro. Cada una con su porqué.',
  },
  {
    icon: 'meters',
    title: 'Dónde estás realmente',
    text: 'Medidores de avance hacia el primer beso, la primera cita y la primera noche.',
  },
];

const comparison: { without: string; with: string }[] = [
  { without: 'Interpretas según tu estado de ánimo', with: 'Lectura del subtexto, no de tus nervios' },
  { without: 'Respondes cuando la ansiedad manda', with: 'Ventana de respuesta calculada' },
  { without: 'El mismo mensaje para todas', with: 'Script calibrado a su arquetipo y a tu estilo' },
  { without: 'Descubres la red flag tres meses tarde', with: 'Radar de riesgo desde la primera captura' },
  { without: 'Consejo de un amigo que sabe lo mismo', with: 'Criterio consistente, sin sesgo de tu círculo' },
];

const faqs: { q: string; a: string }[] = [
  {
    q: '¿Esto no es manipular a alguien?',
    a: 'No. Alfii no te da trucos para forzar nada: te traduce lo que ya está escrito y te ayuda a responder desde tu propio marco. De hecho la mitad del análisis es un radar que te avisa cuando la que no te conviene es ella, o cuando el que se está saliendo del marco eres tú.',
  },
  {
    q: '¿Y si el análisis se equivoca?',
    a: 'Puede. Por eso cada bloque viene con su razonamiento y su porcentaje de confianza, no como una sentencia. Tú lees el argumento y decides. Un análisis que no explica su lógica no sirve para aprender, y la idea es que a los diez chats ya no nos necesites tanto.',
  },
  {
    q: '¿Quién puede ver mis capturas?',
    a: 'Solo tú. Quedan dentro de tu expediente privado, sin dirección pública, y se abren con enlaces firmados que caducan. Si borras una, desaparece también del almacenamiento.',
  },
  {
    q: '¿Tengo que crear una cuenta?',
    a: 'Para la primera captura no. Subes, ves el análisis completo y decides después. La cuenta solo hace falta si quieres guardar expedientes y que Alfii recuerde el historial de cada conversación.',
  },
  {
    q: '¿Funciona con Instagram, Tinder o Telegram?',
    a: 'Sí. Alfii lee la captura, no la app. Mientras el texto se vea, da igual de dónde venga.',
  },
  {
    q: '¿Para qué sirve la Auditoría inicial?',
    a: 'Para que los scripts suenen a ti y no a un guion genérico. Alfii necesita saber a qué te dedicas, qué buscas y cuáles son tus líneas rojas antes de poner palabras en tu boca. Son ocho bloques y se puede saltar lo que no quieras contar.',
  },
];

const openFaq = ref<number | null>(0);

function toggleFaq(idx: number) {
  openFaq.value = openFaq.value === idx ? null : idx;
}

function selectCase(idx: number) {
  if (idx === activeCaseIndex.value) return;
  activeCaseIndex.value = idx;
  showFullAnalysis.value = false;
  animateCaseSwap();
}

/**
 * Relevo entre casos.
 *
 * Vue ya remonta las burbujas (van con :key por indice de caso), pero remontar
 * no es animar: sin esto el chat entero parpadea y se cambia de golpe, que es
 * justo lo que delata que es un mockup. Escalonadas se leen como una
 * conversacion que llega.
 */
function animateCaseSwap() {
  if (!motionOk) return;

  void nextTick(() => {
    const bubbles = document.querySelectorAll('.live-section .wa-bubble');
    if (bubbles.length) {
      gsap.fromTo(
        bubbles,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.42, stagger: 0.07, ease: 'power2.out', overwrite: true }
      );
    }

    const verdict = document.querySelector('.live-section .verdict-card');
    if (verdict) {
      gsap.fromTo(
        verdict,
        { opacity: 0, x: 22 },
        { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out', overwrite: true }
      );
    }
  });
}

function copyScript() {
  navigator.clipboard.writeText(currentCase.value.verdict.script);
  toastStore.show('Script copiado. Ahora sube tu propia captura.', 'success');
}

// ---------------------------------------------------------------------------
// Flujo de carga y analisis
// ---------------------------------------------------------------------------
function triggerUpload() {
  fileInput.value?.click();
}

function startExperience() {
  open('wingmanIntro', WingmanIntroSheet, {
    onUpload: () => {
      triggerUpload();
    },
    onStartAudit: () => {
      router.push('/onboarding');
    },
  });
}

function handleDrop(e: DragEvent) {
  isDragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) {
    processFile(file);
  }
}

async function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processFile(file);
  }
}

async function processFile(file: File) {
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('screenshot', file);

    const res: FirstAnalysisResponse = await api.post('/analyze/first', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    // Cero friccion antes del valor: no pedimos nombre ni cuenta aqui.
    // Guardamos el analisis y llevamos al usuario directo a verlo.
    firstAnalysisStore.setFromUpload(res);
    router.push('/analisis');
  } catch (err: any) {
    toastStore.show(err.message || 'No pudimos procesar esa imagen.', 'error');
  } finally {
    uploading.value = false;
  }
}

function handleScroll() {
  showSticky.value = window.scrollY > 480;
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

// ---------------------------------------------------------------------------
// Coreografia GSAP
//
// Todo lo decorativo vive dentro de matchMedia(MOTION_OK): quien pidio menos
// movimiento en su sistema ve la pagina quieta y completa, no una pagina rota
// con la mitad de las secciones invisibles esperando un scroll que nunca las
// va a revelar.
// ---------------------------------------------------------------------------
useGsapContext(({ mm }) => {
  // La barra HUD vive fuera del matchMedia: es informacion (cuanto llevas de
  // pagina), no adorno. Con movimiento reducido sigue siendo util.
  if (hudBar.value) {
    gsap.to(hudBar.value, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
    });
  }

  mm.add(MOTION_OK, () => {
    // --- HERO: entra solo, sin esperar scroll ---
    const title = document.querySelector('.hero-title');
    let split: SplitText | null = null;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (title) {
      // Por palabras y no por letras: el titular es la promesa de la pagina y
      // letra a letra se lee como efecto, no como frase.
      //
      // Se parte tambien por lineas porque cada linea lleva overflow:hidden y
      // hace de mascara: las palabras suben desde debajo del renglon en vez de
      // aparecer flotando en mitad del hueco.
      split = new SplitText(title, { type: 'lines,words', linesClass: 'split-line' });
      tl.from(split.words, { yPercent: 115, duration: 0.85, stagger: 0.045 }, 0.1);
    }

    tl.from('.hero-badge', { y: -18, opacity: 0, duration: 0.6 }, 0)
      .from('.hero-sub', { y: 22, opacity: 0, duration: 0.7 }, 0.45)
      .from('.hero-chips li', { y: 16, opacity: 0, duration: 0.5, stagger: 0.05 }, 0.6)
      .from('.dropzone', { y: 34, opacity: 0, scale: 0.97, duration: 0.8, ease: 'back.out(1.4)' }, 0.7)
      .from('.trust-row li', { y: 12, opacity: 0, duration: 0.45, stagger: 0.07 }, 0.95);

    // Los halos se mueven a distinta velocidad que el contenido: es lo que da
    // profundidad sin meter una sola imagen de fondo.
    gsap.to('.glow-top', {
      yPercent: 34,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });
    gsap.to('.glow-bottom', {
      yPercent: -26,
      ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
    });

    // El dropzone respira: es el unico sitio donde se pide accion en el hero.
    gsap.to('.dz-icon', {
      y: -7,
      duration: 2.1,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 1.6,
    });

    // --- CABECERAS DE SECCION ---
    revealBatch('.section-head', { y: 30, stagger: 0.06 });

    // --- AGITACION: entran alternando lado, como fichas que caen a su sitio ---
    gsap.set('.pain-item', { opacity: 0, x: (i: number) => (i % 2 === 0 ? -34 : 34) });
    ScrollTrigger.batch('.pain-item', {
      start: 'top 90%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, { opacity: 1, x: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }),
    });

    gsap.from('.pain-turn', {
      opacity: 0,
      y: 24,
      duration: 0.8,
      scrollTrigger: { trigger: '.pain-turn', start: 'top 90%', once: true },
    });

    // --- LO QUE RECIBES: las tarjetas entran girando en 3D ---
    // (el recorrido por los casos se monta aparte, mas abajo)
    gsap.set('.value-card', { opacity: 0, y: 46, rotateX: -14, transformPerspective: 900 });
    ScrollTrigger.batch('.value-card', {
      start: 'top 88%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.8,
          stagger: 0.09,
          ease: 'power3.out',
        }),
    });

    // --- PASOS: el numero cuenta hacia arriba, como un marcador ---
    gsap.utils.toArray<HTMLElement>('.step').forEach((step, i) => {
      const num = step.querySelector('.step-num');

      gsap.from(step, {
        opacity: 0,
        y: 40,
        duration: 0.7,
        delay: i * 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: step, start: 'top 88%', once: true },
      });

      if (num) {
        const target = Number(num.textContent);
        const counter = { v: 0 };
        gsap.to(counter, {
          v: target,
          duration: 1.1,
          delay: i * 0.1 + 0.2,
          ease: 'power2.out',
          onUpdate: () => {
            num.textContent = String(Math.round(counter.v)).padStart(2, '0');
          },
          scrollTrigger: { trigger: step, start: 'top 88%', once: true },
        });
      }
    });

    // --- COMPARATIVA: las dos columnas se cierran hacia el centro ---
    gsap.utils.toArray<HTMLElement>('.compare-row').forEach((row) => {
      gsap.from(row.querySelectorAll('.cell-bad'), {
        opacity: 0,
        x: -30,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: { trigger: row, start: 'top 92%', once: true },
      });
      gsap.from(row.querySelectorAll('.cell-good'), {
        opacity: 0,
        x: 30,
        duration: 0.6,
        ease: 'power3.out',
        scrollTrigger: { trigger: row, start: 'top 92%', once: true },
      });
    });

    // --- OBJECIONES Y CIERRE ---
    revealBatch('.faq-item', { y: 26, stagger: 0.06, start: 'top 92%' });
    revealBatch('.privacy-card', { y: 34 });

    gsap.from('.final-card', {
      opacity: 0,
      scale: 0.95,
      y: 40,
      duration: 0.9,
      ease: 'back.out(1.2)',
      scrollTrigger: { trigger: '.final-card', start: 'top 88%', once: true },
    });

    return () => split?.revert();
  });

  // -------------------------------------------------------------------------
  // .live-section: la seccion se clava y el scroll recorre los 3 casos
  //
  // PORQUE solo a partir de 1024px: clavar exige que el contenido quepa en la
  // pantalla. En escritorio el movil y el veredicto van uno al lado del otro y
  // caben; en un telefono van apilados y suman mas de 1100px, asi que el pin
  // dejaria media seccion fuera de vista sin forma de llegar a ella.
  //
  // Debajo de 1024px no se clava nada: la seccion se recorre normal y el caso
  // va cambiando segun por donde vaya el scroll, que da el mismo recorrido sin
  // romper nada. Los chips siguen funcionando en los dos casos.
  // -------------------------------------------------------------------------
  const lastIndex = liveCases.length - 1;

  /**
   * Zonas muertas al principio y al final del recorrido clavado.
   *
   * PORQUE existen: sin ellas el snap tiene una parada en el progreso 0 y otra
   * en el 1, o sea justo en los dos bordes del pin. Al entrar, cualquier
   * movimiento pequeno lo devolvia al 0 de un tiron; al terminar el ultimo caso,
   * el snap peleaba por mantenerlo en el 1 hasta que el scroll ganaba, y esa
   * liberacion de golpe es lo que se sentia todavia mas brusco al salir.
   *
   * Con estos margenes, el primer y el ultimo tramo del pin no tienen parada:
   * se entra y se sale deslizando. Y no son tiempo perdido, porque ahi es donde
   * se scrubbean la entrada y la salida de la seccion.
   */
  const ENTER_PAD = 0.14;
  const EXIT_PAD = 0.16;
  const SPAN = 1 - ENTER_PAD - EXIT_PAD;

  /** Progreso del trigger (0..1) → progreso util del recorrido de casos (0..1). */
  const innerProgress = (p: number) => gsap.utils.clamp(0, 1, (p - ENTER_PAD) / SPAN);

  /** Progreso util → indice del caso. */
  const caseFromProgress = (p: number) => Math.round(innerProgress(p) * lastIndex);

  /** Indice del caso → progreso real del trigger donde debe pararse. */
  const stopAt = (i: number) => ENTER_PAD + (i / lastIndex) * SPAN;

  mm.add(`(min-width: 1024px) and ${MOTION_OK}`, () => {
    // Un solo timeline de duracion 1 atado al pin: asi las posiciones del
    // timeline y el progreso del scroll son el mismo numero, y las zonas
    // muertas se reservan escribiendo tramos con esa duracion exacta.
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.live-section',
        start: 'top top',
        // Una pantalla por salto entre casos, mas el margen de las dos zonas.
        end: () => `+=${window.innerHeight * (lastIndex + ENTER_PAD + EXIT_PAD)}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        // El scrub es lo que quita el corte al clavarse: el contenido sigue
        // llegando a su sitio durante el primer tramo en vez de congelarse en
        // el instante exacto en que la seccion toca el borde de la pantalla.
        scrub: 0.6,
        snap: {
          snapTo: (value) => {
            // Dentro de las zonas muertas se devuelve el valor tal cual: GSAP
            // "anima" hacia donde ya estas, que es no moverse. Es la forma de
            // desactivar el snap por tramos sin desactivarlo entero.
            if (value <= ENTER_PAD || value >= 1 - EXIT_PAD) return value;
            return stopAt(caseFromProgress(value));
          },
          // Mas lento y con mas espera que antes: a 40ms el snap saltaba encima
          // del propio gesto del usuario y se percibia como que la pagina le
          // arrancaba el scroll de las manos.
          duration: { min: 0.35, max: 0.7 },
          delay: 0.14,
          ease: 'power2.inOut',
          inertia: false,
        },
        onUpdate: (self) => selectCase(caseFromProgress(self.progress)),
      },
    });

    tl.fromTo(
      '.live-layout',
      { scale: 0.94, y: 40, opacity: 0.5 },
      { scale: 1, y: 0, opacity: 1, duration: ENTER_PAD }
    )
      // Tramo de los casos: no anima nada, solo reserva su sitio en el timeline.
      // Lo que cambia aqui es el caso activo, y de eso se encarga onUpdate.
      .to({}, { duration: SPAN })
      // Y la seccion se despide antes de soltar el pin, para que la liberacion
      // sea la continuacion de un movimiento y no un salto.
      .to('.live-layout', { scale: 0.95, y: -34, opacity: 0.4, duration: EXIT_PAD });

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  });

  mm.add(`(max-width: 1023px) and ${MOTION_OK}`, () => {
    // Sin pin: el caso cambia segun por donde va el scroll de la seccion.
    const st = ScrollTrigger.create({
      trigger: '.live-section',
      start: 'top 60%',
      end: 'bottom 60%',
      onUpdate: (self) => selectCase(caseFromProgress(self.progress)),
    });

    // La entrada del movil y del veredicto solo hace falta aqui. En escritorio
    // la lleva el propio tramo de entrada del pin, y montarla dos veces dejaba
    // dos animaciones distintas cruzandose sobre los mismos nodos.
    const phone = gsap.fromTo(
      '.phone',
      { rotateX: 12, y: 44, opacity: 0 },
      {
        rotateX: 0,
        y: 0,
        opacity: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.live-layout', start: 'top 82%', once: true },
      }
    );

    const verdict = gsap.from('.verdict-card', {
      opacity: 0,
      y: 40,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.live-layout', start: 'top 78%', once: true },
    });

    return () => {
      st.kill();
      phone.scrollTrigger?.kill();
      verdict.scrollTrigger?.kill();
      phone.kill();
      verdict.kill();
    };
  });
}, pageRef);

/**
 * Abrir los 6 bloques cambia el alto de una seccion que puede estar clavada.
 *
 * Sin recalcular, ScrollTrigger sigue creyendo que la seccion mide lo de antes:
 * el pin termina donde no toca y el contenido nuevo aparece cortado. refresh()
 * en el frame siguiente, ya con el DOM pintado, lo recoloca.
 */
watch(showFullAnalysis, () => {
  void nextTick(() => ScrollTrigger.refresh());
});
</script>

<template>
  <div ref="pageRef" class="home-page">
    <!--
      HUD de progreso. Se llena con el scroll de toda la pagina: da la sensacion
      de barra de carga de nivel y, de paso, dice cuanto queda por leer.
    -->
    <div class="hud-track">
      <div ref="hudBar" class="hud-bar"></div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="handleFileSelected"
    />

    <!-- ================= NAV ================= -->
    <header class="navbar">
      <div class="navbar-inner">
        <AlfiiLogo size="sm" mode="full" />
        <div class="nav-actions">
          <RouterLink v-if="!authStore.user?.isAnonymous" to="/vault" class="nav-ghost">
            <BaseIcon name="vault" size="xs" color="cream" />
            <span class="only-desktop">Mi Bóveda</span>
          </RouterLink>
          <button class="nav-cta" @click="startExperience">
            <BaseIcon name="upload" size="xs" color="cream" />
            <span>Analizar captura</span>
          </button>
        </div>
      </div>
    </header>

    <!-- ================= 1. HERO ================= -->
    <section class="hero">
      <div class="glow glow-top"></div>
      <div class="glow glow-bottom"></div>

      <div class="hero-inner">
        <div class="hero-badge">
          <span class="pulse-dot"></span>
          <span>Gratis la primera captura · sin registro</span>
        </div>

        <h1 class="hero-title">
          Ella ya te dijo la verdad.
          <span class="shimmer-text">Tú no la leíste.</span>
        </h1>

        <p class="hero-sub">
          Sube una captura del chat. En 10 segundos Alfii te dice qué te está probando,
          qué arquetipo es, cuánto esperar para responder y exactamente qué escribirle.
        </p>

        <!--
          Los seis bloques dichos en el hero, antes de pedir nada.
          Quien llega frio no sabe que significa "analisis": esto lo convierte en
          seis cosas concretas que se entienden de un vistazo.
        -->
        <ul class="hero-chips">
          <li>Subtexto</li>
          <li>Arquetipo</li>
          <li>Red flags</li>
          <li>Timing exacto</li>
          <li>3 scripts listos</li>
          <li>Medidores</li>
        </ul>

        <!-- Dropzone: el unico protagonista del hero -->
        <div
          class="dropzone"
          :class="{ 'is-dragover': isDragOver, 'is-uploading': uploading }"
          @click="startExperience"
          @dragover.prevent="isDragOver = true"
          @dragleave.prevent="isDragOver = false"
          @drop.prevent="handleDrop"
        >
          <div class="dz-icon">
            <BaseIcon v-if="uploading" name="spinner" spin color="red" size="xl" />
            <BaseIcon v-else name="upload" color="red" size="xl" />
          </div>

          <h2 class="dz-title">
            {{ uploading ? 'Leyendo la conversación...' : 'Sube tu captura' }}
          </h2>
          <p class="dz-hint">
            {{ uploading ? 'Descifrando subtexto y arquetipo' : 'WhatsApp · Instagram · Tinder · Telegram' }}
          </p>

          <button class="dz-btn" :disabled="uploading">
            <span>{{ uploading ? 'Procesando...' : 'Analizar ahora' }}</span>
            <BaseIcon name="arrowRight" size="xs" color="cream" />
          </button>
        </div>

        <ul class="trust-row">
          <li><BaseIcon name="bolt" color="sage" size="xs" /><span>10 segundos</span></li>
          <li><BaseIcon name="privacy" color="sage" size="xs" /><span>Privado y solo tuyo</span></li>
          <li><BaseIcon name="check" color="sage" size="xs" /><span>Sin crear cuenta</span></li>
        </ul>
      </div>
    </section>

    <!-- ================= 2. AGITACIÓN ================= -->
    <section class="pain-section">
      <div class="section-inner">
        <div class="section-head">
          <span class="eyebrow">
            <BaseIcon name="thinking" color="red" size="xs" />
            Si estás aquí, algo de esto te pasó esta semana
          </span>
          <h2>El problema no es que no sepas escribir</h2>
          <p>Es que estás leyendo la conversación con la misma cabeza que la escribió.</p>
        </div>

        <ul class="pain-grid">
          <li v-for="(p, i) in painPoints" :key="p.text" class="pain-item" :style="{ animationDelay: `${i * 60}ms` }">
            <BaseIcon :name="p.icon" color="red" size="sm" />
            <span>{{ p.text }}</span>
          </li>
        </ul>

        <p class="pain-turn">
          Ninguna de esas cosas se arregla escribiendo mejor.
          <strong>Se arreglan leyendo bien.</strong>
        </p>
      </div>
    </section>

    <!-- ================= 3. PRUEBA VIVA ================= -->
    <section class="live-section">
      <div class="section-inner">
        <div class="section-head">
          <span class="eyebrow">
            <BaseIcon name="bolt" color="red" size="xs" />
            Míralo funcionar antes de subir nada
          </span>
          <h2>Elige la situación que estás viviendo ahora</h2>
          <p>Estos son análisis reales de Alfii. Toca uno y mira el veredicto completo.</p>
        </div>

        <!--
          Contador de casos. Con la seccion clavada, el usuario necesita saber
          que el scroll no se ha atascado: esto le dice que esta pasando por
          tres cosas y en cual va.
        -->
        <div class="case-progress">
          <span class="cp-dots">
            <i
              v-for="(_, idx) in liveCases"
              :key="idx"
              class="cp-dot"
              :class="{ on: idx <= activeCaseIndex, current: idx === activeCaseIndex }"
            ></i>
          </span>
          <span class="cp-label">Caso {{ activeCaseIndex + 1 }} de {{ liveCases.length }}</span>
          <span class="cp-hint">Sigue bajando</span>
        </div>

        <!-- Selector de casos: chips scrollables en movil -->
        <div class="case-chips">
          <button
            v-for="(item, idx) in liveCases"
            :key="item.tag"
            class="chip"
            :class="{ active: activeCaseIndex === idx }"
            @click="selectCase(idx)"
          >
            <span class="chip-tag">{{ item.tag }}</span>
            <span class="chip-hook">{{ item.hook }}</span>
          </button>
        </div>

        <div class="live-layout">
          <!-- Chat real -->
          <div class="chat-col">
            <div class="phone">
              <div class="wa-head">
                <div class="wa-user">
                  <div class="wa-avatar">{{ currentCase.contact.charAt(0) }}</div>
                  <div class="wa-meta">
                    <span class="wa-name">{{ currentCase.contact }}</span>
                    <span class="wa-status">en línea</span>
                  </div>
                </div>
                <BaseIcon name="platform.whatsapp" color="sage" size="base" />
              </div>

              <div class="wa-body">
                <div
                  v-for="(msg, i) in currentCase.thread"
                  :key="`${activeCaseIndex}-${i}`"
                  class="wa-bubble"
                  :class="[msg.from, { flag: msg.flag, live: msg.live }]"
                >
                  <p>{{ msg.text }}</p>
                  <span class="wa-time">{{ msg.time }}</span>
                </div>
              </div>

              <div class="wa-foot">
                <span class="live-dot"></span>
                <span>Alfii está leyendo esta conversación</span>
              </div>
            </div>
          </div>

          <!-- Veredicto -->
          <div class="verdict-col">
            <div class="verdict-card">
              <div class="v-block">
                <div class="v-head">
                  <BaseIcon name="subtext" color="red" size="sm" />
                  <span>Lo que realmente te dijo</span>
                </div>
                <p class="v-text">{{ currentCase.verdict.subtext }}</p>
              </div>

              <div class="v-stats">
                <div class="v-stat">
                  <BaseIcon name="archetype" color="sage" size="sm" />
                  <strong>{{ currentCase.verdict.archetype }}</strong>
                  <span>{{ currentCase.verdict.confidence }}% confianza</span>
                </div>
                <div class="v-stat">
                  <BaseIcon name="timing" color="cream" size="sm" />
                  <strong>Esperar {{ currentCase.verdict.timing }}</strong>
                  <span>antes de responder</span>
                </div>
              </div>

              <div class="v-script">
                <div class="v-script-head">
                  <span class="style-badge">{{ currentCase.verdict.scriptStyle }}</span>
                  <button class="copy-mini" @click="copyScript">
                    <BaseIcon name="copy" color="muted" size="xs" />
                    <span>Copiar</span>
                  </button>
                </div>
                <p class="v-script-text">"{{ currentCase.verdict.script }}"</p>
              </div>

              <button class="v-expand" @click="showFullAnalysis = !showFullAnalysis">
                <BaseIcon :name="showFullAnalysis ? 'close' : 'expand'" color="cream" size="xs" />
                <span>{{ showFullAnalysis ? 'Cerrar análisis completo' : 'Ver los 6 bloques del análisis' }}</span>
              </button>
            </div>

            <div v-if="showFullAnalysis" class="full-analysis animate-fade-in">
              <AnalysisCard :analysis="currentCase.analysis" />
            </div>
          </div>
        </div>

        <button class="section-cta" @click="startExperience">
          <BaseIcon name="upload" color="cream" size="xs" />
          <span>Ahora hazlo con tu chat real</span>
        </button>
      </div>
    </section>

    <!-- ================= 4. LO QUE RECIBES ================= -->
    <section class="value-section">
      <div class="section-inner">
        <div class="section-head">
          <span class="eyebrow">
            <BaseIcon name="listCheck" color="sage" size="xs" />
            Seis bloques por captura
          </span>
          <h2>No es una opinión. Es un expediente</h2>
          <p>Cada captura que subes devuelve esto, completo, en menos de lo que tardas en releer el chat.</p>
        </div>

        <div class="value-grid">
          <article
            v-for="(d, i) in deliverables"
            :key="d.title"
            class="value-card"
            :style="{ animationDelay: `${i * 70}ms` }"
          >
            <span class="value-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <BaseIcon :name="d.icon" color="red" size="base" />
            <h3>{{ d.title }}</h3>
            <p>{{ d.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- ================= 5. CÓMO FUNCIONA ================= -->
    <section class="steps-section">
      <div class="section-inner">
        <div class="section-head">
          <span class="eyebrow">
            <BaseIcon name="listCheck" color="sage" size="xs" />
            Tres pasos, diez segundos
          </span>
          <h2>De la captura al mensaje enviado</h2>
        </div>

        <div class="steps-row">
          <article class="step step-item">
            <span class="step-num">01</span>
            <h3>Subes la captura</h3>
            <p>Alfii lee la conversación completa y la guarda en el expediente de esa chica, solo para ti.</p>
          </article>

          <article class="step step-item">
            <span class="step-num">02</span>
            <h3>Recibes el diagnóstico</h3>
            <p>Subtexto, arquetipo, red flags y el tiempo exacto que debes esperar para responder.</p>
          </article>

          <article class="step step-item">
            <span class="step-num">03</span>
            <h3>Copias tu respuesta</h3>
            <p>Tres scripts calibrados a tu personalidad: Poder, Caballero y Pícaro. Listos para pegar.</p>
          </article>
        </div>
      </div>
    </section>

    <!-- ================= 6. COMPARATIVA ================= -->
    <section class="compare-section">
      <div class="section-inner">
        <div class="section-head">
          <span class="eyebrow">
            <BaseIcon name="gavel" color="cream" size="xs" />
            La misma conversación, dos resultados
          </span>
          <h2>Improvisando vs. con Alfii</h2>
        </div>

        <div class="compare-table">
          <div class="compare-heads">
            <span class="ch ch-bad">Como lo haces hoy</span>
            <span class="ch ch-good">
              <AlfiiLogo size="sm" mode="iso" />
              Con Alfii
            </span>
          </div>

          <div v-for="(row, i) in comparison" :key="row.with" class="compare-row" :style="{ animationDelay: `${i * 60}ms` }">
            <div class="cell cell-bad">
              <BaseIcon name="close" color="muted" size="xs" />
              <span>{{ row.without }}</span>
            </div>
            <div class="cell cell-good">
              <BaseIcon name="check" color="sage" size="xs" />
              <span>{{ row.with }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ================= 7. OBJECIONES ================= -->
    <section class="faq-section">
      <div class="section-inner">
        <div class="section-head">
          <span class="eyebrow">
            <BaseIcon name="info" color="sage" size="xs" />
            Lo que todo el mundo pregunta antes de subir la primera
          </span>
          <h2>Dudas razonables</h2>
        </div>

        <div class="faq-list">
          <article
            v-for="(f, i) in faqs"
            :key="f.q"
            class="faq-item"
            :class="{ open: openFaq === i }"
          >
            <button class="faq-q" @click="toggleFaq(i)">
              <span>{{ f.q }}</span>
              <BaseIcon :name="openFaq === i ? 'close' : 'expand'" color="cream" size="xs" />
            </button>
            <p v-if="openFaq === i" class="faq-a">{{ f.a }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- ================= 8. PRIVACIDAD + CTA ================= -->
    <section class="close-section">
      <div class="section-inner">
        <div class="privacy-card">
          <BaseIcon name="privacy" color="sage" size="xl" />
          <div class="privacy-text">
            <h3>Nadie más va a ver esa conversación</h3>
            <p>
              Tus capturas quedan guardadas <strong>solo dentro de tu expediente privado</strong>,
              sin dirección pública: se abren con enlaces firmados que caducan. Las borras cuando
              quieras y desaparecen también del almacenamiento.
            </p>
            <RouterLink to="/legal" class="legal-link">
              <span>Compromiso de privacidad y legal</span>
              <BaseIcon name="arrowRight" size="xs" color="sage" />
            </RouterLink>
          </div>
        </div>

        <div class="final-card">
          <h2>Deja de improvisar tus respuestas</h2>
          <p>La primera captura es gratis y no necesitas cuenta. Ve el análisis y decide después.</p>
          <button class="final-btn" @click="startExperience">
            <BaseIcon name="upload" color="cream" size="base" />
            <span>Analizar mi captura ahora</span>
          </button>
          <span class="final-note">Sin tarjeta. Sin registro. Borras todo cuando quieras.</span>
        </div>
      </div>
    </section>

    <!-- ================= 9. FOOTER ================= -->
    <footer class="footer">
      <div class="footer-inner">
        <AlfiiLogo size="sm" mode="full" />
        <p class="footer-claim">Tu asesor privado de alta estrategia y contrainteligencia emocional.</p>
        <nav class="footer-links">
          <RouterLink to="/legal">Aviso Legal</RouterLink>
          <RouterLink to="/legal">Términos</RouterLink>
          <RouterLink to="/legal">Privacidad</RouterLink>
        </nav>
        <span class="footer-copy">© 2026 alfii.ec · Todos los derechos reservados.</span>
      </div>
    </footer>

    <!-- Sticky CTA movil -->
    <div class="sticky-bar" v-if="showSticky">
      <div class="sticky-inner">
        <div class="sticky-info">
          <AlfiiLogo size="sm" mode="iso" />
          <span>Primera captura gratis</span>
        </div>
        <button class="sticky-btn" @click="startExperience" :disabled="uploading">
          <BaseIcon name="upload" color="cream" size="xs" />
          <span>Subir</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// ===========================================================================
// MOBILE FIRST. Breakpoints ascendentes: 768px (tablet) y 1024px (desktop).
// Flex exclusivamente. Cero grid.
// ===========================================================================

.home-page {
  width: 100%;
  min-height: 100dvh;
  background-color: $alfii-navy;
  color: $alfii-cream;
  position: relative;
  padding-bottom: 84px; // espacio reservado para la sticky bar fija
}

.hidden-input {
  display: none;
}

// ---------------------------------------------------------------------------
// HUD de progreso
//
// Barra fija arriba del todo, por encima del navbar. scaleX va de 0 a 1 con el
// scroll de la pagina; transform-origin a la izquierda para que crezca hacia la
// derecha y no desde el centro.
// ---------------------------------------------------------------------------
.hud-track {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 60;
  background-color: rgba($alfii-cream, 0.06);
  pointer-events: none;
}

.hud-bar {
  height: 100%;
  width: 100%;
  transform: scaleX(0);
  transform-origin: 0 50%;
  background: linear-gradient(90deg, $alfii-red 0%, #ff3b5c 60%, $alfii-sage 100%);
  box-shadow: 0 0 12px rgba($alfii-red, 0.8);
}

// SplitText crea estas lineas en runtime, fuera del alcance del scoped CSS:
// sin :deep() el selector nunca las alcanza y la mascara no existe.
:deep(.split-line) {
  overflow: hidden;
  // Sin este respiro las tildes y las colas de la 'j' quedan cortadas por la
  // propia mascara.
  padding-bottom: 0.12em;
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  background-color: rgba($alfii-navy, 0.88);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba($alfii-cream, 0.08);

  .navbar-inner {
    max-width: 1120px;
    margin: 0 auto;
    padding: 10px clamp(16px, 4vw, 32px);
    @include row(12px, center, space-between);
  }

  .nav-actions {
    @include row(8px, center);
  }

  .only-desktop {
    display: none;

    @media (min-width: 768px) {
      display: inline;
    }
  }

  .nav-ghost {
    @include row(6px);
    padding: 9px 12px;
    border-radius: 11px;
    font-size: $fs-xs;
    font-weight: $fw-semibold;
    background-color: rgba($alfii-plum, 0.8);
    border: 1px solid rgba($alfii-cream, 0.14);
    transition: border-color $dur-fast $ease-out;

    &:hover {
      border-color: rgba($alfii-cream, 0.3);
    }
  }

  .nav-cta {
    @include row(6px);
    padding: 9px 14px;
    border-radius: 11px;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    background-color: $alfii-red;
    color: $alfii-cream;
    box-shadow: 0 4px 16px rgba($alfii-red, 0.38);
    transition: background-color $dur-fast $ease-out;

    &:hover {
      background-color: #ff1a40;
    }
  }
}

// ---------------------------------------------------------------------------
// 1. Hero
// ---------------------------------------------------------------------------
.hero {
  position: relative;
  overflow: clip;
  padding: 40px clamp(16px, 4vw, 32px) 56px;

  @media (min-width: 768px) {
    padding: 72px clamp(16px, 4vw, 32px) 96px;
  }

  .glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(110px);
    pointer-events: none;
    z-index: 0;
  }

  .glow-top {
    top: -140px;
    left: 50%;
    transform: translateX(-50%);
    width: 520px;
    height: 340px;
    background: radial-gradient(circle, rgba($alfii-red, 0.3) 0%, rgba($alfii-navy, 0) 70%);
  }

  .glow-bottom {
    bottom: -160px;
    right: -80px;
    width: 400px;
    height: 300px;
    background: radial-gradient(circle, rgba($alfii-sage, 0.16) 0%, rgba($alfii-navy, 0) 70%);
  }

  .hero-inner {
    position: relative;
    z-index: 1;
    max-width: 860px;
    margin: 0 auto;
    @include stack(20px, center);
    text-align: center;

    @media (min-width: 768px) {
      gap: 26px;
    }
  }

  .hero-badge {
    @include row(8px, center);
    padding: 7px 14px;
    border-radius: 30px;
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.06em;
    background-color: rgba($alfii-red, 0.12);
    border: 1px solid rgba($alfii-red, 0.35);

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: $alfii-red;
      box-shadow: 0 0 10px $alfii-red;
      animation: pulseHalo 2s infinite;
    }
  }

  .hero-title {
    font-size: clamp(2rem, 8.5vw, 4rem);
    font-weight: $fw-extrabold;
    line-height: 1.06;
    letter-spacing: -0.035em;

    .shimmer-text {
      display: block;
      background: linear-gradient(135deg, $alfii-cream 0%, $alfii-red 55%, #ff6b81 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: textShimmer 6s linear infinite;
    }
  }

  .hero-sub {
    font-size: $fs-md;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.82);
    max-width: 620px;

    @media (min-width: 768px) {
      font-size: $fs-lg;
    }
  }

  // Los seis entregables como fichas. Ocupan una linea y convierten la promesa
  // abstracta en algo contable antes de que el usuario suba nada.
  .hero-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 7px;
    max-width: 620px;
    // No hay reset global de listas en el proyecto: sin esto salen los puntos
    // del <ul> flotando entre ficha y ficha.
    list-style: none;

    li {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: $fs-2xs;
      font-weight: $fw-bold;
      letter-spacing: 0.02em;
      color: rgba($alfii-cream, 0.85);
      background-color: rgba($alfii-plum, 0.7);
      border: 1px solid rgba($alfii-cream, 0.14);
    }
  }
}

// Dropzone protagonista
.dropzone {
  width: 100%;
  max-width: 620px;
  padding: 26px 20px;
  border-radius: 22px;
  cursor: pointer;
  text-align: center;
  @include stack(12px, center);
  background: linear-gradient(150deg, rgba($alfii-plum, 0.9) 0%, rgba($alfii-plum, 0.6) 100%);
  backdrop-filter: blur(18px);
  border: 2px dashed rgba($alfii-red, 0.45);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42);
  transition: border-color $dur-base $ease-out, transform $dur-base $ease-out;

  @media (min-width: 768px) {
    padding: 38px 32px;
  }

  &:hover, &.is-dragover {
    border-color: $alfii-red;
    transform: translateY(-3px);
  }

  &.is-uploading {
    border-color: $alfii-sage;
    cursor: wait;
  }

  .dz-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    @include center;
    background-color: rgba($alfii-red, 0.15);
    border: 1px solid rgba($alfii-red, 0.35);
  }

  .dz-title {
    font-size: $fs-xl;
    font-weight: $fw-extrabold;
  }

  .dz-hint {
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.62);
  }

  .dz-btn {
    @include row(10px, center, center);
    width: 100%;
    max-width: 320px;
    margin-top: 4px;
    padding: 15px 24px;
    border-radius: 13px;
    font-size: $fs-md;
    font-weight: $fw-bold;
    background-color: $alfii-red;
    color: $alfii-cream;
    box-shadow: 0 8px 24px rgba($alfii-red, 0.45);
  }
}

.trust-row {
  @include row(14px, center, center);
  flex-wrap: wrap;
  list-style: none;

  li {
    @include row(6px, center);
    font-size: $fs-xs;
    font-weight: $fw-medium;
    color: rgba($alfii-cream, 0.72);
  }
}

// ---------------------------------------------------------------------------
// Estructura de secciones
// ---------------------------------------------------------------------------
.section-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 48px clamp(16px, 4vw, 32px);
  @include stack(28px);

  @media (min-width: 768px) {
    padding: 80px clamp(16px, 4vw, 32px);
    gap: 40px;
  }
}

.section-head {
  @include stack(10px, center);
  text-align: center;
  max-width: 620px;
  margin: 0 auto;

  .eyebrow {
    @include row(6px, center, center);
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.62);
  }

  h2 {
    font-size: clamp(1.6rem, 6vw, 2.4rem);
    font-weight: $fw-extrabold;
    line-height: $lh-tight;
    letter-spacing: -0.02em;
  }

  p {
    font-size: $fs-sm;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.75);
  }
}

.section-cta {
  @include row(10px, center, center);
  align-self: center;
  padding: 15px 28px;
  border-radius: 13px;
  font-size: $fs-sm;
  font-weight: $fw-bold;
  background-color: $alfii-red;
  color: $alfii-cream;
  box-shadow: 0 8px 24px rgba($alfii-red, 0.4);
}

// ---------------------------------------------------------------------------
// 2. Agitacion
//
// Fondo plano y sin tarjetas brillantes: es la seccion del problema, no la del
// producto. Si aqui todo luce vendido, el usuario deja de leerse a si mismo.
// ---------------------------------------------------------------------------
.pain-section {
  border-top: 1px solid rgba($alfii-cream, 0.06);
}

.pain-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  list-style: none;

  .pain-item {
    @include row(11px, flex-start);
    flex: 1 1 100%;
    padding: 14px 16px;
    border-radius: 14px;
    font-size: $fs-sm;
    line-height: $lh-snug;
    color: rgba($alfii-cream, 0.86);
    background-color: rgba($alfii-plum, 0.42);
    border: 1px solid rgba($alfii-cream, 0.07);
    border-left: 2px solid rgba($alfii-red, 0.5);
    // Entrada a cargo de GSAP (ver coreografia en el script).

    @media (min-width: 768px) {
      flex: 1 1 calc(50% - 5px);
    }
  }
}

// El giro: cierra el dolor y abre la solucion en una sola frase.
.pain-turn {
  text-align: center;
  max-width: 560px;
  margin: 0 auto;
  font-size: $fs-md;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.6);

  strong {
    display: block;
    margin-top: 4px;
    font-size: $fs-lg;
    font-weight: $fw-extrabold;
    color: $alfii-cream;
  }
}

// ---------------------------------------------------------------------------
// 3. Prueba viva
// ---------------------------------------------------------------------------
.live-section {
  background-color: rgba($alfii-plum, 0.28);
  border-top: 1px solid rgba($alfii-cream, 0.08);
  border-bottom: 1px solid rgba($alfii-cream, 0.08);
}

.case-chips {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 6px;
  margin: 0 calc(clamp(16px, 4vw, 32px) * -1);
  padding-left: clamp(16px, 4vw, 32px);
  padding-right: clamp(16px, 4vw, 32px);

  @media (min-width: 768px) {
    margin: 0;
    padding-left: 0;
    padding-right: 0;
    flex-wrap: wrap;
    overflow-x: visible;
    justify-content: center;
  }

  .chip {
    flex: 0 0 240px;
    scroll-snap-align: start;
    @include stack(4px);
    text-align: left;
    padding: 12px 16px;
    border-radius: 14px;
    background-color: rgba($alfii-navy, 0.6);
    border: 1px solid rgba($alfii-cream, 0.1);
    transition: border-color $dur-fast $ease-out, background-color $dur-fast $ease-out;

    @media (min-width: 768px) {
      flex: 0 1 300px;
    }

    &.active {
      background-color: rgba($alfii-red, 0.14);
      border-color: rgba($alfii-red, 0.6);
    }

    .chip-tag {
      font-size: $fs-2xs;
      font-weight: $fw-bold;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: $alfii-red;
    }

    .chip-hook {
      font-size: $fs-xs;
      font-weight: $fw-semibold;
      color: rgba($alfii-cream, 0.9);
      line-height: $lh-snug;
    }
  }
}

.live-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (min-width: 1024px) {
    flex-direction: row;
    align-items: flex-start;
    gap: 32px;
  }
}

.chat-col {
  @include center;
  width: 100%;

  @media (min-width: 1024px) {
    flex: 0 0 340px;
    position: sticky;
    top: 84px;
    align-self: flex-start;
  }
}

.verdict-col {
  flex: 1;
  width: 100%;
  @include stack(16px);
}

// Telefono / chat
.phone {
  width: 100%;
  max-width: 380px;
  border-radius: 20px;
  overflow: hidden;
  background-color: #0b141a;
  border: 1px solid rgba($alfii-cream, 0.16);
  box-shadow: 0 22px 44px rgba(0, 0, 0, 0.55);
  @include stack(0);

  .wa-head {
    padding: 11px 14px;
    background-color: #202c33;
    @include row(10px, center, space-between);

    .wa-user {
      @include row(10px, center);
    }

    .wa-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      @include center;
      background: linear-gradient(135deg, #00a884 0%, #008069 100%);
      color: #fff;
      font-weight: $fw-bold;
      font-size: $fs-sm;
    }

    .wa-meta {
      @include stack(2px);

      .wa-name { font-size: $fs-sm; font-weight: $fw-bold; color: #e9edef; }
      .wa-status { font-size: $fs-2xs; color: #8696a0; }
    }
  }

  .wa-body {
    padding: 14px 12px;
    background-color: #0b141a;
    background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0);
    background-size: 16px 16px;
    @include stack(9px);
    min-height: 260px;
  }

  .wa-bubble {
    max-width: 84%;
    padding: 8px 11px;
    border-radius: 9px;
    font-size: 13px;
    line-height: 1.4;
    // Entrada y relevo entre casos a cargo de GSAP.

    p { color: #e9edef; }

    .wa-time {
      display: block;
      text-align: right;
      font-size: 10px;
      color: #8696a0;
      margin-top: 2px;
    }

    &.her {
      align-self: flex-start;
      background-color: #202c33;
      border-top-left-radius: 0;
    }

    &.him {
      align-self: flex-end;
      background-color: #005c4b;
      border-top-right-radius: 0;
    }

    &.flag {
      border: 1px solid rgba($alfii-red, 0.5);
    }

    &.live {
      border-color: $alfii-red;
      box-shadow: 0 0 14px rgba($alfii-red, 0.25);
    }
  }

  .wa-foot {
    padding: 10px 14px;
    background-color: rgba($alfii-navy, 0.9);
    border-top: 1px solid rgba($alfii-cream, 0.08);
    @include row(8px, center, center);
    font-size: $fs-2xs;
    font-weight: $fw-semibold;
    color: rgba($alfii-cream, 0.8);

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: $alfii-red;
      box-shadow: 0 0 8px $alfii-red;
      animation: pulseHalo 2s infinite;
    }
  }
}

// Veredicto
.verdict-card {
  @include card-surface;
  @include stack(18px);

  .v-head {
    @include row(8px, center);
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.7);
  }

  .v-block {
    @include stack(8px);
  }

  .v-text {
    font-size: $fs-sm;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.9);
  }

  .v-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    .v-stat {
      flex: 1 1 150px;
      @include stack(2px);
      padding: 12px 14px;
      border-radius: 12px;
      background-color: rgba($alfii-navy, 0.6);
      border: 1px solid rgba($alfii-cream, 0.08);

      strong {
        font-size: $fs-sm;
        font-weight: $fw-bold;
      }

      span {
        font-size: $fs-2xs;
        color: rgba($alfii-cream, 0.6);
      }
    }
  }

  .v-script {
    @include stack(8px);
    padding: 14px;
    border-radius: 12px;
    background-color: rgba($alfii-navy, 0.65);
    border: 1px solid rgba($alfii-red, 0.28);

    .v-script-head {
      @include row(10px, center, space-between);
    }

    .style-badge {
      font-size: $fs-2xs;
      font-weight: $fw-bold;
      letter-spacing: 0.08em;
      padding: 3px 9px;
      border-radius: 7px;
      background-color: rgba($alfii-red, 0.18);
      color: $alfii-red;
    }

    .copy-mini {
      @include row(6px, center);
      font-size: $fs-2xs;
      font-weight: $fw-semibold;
      color: rgba($alfii-cream, 0.65);
    }

    .v-script-text {
      font-size: $fs-sm;
      font-weight: $fw-medium;
      line-height: $lh-relaxed;
      color: $alfii-cream;
    }
  }

  .v-expand {
    @include row(8px, center, center);
    width: 100%;
    padding: 12px;
    border-radius: 12px;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    background-color: rgba($alfii-cream, 0.06);
    border: 1px solid rgba($alfii-cream, 0.14);
    color: $alfii-cream;
  }
}

// Con la seccion clavada, un panel que crece sin tope empuja el pin fuera de
// la pantalla. Acotado con scroll propio, el alto de la seccion apenas se
// mueve y ScrollTrigger recalcula sobre algo estable.
.full-analysis {
  width: 100%;

  @media (min-width: 1024px) {
    max-height: 42dvh;
    @include scroll-y;
  }
}

// ---------------------------------------------------------------------------
// Contador de casos
// ---------------------------------------------------------------------------
.case-progress {
  @include row(10px, center, center);
  flex-wrap: wrap;

  .cp-dots {
    @include row(5px, center);
  }

  .cp-dot {
    width: 22px;
    height: 3px;
    border-radius: 2px;
    background-color: rgba($alfii-cream, 0.14);
    transition: background-color $dur-base $ease-out, box-shadow $dur-base $ease-out;

    &.on { background-color: rgba($alfii-red, 0.75); }

    &.current {
      background-color: $alfii-red;
      box-shadow: 0 0 10px rgba($alfii-red, 0.7);
    }
  }

  .cp-label {
    font-size: $fs-2xs;
    font-weight: $fw-extrabold;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.7);
  }

  // Solo donde la seccion se clava: en movil no hay nada que esperar, el
  // scroll sigue su curso normal y la pista sobraria.
  .cp-hint {
    display: none;
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.35);

    @media (min-width: 1024px) {
      display: inline;
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Lo que recibes
//
// Numeradas y con icono: el valor se cuenta, y contar seis cosas concretas pesa
// mas que un parrafo diciendo "analisis completo".
// ---------------------------------------------------------------------------
.value-section {
  background-color: rgba($alfii-plum, 0.2);
  border-top: 1px solid rgba($alfii-cream, 0.08);
  border-bottom: 1px solid rgba($alfii-cream, 0.08);
}

.value-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;

  .value-card {
    position: relative;
    flex: 1 1 100%;
    @include card-surface;
    @include stack(7px);
    // Entrada a cargo de GSAP (ver coreografia en el script).

    @media (min-width: 768px) {
      flex: 1 1 calc(50% - 6px);
    }

    @media (min-width: 1024px) {
      flex: 1 1 calc(33.333% - 8px);
    }

    // Marca de agua, no etiqueta: ordena sin competir con el titulo.
    .value-num {
      position: absolute;
      top: 12px;
      right: 16px;
      font-size: $fs-2xl;
      font-weight: $fw-extrabold;
      line-height: 1;
      color: rgba($alfii-cream, 0.07);
    }

    h3 {
      font-size: $fs-md;
      font-weight: $fw-bold;
      color: $alfii-cream;
    }

    p {
      font-size: $fs-xs;
      line-height: $lh-relaxed;
      color: rgba($alfii-cream, 0.68);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Pasos
// ---------------------------------------------------------------------------
.steps-row {
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (min-width: 768px) {
    flex-direction: row;
    gap: 20px;
  }

  .step {
    flex: 1 1 0;
    @include card-surface;
    @include stack(8px);

    .step-num {
      font-size: $fs-2xl;
      font-weight: $fw-extrabold;
      color: $alfii-red;
      line-height: 1;
    }

    h3 { font-size: $fs-md; font-weight: $fw-bold; }
    p { font-size: $fs-xs; line-height: $lh-relaxed; color: rgba($alfii-cream, 0.72); }
  }
}

// ---------------------------------------------------------------------------
// 6. Comparativa
//
// Dos columnas de verdad, no una tabla de marketing: la izquierda describe lo
// que el usuario hace hoy sin juzgarlo. Si la columna mala suena a caricatura,
// nadie se reconoce en ella y la comparacion no vende nada.
// ---------------------------------------------------------------------------
.compare-table {
  @include stack(8px);
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
}

.compare-heads {
  @include row(8px, center);

  .ch {
    @include row(7px, center, center);
    flex: 1 1 0;
    min-width: 0;
    padding: 9px 10px;
    border-radius: 11px;
    font-size: $fs-2xs;
    font-weight: $fw-extrabold;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-align: center;
  }

  .ch-bad {
    color: rgba($alfii-cream, 0.45);
    background-color: rgba($alfii-cream, 0.04);
  }

  .ch-good {
    color: $alfii-cream;
    background-color: rgba($alfii-red, 0.16);
    border: 1px solid rgba($alfii-red, 0.4);
  }
}

.compare-row {
  @include row(8px, stretch);
  // Entrada a cargo de GSAP: la CSS forzaba opacity 1 al cargar y anulaba el reveal.

  .cell {
    @include row(8px, flex-start);
    flex: 1 1 0;
    min-width: 0;
    padding: 12px 13px;
    border-radius: 12px;
    font-size: $fs-xs;
    line-height: $lh-snug;
  }

  .cell-bad {
    color: rgba($alfii-cream, 0.5);
    background-color: rgba($alfii-cream, 0.03);
    border: 1px solid rgba($alfii-cream, 0.06);
  }

  .cell-good {
    color: $alfii-cream;
    font-weight: $fw-semibold;
    background-color: rgba($alfii-sage, 0.1);
    border: 1px solid rgba($alfii-sage, 0.28);
  }
}

// ---------------------------------------------------------------------------
// 7. Objeciones
//
// Acordeon con la primera abierta: una lista cerrada del todo parece un pie de
// pagina legal y nadie la toca. Abierta de entrada, se lee al menos una.
// ---------------------------------------------------------------------------
.faq-section {
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
    @include row(12px, center, space-between);
    width: 100%;
    padding: 15px 17px;
    text-align: left;
    font-size: $fs-sm;
    font-weight: $fw-bold;
    color: $alfii-cream;
  }

  .faq-a {
    padding: 0 17px 16px;
    font-size: $fs-xs;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.72);
    animation: fadeInUp $dur-fast $ease-out both;
  }
}

// ---------------------------------------------------------------------------
// 8. Privacidad + cierre
// ---------------------------------------------------------------------------
.privacy-card {
  @include card-surface;
  background-color: rgba($alfii-navy, 0.85);
  border: 1px solid rgba($alfii-sage, 0.32);
  @include stack(14px, center);
  text-align: center;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: 22px;
    text-align: left;
  }

  .privacy-text {
    @include stack(8px);
    flex: 1;

    h3 { font-size: $fs-md; font-weight: $fw-bold; }
    p { font-size: $fs-xs; line-height: $lh-relaxed; color: rgba($alfii-cream, 0.8); }
  }

  .legal-link {
    @include row(6px, center);
    font-size: $fs-xs;
    font-weight: $fw-bold;
    color: $alfii-sage;
    justify-content: center;

    @media (min-width: 768px) {
      justify-content: flex-start;
    }
  }
}

.final-card {
  @include card-surface;
  background: linear-gradient(140deg, rgba($alfii-plum, 0.92) 0%, rgba($alfii-red, 0.22) 100%);
  border: 1px solid rgba($alfii-red, 0.4);
  padding: 32px 20px;
  @include stack(14px, center);
  text-align: center;

  @media (min-width: 768px) {
    padding: 52px 36px;
  }

  h2 {
    font-size: clamp(1.6rem, 6vw, 2.3rem);
    font-weight: $fw-extrabold;
    line-height: $lh-tight;
  }

  p {
    font-size: $fs-sm;
    color: rgba($alfii-cream, 0.82);
    max-width: 480px;
  }

  .final-btn {
    @include row(10px, center, center);
    width: 100%;
    max-width: 340px;
    padding: 16px 28px;
    border-radius: 14px;
    font-size: $fs-md;
    font-weight: $fw-bold;
    background-color: $alfii-red;
    color: $alfii-cream;
    box-shadow: 0 10px 28px rgba($alfii-red, 0.5);
  }

  .final-note {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.55);
  }
}

// ---------------------------------------------------------------------------
// 5. Footer y sticky
// ---------------------------------------------------------------------------
.footer {
  border-top: 1px solid rgba($alfii-cream, 0.08);
  background-color: rgba($alfii-plum, 0.4);
  padding: 36px clamp(16px, 4vw, 32px) 40px;

  .footer-inner {
    max-width: 1120px;
    margin: 0 auto;
    @include stack(14px, center);
    text-align: center;
  }

  .footer-claim {
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.55);
    max-width: 380px;
  }

  .footer-links {
    @include row(18px, center, center);
    flex-wrap: wrap;
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.75);
  }

  .footer-copy {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.45);
  }
}

.sticky-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  padding: 12px clamp(16px, 4vw, 32px);
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background-color: rgba($alfii-navy, 0.94);
  backdrop-filter: blur(18px);
  border-top: 1px solid rgba($alfii-cream, 0.12);
  animation: fadeInUp $dur-base $ease-out both;

  .sticky-inner {
    max-width: 1120px;
    margin: 0 auto;
    @include row(12px, center, space-between);
  }

  .sticky-info {
    @include row(10px, center);
    font-size: $fs-xs;
    font-weight: $fw-bold;
  }

  .sticky-btn {
    @include row(8px, center);
    padding: 11px 20px;
    border-radius: 12px;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    background-color: $alfii-red;
    color: $alfii-cream;
    box-shadow: 0 4px 16px rgba($alfii-red, 0.4);
  }
}
</style>
