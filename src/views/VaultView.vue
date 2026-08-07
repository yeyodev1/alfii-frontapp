<script setup lang="ts">
import BaseIcon from '@/components/shared/BaseIcon.vue';
import RiskBadge from '@/components/shared/RiskBadge.vue';
import ProfileCompletenessBadge from '@/components/shared/ProfileCompletenessBadge.vue';
import NameConfirmSheet from '@/components/modals/NameConfirmSheet.vue';
import AuthSheet from '@/components/modals/AuthSheet.vue';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTargetStore } from '@/stores/target';
import { useAuthStore } from '@/stores/auth';
import { useModal } from '@/composables/useModal';
import api from '@/services/http';

import { useToastStore } from '@/stores/toast';

const router = useRouter();
const targetStore = useTargetStore();
const authStore = useAuthStore();
const { open } = useModal();
const toastStore = useToastStore();

const fileInput = ref<HTMLInputElement | null>(null);
const completeness = ref({ score: 0, impact: '' });

onMounted(async () => {
  await targetStore.fetchTargets();
  try {
    const comp: any = await api.get('/profile/completeness');
    completeness.value = comp;
  } catch {
    // Si falla, se queda en 0
  }
});

function triggerUpload() {
  fileInput.value?.click();
}

async function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  try {
    const formData = new FormData();
    formData.append('screenshot', file);

    const res: any = await api.post('/analyze/first', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    open('nameConfirm', NameConfirmSheet, {
      detectedName: res.detectedName || 'Ella',
      analysisId: res.analysisId,
      onConfirm: async (displayName: string) => {
        const confirmRes: any = await api.post('/targets/confirm', {
          analysisId: res.analysisId,
          displayName,
        });

        if (authStore.user?.isAnonymous) {
          const legalMeta: any = await api.get('/legal/meta');
          open('auth', AuthSheet, {
            legalVersion: legalMeta.version,
            onSuccess: () => {
              router.push(`/chat/${confirmRes.target.id}`);
            },
          });
        } else {
          router.push(`/chat/${confirmRes.target.id}`);
        }
      },
    });
  } catch (err: any) {
    toastStore.show(err.message || 'Error al procesar la captura', 'error');
  }
}
</script>

<template>
  <div class="vault-view">
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="handleFileSelected"
    />

    <header class="vault-header">
      <div class="header-main">
        <h1>Bóveda de expedientes</h1>
        <button class="add-btn" @click="triggerUpload">
          <BaseIcon name="plus" size="sm" color="cream" />
          <span>Nueva chica</span>
        </button>
      </div>

      <ProfileCompletenessBadge
        :score="completeness.score"
        :impact="completeness.impact"
        @click="router.push('/onboarding')"
      />
    </header>

    <!-- Lista de expedientes -->
    <div v-if="targetStore.loading" class="loading-state">
      <BaseIcon name="spinner" spin size="lg" color="cream" />
    </div>

    <div v-else-if="targetStore.targets.length === 0" class="empty-vault">
      <BaseIcon name="folder" size="2xl" color="muted" />
      <h3>No tienes expedientes guardados</h3>
      <p>Subes una captura y Alfii creará un expediente con la memoria acumulada de ella.</p>
      <button class="upload-cta" @click="triggerUpload">
        <BaseIcon name="upload" color="cream" size="base" />
        <span>Subir primera captura</span>
      </button>
    </div>

    <div v-else class="targets-list">
      <div
        v-for="t in targetStore.targets"
        :key="t.id"
        class="target-card"
        @click="router.push(`/chat/${t.id}`)"
      >
        <div class="card-left">
          <div class="avatar" :class="`accent-${t.accentColor}`">
            <span>{{ t.avatarInitial }}</span>
          </div>
        </div>

        <div class="card-main">
          <div class="card-top">
            <span class="name">{{ t.displayName }}</span>
            <RiskBadge :level="(t.risk.level as any)" />
          </div>

          <div class="card-details">
            <span class="arq" v-if="t.archetype">
              {{ t.archetype.label }}
            </span>
            <span class="stage">{{ t.stage }}</span>
          </div>

          <div class="card-meters">
            <span>Beso {{ t.meters.kiss }}%</span> ·
            <span>Cita {{ t.meters.firstDate }}%</span> ·
            <span>Noche {{ t.meters.firstNight }}%</span>
          </div>
        </div>

        <div class="card-right">
          <BaseIcon name="arrowRight" size="xs" color="muted" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.vault-view {
  @include stack(20px);
  padding: 24px clamp(16px, 4vw, 24px) 60px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.hidden-input { display: none; }

.vault-header {
  @include stack(12px);

  .header-main {
    @include row(0, center, space-between);

    h1 {
      font-size: $fs-xl;
      font-weight: $fw-bold;
      color: $alfii-cream;
    }

    .add-btn {
      @include row(6px);
      padding: 8px 12px;
      background-color: $alfii-red;
      color: $alfii-cream;
      font-size: $fs-xs;
      font-weight: $fw-bold;
      border-radius: 10px;
    }
  }
}

.loading-state, .empty-vault {
  padding: 60px 0;
  @include stack(12px, center);
  text-align: center;

  p {
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.6);
    max-width: 280px;
  }

  .upload-cta {
    @include row(8px);
    margin-top: 10px;
    padding: 12px 20px;
    background-color: $alfii-red;
    color: $alfii-cream;
    font-weight: $fw-bold;
    border-radius: 12px;
  }
}

.targets-list {
  @include stack(10px);
}

.target-card {
  @include card-surface;
  @include row(12px, center);
  cursor: pointer;
  transition: border-color $dur-fast $ease-out;

  &:hover {
    border-color: rgba($alfii-cream, 0.2);
  }

  .avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    @include center;
    font-size: $fs-md;
    font-weight: $fw-extrabold;
    color: $alfii-cream;

    &.accent-red { background-color: rgba($alfii-red, 0.3); border: 1px solid $alfii-red; }
    &.accent-sage { background-color: rgba($alfii-sage, 0.3); border: 1px solid $alfii-sage; }
    &.accent-cream { background-color: rgba($alfii-cream, 0.2); border: 1px solid $alfii-cream; }
    &.accent-plum { background-color: rgba($alfii-plum, 0.9); border: 1px solid rgba($alfii-cream, 0.2); }
    &.accent-navy { background-color: rgba($alfii-navy, 0.8); border: 1px solid rgba($alfii-cream, 0.2); }
  }

  .card-main {
    flex: 1;
    @include stack(4px);

    .card-top {
      @include row(8px, center, space-between);
      .name { font-size: $fs-md; font-weight: $fw-bold; color: $alfii-cream; }
    }

    .card-details {
      @include row(8px);
      font-size: $fs-xs;
      color: rgba($alfii-cream, 0.7);

      .arq { font-weight: $fw-semibold; color: $alfii-sage; }
    }

    .card-meters {
      font-size: $fs-2xs;
      color: rgba($alfii-cream, 0.5);
    }
  }
}
</style>
