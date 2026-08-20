import api from '@/services/http';

export type HerStatKey = 'AFE' | 'EXI' | 'INI' | 'JUE' | 'RIE' | 'RIT';

export interface HerMeters {
  kiss: number;
  firstDate: number;
  firstNight: number;
}

export interface HerCard {
  level: number;
  tagline: string;
  stats: { key: HerStatKey; label: string; value: number; hint: string }[];
  likes: string[];
  avoid: string[];
  hates: string[];
  winConditions: string[];
  specialMove: { name: string; description: string } | null;
  confidence: number;
  archetype: { primary: string; label: string } | null;
  generatedAt: string;
  version: number;
  stale: boolean;
  snapshot: {
    analysisCount: number;
    messageCount: number;
    stage: string;
    riskLevel: string;
    meters: HerMeters;
  };
}

export interface HerCardHistoryItem {
  index: number;
  generatedAt: string;
  level: number;
  tagline: string;
  confidence: number;
  stats: { key: HerStatKey; value: number }[];
  stage: string;
  riskLevel: string;
  meters: HerMeters;
  analysisCount: number;
  messageCount: number;
  card: HerCard;
}

export interface HerMilestone {
  key: 'firstDate' | 'firstKiss' | 'firstNight' | 'relationship';
  label: string;
  achieved: boolean;
  at: string | null;
}

export interface HerCardResponse {
  card: HerCard | null;
  reason: 'not_enough_evidence' | 'generation_failed' | null;
  history: HerCardHistoryItem[];
  milestones: HerMilestone[];
  metersHistory: (HerMeters & { at: string })[];
  hasNews: boolean;
  createdAt: string;
}

/** Ficha tecnica de ella. `refresh` fuerza una generacion nueva (cuesta un analisis). */
export async function getHerCard(targetId: string, refresh = false): Promise<HerCardResponse> {
  return api.get(`/targets/${targetId}/card${refresh ? '?refresh=1' : ''}`) as Promise<HerCardResponse>;
}
