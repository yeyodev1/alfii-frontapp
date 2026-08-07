import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '@/services/http';

export interface TargetSummary {
  id: string;
  displayName: string;
  accentColor: string;
  avatarInitial: string;
  stage: string;
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
