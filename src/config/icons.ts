/**
 * Mapa central de iconos. Unica fuente de verdad de Font Awesome.
 * Ningun componente escribe fa-solid fa-brain a mano: usan BaseIcon name="subtext".
 */

export const ICON_MAP = {
  // Los 6 bloques del protocolo
  subtext: "fa-solid fa-brain",
  archetype: "fa-solid fa-fingerprint",
  risk: "fa-solid fa-triangle-exclamation",
  timing: "fa-regular fa-clock",
  scripts: "fa-solid fa-comment-dots",
  meters: "fa-solid fa-chart-line",

  // Medidores de operacion
  kiss: "fa-solid fa-kiss-wink-heart",
  firstDate: "fa-solid fa-champagne-glasses",
  firstNight: "fa-solid fa-fire",

  // Arquetipos
  "arq.KOAKUMA": "fa-solid fa-face-grin-wink",
  "arq.HIMEDERE": "fa-solid fa-crown",
  "arq.ONEE_SAN": "fa-solid fa-martini-glass",
  "arq.TSUN_KUUDERE": "fa-solid fa-snowflake",
  "arq.DEREDERE": "fa-solid fa-face-smile-beam",
  "arq.DANDERE": "fa-solid fa-user-ninja",
  "arq.YANDERE": "fa-solid fa-heart-crack",

  // Estilos de script
  "script.PODER": "fa-solid fa-chess-king",
  "script.CABALLERO": "fa-solid fa-user-tie",
  "script.PICARO": "fa-solid fa-masks-theater",

  // Niveles de riesgo
  "risk.LIMPIO": "fa-solid fa-shield-halved",
  "risk.VIGILAR": "fa-solid fa-eye",
  "risk.ALTO": "fa-solid fa-flag",
  "risk.ABORTAR": "fa-solid fa-ban",

  // Onboarding
  "step.PREFERRED_NAME": "fa-solid fa-user-pen",
  "step.BIRTH_DATE": "fa-solid fa-cake-candles",
  "step.STATUS": "fa-solid fa-briefcase",
  "step.ASSETS": "fa-solid fa-gem",
  "step.PHILOSOPHY": "fa-solid fa-scale-balanced",
  "step.PERSONALITY": "fa-solid fa-user-secret",

  // Acciones y navegacion
  vault: "fa-solid fa-house",
  plus: "fa-solid fa-plus",
  upload: "fa-solid fa-cloud-arrow-up",
  camera: "fa-solid fa-camera",
  image: "fa-solid fa-image",
  folder: "fa-solid fa-folder-open",
  history: "fa-solid fa-clock-rotate-left",
  copy: "fa-regular fa-copy",
  check: "fa-solid fa-check",
  settings: "fa-solid fa-gear",
  trash: "fa-solid fa-trash",
  back: "fa-solid fa-chevron-left",
  expand: "fa-solid fa-chevron-down",
  close: "fa-solid fa-xmark",
  spinner: "fa-solid fa-spinner",
  thinking: "fa-solid fa-circle-nodes",
  privacy: "fa-solid fa-user-shield",
  email: "fa-regular fa-envelope",
  key: "fa-solid fa-key",
  logout: "fa-solid fa-right-from-bracket",
  info: "fa-solid fa-circle-info",
  lightbulb: "fa-solid fa-lightbulb",
  forward: "fa-solid fa-forward",
  arrowUp: "fa-solid fa-arrow-up",
  arrowRight: "fa-solid fa-arrow-right",
  rotate: "fa-solid fa-rotate-right",
  bolt: "fa-solid fa-bolt",
  robot: "fa-solid fa-robot",
  userDoctor: "fa-solid fa-user-doctor",
  hand: "fa-solid fa-hand",
  handHoldingHeart: "fa-solid fa-hand-holding-heart",
  lifeRing: "fa-solid fa-life-ring",
  gavel: "fa-solid fa-gavel",
  fileContract: "fa-solid fa-file-contract",
  fileSignature: "fa-solid fa-file-signature",
  database: "fa-solid fa-database",
  cloud: "fa-solid fa-cloud",
  lock: "fa-solid fa-lock",
  listCheck: "fa-solid fa-list-check",
  earthAmericas: "fa-solid fa-earth-americas",
  earthEurope: "fa-solid fa-earth-europe",
  flagUsa: "fa-solid fa-flag-usa",
  flag: "fa-solid fa-flag",
  microchip: "fa-solid fa-microchip",

  // Plataformas
  "platform.whatsapp": "fa-brands fa-whatsapp",
  "platform.instagram": "fa-brands fa-instagram",
  "platform.telegram": "fa-brands fa-telegram",
  "platform.tinder": "fa-solid fa-fire",
  "platform.bumble": "fa-solid fa-comments",
  "platform.other": "fa-solid fa-comment-dots",
} as const;

export type IconName = keyof typeof ICON_MAP;
