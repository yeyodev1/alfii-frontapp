/**
 * Cliente de la carta de poder (GET /me/card).
 * Sigue el patron de src/services/http.ts: el interceptor de respuesta ya
 * devuelve res.data, por eso aqui no se accede a .data otra vez.
 */
import api from '@/services/http';

export type PowerTier = 'BRONCE' | 'PLATA' | 'ORO' | 'LEYENDA';

export type PowerStatKey = 'MRC' | 'LEC' | 'TMG' | 'EST' | 'FIS' | 'CAL';

export interface PowerStat {
  key: PowerStatKey;
  label: string;
  value: number;
  hint: string;
}

export interface PowerLockedField {
  field: string;
  statKey: PowerStatKey;
  gain: number;
  question: string;
}

export interface PowerNextBest {
  field: string;
  gain: number;
  statKey: PowerStatKey;
}

export interface PowerCardData {
  overall: number;
  tier: PowerTier;
  position: string;
  positionLabel: string;
  stats: PowerStat[];
  completeness: number;
  locked: PowerLockedField[];
  nextBest: PowerNextBest | null;
}

/**
 * Trae la carta del usuario autenticado.
 * El cast es necesario porque axios tipa el retorno como AxiosResponse pero el
 * interceptor de http.ts lo reemplaza por el payload plano en runtime.
 */
export async function getMyCard(): Promise<PowerCardData> {
  const res = await api.get('/me/card');
  return res as unknown as PowerCardData;
}
