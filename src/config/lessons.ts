import type { IconName } from '@/config/icons';

export interface LessonContent {
  id: string;
  title: string;
  icon: IconName;
  tagline: string;
  body: string[];
  actionHint: string;
}

export const LESSONS: Record<string, LessonContent> = {
  'shit-test': {
    id: 'shit-test',
    title: 'El "Shit Test" o prueba de marco',
    icon: 'subtext',
    tagline: 'No es un ataque. Es una medicion inconsciente.',
    body: [
      'Un shit test es un comentario, desafio o provocacion ligera donde ella mide tu nivel de seguridad y firmeza.',
      'Ocurre de forma casi siempre inconsciente: quiere comprobar si te descolocas, si te justificas, o si persigues.',
      'El error tipico es tomarselo literal o defenderte. La respuesta correcta es reencuadrar con humor, mantener el marco o devolver la provocacion con elegancia.',
    ],
    actionHint: 'Usa el script de Poder o Picaro cuando detectemos un shit test activo.',
  },
  marco: {
    id: 'marco',
    title: 'El Marco en la conversacion',
    icon: 'step.PHILOSOPHY',
    tagline: 'Quien establece la realidad domina la interaccion.',
    body: [
      'El marco es la realidad subyacente desde la que conversan dos personas. Quien busca la aprobacion del otro esta dentro del marco del otro.',
      'Un marco de alta valia subcomunica: "mi tiempo es valioso, mi vida avanza con o sin ti, y estoy evaluando si encajas en ella".',
      'Un marco de baja valia subcomunica: "dime que hacer para gustarte, estoy esperando por ti, perdon por molestar".',
    ],
    actionHint: 'Nunca respondas desde la necesidad. Un hombre enfocado proyecta mas que uno disponible.',
  },
  'riesgo-transaccional': {
    id: 'riesgo-transaccional',
    title: 'Riesgo Transaccional e Interes Instrumental',
    icon: 'risk',
    tagline: 'Atencion y favores a cambio de presencia vacia.',
    body: [
      'Ocurre cuando el interes de ella no es por ti como persona, sino por lo que resuelves: atencion, cenas, favores, estatus o validacion.',
      'Senales tipicas: solo aparece cuando necesita algo, desaparece cuando la conversacion no le beneficia, evita comprometerse con planes concretos.',
      'Alfii te advierte de inmediato si detecta este patron. Tu trabajo es no financiar interacciones donde no hay reciprocidad.',
    ],
    actionHint: 'Si el radar se pone en ALTO o ABORTAR, retira tu tiempo y atencion de inmediato.',
  },
  timing: {
    id: 'timing',
    title: 'La Estrategia del Tiempo',
    icon: 'timing',
    tagline: 'La prisa delata necesidad; la pausa comunica valor.',
    body: [
      'Responder al instante de forma sistematica subcomunica que no tienes nada mas importante que hacer que esperar su mensaje.',
      'Tardar horas de forma forzada o fingida se nota y resta fluidez. La clave es el equilibrio natural.',
      'Alfii calcula el delay estrategico basandose en el patron real de respuesta de ella, la hora del dia y el contenido del mensaje.',
    ],
    actionHint: 'Respeta el tiempo recomendado. El margen da espacio para que ella piense en ti.',
  },
  'activos-reales': {
    id: 'activos-reales',
    title: 'Activos Reales vs Personalidad Prestada',
    icon: 'step.ASSETS',
    tagline: 'Lo que se finge se cae en la primera cita.',
    body: [
      'Alfii trabaja exclusivamente con tus cualidades reales: tu estatus, tu inteligencia, tu estilo, tu fluidez o tu direccion de vida.',
      'Usar scripts o posturas que no encajan con tu estilo real genera incongruencia y se detecta en dos minutos cara a cara.',
      'La seguridad no es saber que le vas a gustar: es estar bien aunque no le gustes.',
    ],
    actionHint: 'Manten actualizada tu Matriz de Identidad para que los scripts suenen a ti.',
  },
  'lineas-rojas': {
    id: 'lineas-rojas',
    title: 'Lineas Rojas Innegociables',
    icon: 'step.PHILOSOPHY',
    tagline: 'Sin limites definidos no tienes valor, tienes disponibilidad.',
    body: [
      'Las lineas rojas son lo que NO toleras bajo ninguna circunstancia: falta de respeto, impuntualidad sistematica, juegos de celos o falta de palabra.',
      'El hombre que sabe lo que no acepta transmite mas firmeza que el que acepta todo por miedo a perder la oportunidad.',
      'Cuando ella cruza una linea roja, la respuesta no es una pelea: es comunicar el limite de forma serena y retirar tu atencion.',
    ],
    actionHint: 'Define tus limites en el onboarding y Alfii corregira tu postura cuando los pasen por alto.',
  },
};
