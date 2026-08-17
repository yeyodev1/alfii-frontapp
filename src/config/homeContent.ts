import type { IconName } from '@/config/icons';

/**
 * Contenido del homepage.
 *
 * PORQUE fuera de la vista: HomeView era un archivo de 2400 lineas donde el
 * copy, la coreografia y el flujo de subida se estorbaban entre si. El texto
 * cambia cada semana; el codigo que lo pinta, casi nunca.
 */

export interface LiveCase {
  tag: string;
  hook: string;
  contact: string;
  thread: Array<{ from: string; text: string; time: string; flag?: boolean; live?: boolean }>;
  verdict: {
    subtext: string;
    archetype: string;
    confidence: number;
    timing: string;
    scriptStyle: string;
    script: string;
  };
  analysis: any;
}

export const liveCases: LiveCase[] = [
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

export const painPoints: { icon: IconName; text: string }[] = [
  { icon: 'subtext', text: 'Lees el mismo mensaje seis veces y sigues sin saber qué te quiso decir.' },
  { icon: 'timing', text: 'Respondes en dos segundos y te arrepientes antes de que salga el mensaje.' },
  { icon: 'thinking', text: 'Te deja en visto y no sabes si insistir o desaparecer.' },
  { icon: 'risk', text: 'Notas que algo no cuadra, pero no sabes ponerle nombre.' },
  { icon: 'scripts', text: 'Le preguntas a tu amigo, que improvisa exactamente igual que tú.' },
  { icon: 'history', text: 'Reescribes el mismo mensaje cuatro veces y acabas mandando el más soso.' },
];

export const deliverables: { icon: IconName; title: string; text: string }[] = [
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

export const comparison: { without: string; with: string }[] = [
  { without: 'Interpretas según tu estado de ánimo', with: 'Lectura del subtexto, no de tus nervios' },
  { without: 'Respondes cuando la ansiedad manda', with: 'Ventana de respuesta calculada' },
  { without: 'El mismo mensaje para todas', with: 'Script calibrado a su arquetipo y a tu estilo' },
  { without: 'Descubres la red flag tres meses tarde', with: 'Radar de riesgo desde la primera captura' },
  { without: 'Consejo de un amigo que sabe lo mismo', with: 'Criterio consistente, sin sesgo de tu círculo' },
];

export const faqs: { q: string; a: string }[] = [
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

/** Situaciones reales que rotan bajo el subtitulo del hero. */
export const heroTicker: string[] = [
  'un "yo te aviso"',
  'un visto de 8 horas',
  'un "jaja ya veremos"',
  'un shit test de disponibilidad',
  'un mensaje de madrugada',
];

/** Los seis entregables, como fichas contables antes de pedir nada. */
export const heroChips: string[] = [
  'Subtexto',
  'Arquetipo',
  'Red flags',
  'Timing exacto',
  '3 scripts listos',
  'Medidores',
];
