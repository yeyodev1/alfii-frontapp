import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/http';

export type MilestoneKey = 'firstDate' | 'firstKiss' | 'firstNight' | 'relationship';

export interface TargetMilestone {
  key: MilestoneKey;
  label: string;
  achieved: boolean;
  at: string | null;
}

export interface TargetSummary {
  id: string;
  displayName: string;
  accentColor: string;
  avatarInitial: string;
  stage: string;
  /** Hitos declarados por el usuario. Mandan sobre los medidores: un hito
   *  cumplido es un hecho, el medidor solo una estimacion del modelo. */
  milestones: TargetMilestone[];
  /** Contexto sobre ella que declara el usuario. Entra al prompt del modelo. */
  herProfile: {
    howWeMet?: string;
    knownSinceMonths?: number;
    herAge?: number;
    herOccupation?: string;
    instagram?: string;
    relationshipGoal?: string;
    notes?: string;
  } | null;
  /** 6 campos que puntúan. `notes` no puntua a proposito: es opcional. */
  herCompleteness: { score: number; missing: string[] };
  archetype: { primary: string; label: string; hybrid: string[]; confidence: number } | null;
  risk: { level: string; transactionalRisk: number; flagCount: number };
  meters: { kiss: number; firstDate: number; firstNight: number };
  analysisCount: number;
  lastMessageAt?: string;
  recommendedDelayMinutes?: number | null;
}

export const useTargetStore = defineStore('target', () => {
  const targets = ref<TargetSummary[]>([]);
  const currentTarget = ref<any | null>(null);
  const loading = ref(false);

  async function fetchTargets() {
    loading.value = true;
    try {
      const res: any = await api.get('/targets');
      targets.value = res.targets;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTarget(id: string) {
    loading.value = true;
    try {
      const res: any = await api.get(`/targets/${id}`);
      currentTarget.value = res.target;
      return res.target;
    } finally {
      loading.value = false;
    }
  }

  async function confirmTarget(analysisId: string, displayName: string) {
    loading.value = true;
    try {
      const res: any = await api.post('/targets/confirm', { analysisId, displayName });
      await fetchTargets();
      return res.target;
    } finally {
      loading.value = false;
    }
  }

  async function deleteTarget(id: string) {
    loading.value = true;
    try {
      await api.delete(`/targets/${id}`);
      targets.value = targets.value.filter((t) => t.id !== id);
    } finally {
      loading.value = false;
    }
  }

  return { targets, currentTarget, loading, fetchTargets, fetchTarget, confirmTarget, deleteTarget };
});
