import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import api from '@/services/http';

// ---------------------------------------------------------------------------
// Contrato de POST /analyze/first y GET /analyses/:id
// Los scripts bloqueados llegan con text/rationale en null: el cliente NUNCA
// tiene el texto real hasta que el usuario se registra y se hace el refetch.
// ---------------------------------------------------------------------------

export type ScriptStyle = 'PODER' | 'CABALLERO' | 'PICARO';

export interface FirstAnalysisScript {
  style: ScriptStyle;
  text: string | null;
  rationale: string | null;
  locked: boolean;
  teaser?: string | null;
}

export interface FirstAnalysisSubtext {
  reading: string;
  frameDetected?: string | null;
  shitTestDetected?: boolean;
  shitTestType?: string | null;
}

export interface FirstAnalysisPayload {
  lead?: string | null;
  subtext: FirstAnalysisSubtext;
  archetypeDiagnosis?: {
    primary?: string;
    hybrid?: string[];
    confidence?: number;
    reasoning?: string;
  } | null;
  riskRadar?: {
    level?: string;
    transactionalRisk?: number;
    flags?: Array<{ code: string; description: string }>;
    userPostureCorrection?: string | null;
  } | null;
  timing?: {
    waitMinutes?: number;
    recommendedReadAt?: string | null;
    rationale?: string;
  } | null;
  meters?: { kiss?: number; firstDate?: number; firstNight?: number } | null;
  scripts: FirstAnalysisScript[];
}

export interface FirstAnalysisLock {
  scriptsLocked: number;
  reason: string;
  cta: string;
}

export interface FirstAnalysisResponse {
  analysisId: string;
  detectedName?: string | null;
  platform?: string | null;
  thread?: unknown;
  imageUrl?: string | null;
  analysis: FirstAnalysisPayload;
  locked?: FirstAnalysisLock | null;
  needsNameConfirmation?: boolean;
}

export interface ThreadMessage {
  from: 'him' | 'her';
  text: string;
  time: string | null;
}

// Se persiste en sessionStorage para que un F5 en /analisis no borre el valor
// que el usuario acaba de recibir. Es la pantalla que decide la conversion.
const STORAGE_KEY = 'alfii_first_analysis';

function readCache(): FirstAnalysisResponse | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FirstAnalysisResponse) : null;
  } catch {
    return null;
  }
}

// El backend puede nombrar los campos del hilo de varias formas segun el OCR.
// Normalizamos aqui para que la vista solo consuma una forma estable.
function normalizeThread(raw: unknown): ThreadMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): ThreadMessage | null => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const text = (row.text ?? row.message ?? row.content ?? '') as string;
      if (!text || typeof text !== 'string') return null;
      const sender = String(row.from ?? row.sender ?? row.speaker ?? 'her').toLowerCase();
      // Cualquier variante que signifique "el usuario" cae en him; el resto en her.
      const isHim = sender === 'him' || sender === 'me' || sender === 'user' || sender === 'yo';
      const time = (row.time ?? row.timestamp ?? null) as string | null;
      return { from: isHim ? 'him' : 'her', text, time: typeof time === 'string' ? time : null };
    })
    .filter((m): m is ThreadMessage => m !== null);
}

export const useFirstAnalysisStore = defineStore('firstAnalysis', () => {
  const data = ref<FirstAnalysisResponse | null>(readCache());
  const refreshing = ref(false);
  // targetId solo existe despues de confirmar el nombre de ella.
  const targetId = ref<string | null>(null);

  const hasData = computed(() => data.value !== null);
  const analysisId = computed(() => data.value?.analysisId ?? '');
  const detectedName = computed(() => data.value?.detectedName || 'Ella');
  const platform = computed(() => (data.value?.platform || 'other').toLowerCase());
  const thread = computed<ThreadMessage[]>(() => normalizeThread(data.value?.thread));
  const analysis = computed<FirstAnalysisPayload | null>(() => data.value?.analysis ?? null);
  const scripts = computed<FirstAnalysisScript[]>(() => data.value?.analysis?.scripts ?? []);
  const openScripts = computed(() => scripts.value.filter((s) => !s.locked));
  const lockedScripts = computed(() => scripts.value.filter((s) => s.locked));
  const lockedCount = computed(() => data.value?.locked?.scriptsLocked ?? lockedScripts.value.length);
  const isFullyUnlocked = computed(() => scripts.value.length > 0 && lockedScripts.value.length === 0);
  const needsNameConfirmation = computed(() => data.value?.needsNameConfirmation === true);

  function setFromUpload(res: FirstAnalysisResponse) {
    data.value = res;
    targetId.value = null;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(res));
    } catch {
      // Cuota llena o modo privado: la vista sigue funcionando en memoria.
    }
  }

  // Tras registrarse hay que volver a pedir el analisis: los scripts completos
  // solo viajan al cliente cuando el token ya no es anonimo.
  async function refetch() {
    if (!analysisId.value) return;
    refreshing.value = true;
    try {
      // Plural: la ruta real del backend es /analyses/:id. En singular devuelve
      // 404 y los scripts nunca se revelarian tras el registro.
      const res = (await api.get(`/analyses/${analysisId.value}`)) as Record<string, unknown>;
      const payload = (res.analysis ?? res) as FirstAnalysisPayload;
      const merged: FirstAnalysisResponse = {
        ...(data.value as FirstAnalysisResponse),
        ...(res as Partial<FirstAnalysisResponse>),
        analysis: payload,
        locked: null,
      };
      setFromUpload(merged);
    } finally {
      refreshing.value = false;
    }
  }

  function setTargetId(id: string) {
    targetId.value = id;
  }

  function reset() {
    data.value = null;
    targetId.value = null;
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Sin sessionStorage no hay nada que limpiar.
    }
  }

  return {
    data,
    refreshing,
    targetId,
    hasData,
    analysisId,
    detectedName,
    platform,
    thread,
    analysis,
    scripts,
    openScripts,
    lockedScripts,
    lockedCount,
    isFullyUnlocked,
    needsNameConfirmation,
    setFromUpload,
    refetch,
    setTargetId,
    reset,
  };
});
