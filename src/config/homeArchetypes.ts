/**
 * Los 7 arquetipos del producto, con su ficha completa para la landing.
 *
 * Mismo plantel que diagnostica la app (ARCHETYPES del backend). El contenido
 * vive aqui y no en los componentes: la Seleccion de Rival pinta las cartas y
 * el Dossier pinta la ficha, ambos desde esta unica fuente.
 */

export interface ArchetypeStats {
  /** Cuanto te pone a prueba (0-100). */
  testeo: number;
  /** Cuanto esconde lo que siente (0-100). */
  hermetismo: number;
  /** Riesgo de quemarte si juegas mal (0-100). */
  riesgo: number;
}

export interface HomeArchetype {
  key: string;
  name: string;
  tag: string;
  stars: number;
  /** Frase tipica de ella, reconocible al instante. */
  quote: string;
  /** Como juega: sus jugadas caracteristicas. */
  moves: string[];
  /** El plan: como se juega contra ella. */
  plan: string[];
  stats: ArchetypeStats;
  /** Aviso especial cuando aplica (solo alto riesgo). */
  warning?: string;
}

export const HOME_ARCHETYPES: HomeArchetype[] = [
  {
    key: 'koakuma',
    name: 'Koakuma',
    tag: 'Te prueba por deporte. Cada broma es un examen.',
    stars: 4,
    quote: '"jaja ya veremos si te lo ganas"',
    moves: [
      'Shit tests constantes disfrazados de broma: mide si te descolocas.',
      'Te da y te quita atención en el mismo día para ver cuál versión tuya aparece.',
      'Responde rápido a lo juguetón e ignora lo serio: premia el juego, castiga la necesidad.',
    ],
    plan: [
      'Nunca respondas el examen: responde el juego. La broma se sube, no se explica.',
      'Iguala su moneda: atención intermitente se paga con marco estable, no con reproches.',
      'El timing es tu arma — contestar tarde y con chispa vale más que rápido y plano.',
    ],
    stats: { testeo: 92, hermetismo: 55, riesgo: 48 },
  },
  {
    key: 'himedere',
    name: 'Himedere',
    tag: 'La princesa. Exige tributo antes de sonreír.',
    stars: 3,
    quote: '"es que yo no ando con cualquiera"',
    moves: [
      'Pone el listón alto de entrada: planes caros, estándares, comparaciones.',
      'Mide cuánto inviertes antes de dar nada: el tributo es su termómetro.',
      'Premia con migajas de exclusividad: "contigo sí salgo" es su jugada maestra.',
    ],
    plan: [
      'Tributo sí, sumisión no: invita bien una vez y deja claro que lo raro es que se repita.',
      'Compite en escasez: tu tiempo también es premium y ella tiene que sentirlo.',
      'Elogia lo que ella hace, no lo que ella es — a la princesa la sorprende el mérito.',
    ],
    stats: { testeo: 68, hermetismo: 40, riesgo: 60 },
  },
  {
    key: 'oneesan',
    name: 'Onee-san',
    tag: 'Mayor y de vuelta. Te lee antes de que hables.',
    stars: 4,
    quote: '"ay, qué tierno que lo intentes"',
    moves: [
      'Te deja hablar de más: cada palabra tuya es información que ella archiva.',
      'Condescendencia cariñosa para fijar la jerarquía sin pelear.',
      'Aparece y desaparece sin explicar: su agenda manda y lo sabes.',
    ],
    plan: [
      'Menos es más: frases cortas, cero autobiografía. Que archive intriga, no datos.',
      'Rompe el guion de "niño lindo": una opinión firme donde ella espera obediencia.',
      'No compitas por su agenda — sé el plan que no necesita esfuerzo para apetecer.',
    ],
    stats: { testeo: 74, hermetismo: 78, riesgo: 45 },
  },
  {
    key: 'tsunkuudere',
    name: 'Tsun-kuudere',
    tag: 'Fría por fuera. El deshielo se gana por turnos.',
    stars: 5,
    quote: '"no es que me importe, pero..."',
    moves: [
      'Respuestas de una palabra que no significan desinterés: significan prueba de paciencia.',
      'Pequeñas señales enterradas: un emoji suyo vale un párrafo de otra.',
      'Si avanzas rápido, retrocede el doble. El termostato lo controla ella.',
    ],
    plan: [
      'Lee las micro-señales, no el volumen: con ella el análisis de subtexto es oro puro.',
      'Avanza medio paso y espera el suyo: el deshielo es por turnos, no por asalto.',
      'Jamás le reproches la frialdad — es su armadura, y nombrarla la refuerza.',
    ],
    stats: { testeo: 60, hermetismo: 95, riesgo: 52 },
  },
  {
    key: 'deredere',
    name: 'Deredere',
    tag: 'Dulce y directa. El peligro es confiarse.',
    stars: 2,
    quote: '"me encantó verte 🥺 ¿cuándo repetimos?"',
    moves: [
      'Entusiasmo abierto y sin juegos: te dice lo que siente casi siempre.',
      'Responde rápido y propone ella: te acostumbra a lo fácil.',
      'Si te duermes en la comodidad, su interés se apaga sin drama y sin aviso.',
    ],
    plan: [
      'No confundas facilidad con partida ganada: el rival aquí eres tú y tu pereza.',
      'Mantén la iniciativa aunque no haga falta: ella premia al que sigue jugando.',
      'La escalada es tu responsabilidad — con ella el riesgo es quedarte en amigos por cómodo.',
    ],
    stats: { testeo: 22, hermetismo: 18, riesgo: 35 },
  },
  {
    key: 'dandere',
    name: 'Dandere',
    tag: 'Silenciosa. Cada palabra suya vale doble.',
    stars: 3,
    quote: '"...sí, estuvo bonito :)"',
    moves: [
      'Silencios largos que no son rechazo: son su ritmo natural.',
      'Nunca inicia, pero siempre contesta — y contesta con más de lo que parece.',
      'Se abre por capas: cada confidencia pequeña es un nivel desbloqueado.',
    ],
    plan: [
      'Tú llevas el ritmo sin ahogarla: preguntas concretas, espacio para responder.',
      'Trata cada detalle que suelta como el tesoro que es — ahí está el vínculo.',
      'Los planes tranquilos son tu cancha: con ella la discoteca es jugar en contra.',
    ],
    stats: { testeo: 30, hermetismo: 85, riesgo: 28 },
  },
  {
    key: 'yandere',
    name: 'Yandere',
    tag: 'Intensa de más. Radar de red flags al máximo.',
    stars: 5,
    quote: '"¿y esa quién es? vi que le diste like"',
    moves: [
      'Intensidad inmediata: en una semana ya eres "el amor de su vida".',
      'Vigilancia disfrazada de interés: sabe cosas que no le contaste.',
      'Prueba tus límites borrándolos de a poco: celos, control, culpa.',
    ],
    plan: [
      'Aquí Alfii no te enseña a ganar: te enseña a VER. El radar de red flags manda.',
      'Límites explícitos desde el inicio, y observa qué hace con ellos — eso es el diagnóstico.',
      'Si el patrón escala, la jugada maestra es salir de la partida. En serio.',
    ],
    stats: { testeo: 45, hermetismo: 35, riesgo: 97 },
    warning:
      'Con este arquetipo el objetivo no es la conquista: es tu protección. Alfii prioriza el radar de riesgo sobre los scripts.',
  },
];

/** Codigo del backend (KOAKUMA, TSUN_KUUDERE...) → ficha del plantel. */
export function archetypeByCode(code: string): HomeArchetype | null {
  const key = code.toLowerCase().replace(/_/g, '');
  return HOME_ARCHETYPES.find((a) => a.key === key) ?? null;
}
