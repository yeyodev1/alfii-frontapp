<script setup lang="ts">
import BaseIcon from '@/components/shared/BaseIcon.vue';
import ProfileCompletenessBadge from '@/components/shared/ProfileCompletenessBadge.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import ChangePasswordSheet from '@/components/modals/ChangePasswordSheet.vue';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useModal } from '@/composables/useModal';
import { useToastStore } from '@/stores/toast';
import api from '@/services/http';

const router = useRouter();
const authStore = useAuthStore();
const { open } = useModal();
const toastStore = useToastStore();
const completeness = ref({ score: 0, impact: '' });

function openChangePassword() {
  open('change-password', ChangePasswordSheet);
}

onMounted(async () => {
  try {
    const comp: any = await api.get('/profile/completeness');
    completeness.value = comp;
  } catch {
    // Si falla
  }
});

async function handleExport() {
  window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api'}/privacy/export`, '_blank');
}

function handleLogout() {
  open('confirmLogout', ConfirmModal, {
    title: '¿Cerrar sesión?',
    message: 'Volverás a la pantalla de inicio. Tu historial sigue guardado y lo recuperas al entrar de nuevo.',
    onConfirm: () => {
      authStore.logout();
      toastStore.show('Sesión cerrada.', 'success');
      router.push('/');
    },
  });
}

async function handlePurge() {
  open('confirmPurge', ConfirmModal, {
    title: '¿Borrar todo tu historial?',
    message: 'Esta acción es permanente y no reversible. Se eliminarán todos tus expedientes, análisis, historial de chat y perfil.',
    danger: true,
    onConfirm: async () => {
      try {
        await api.delete('/account/purge');
        authStore.logout();
        toastStore.show('Todo tu historial ha sido eliminado.', 'success');
        router.push('/');
      } catch (err: any) {
        toastStore.show(err.message || 'Error al eliminar cuenta', 'error');
      }
    },
  });
}
</script>

<template>
  <div class="settings-view">
    <header class="settings-header">
      <h1>Ajustes y Privacidad</h1>
    </header>

    <div class="settings-content">
      <!-- Estado de la cuenta -->
      <section class="settings-card">
        <h3>Tu cuenta</h3>
        <p class="account-email" v-if="authStore.user?.email">
          {{ authStore.user.email }}
        </p>
        <p class="account-email anon" v-else>
          Sesión anónima (sin registrar)
        </p>

        <ProfileCompletenessBadge
          :score="completeness.score"
          :impact="completeness.impact"
          @click="router.push('/onboarding')"
        />

        <!-- Solo con cuenta: una sesion anonima no tiene contrasena que cambiar -->
        <div v-if="authStore.user?.email" class="action-buttons">
          <button class="action-btn" @click="openChangePassword">
            <BaseIcon name="key" size="sm" color="cream" />
            <span>Cambiar contraseña</span>
          </button>

          <button class="action-btn" @click="handleLogout">
            <BaseIcon name="logout" size="sm" color="cream" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </section>

      <!-- Privacidad y Derechos -->
      <section class="settings-card">
        <h3>Privacidad e Historial</h3>
        <p class="card-desc">
          Tus capturas nunca se almacenan. Puedes exportar o borrar todo tu historial en cualquier momento.
        </p>

        <div class="action-buttons">
          <button class="action-btn" @click="handleExport">
            <BaseIcon name="cloud" size="sm" color="cream" />
            <span>Exportar mis datos (JSON)</span>
          </button>

          <RouterLink to="/legal" class="action-btn">
            <BaseIcon name="fileContract" size="sm" color="cream" />
            <span>Ver aviso legal y términos</span>
          </RouterLink>
        </div>
      </section>

      <!-- Zona de peligro -->
      <section class="settings-card danger-zone">
        <h3>Zona de peligro</h3>
        <p class="card-desc">
          Borra de forma permanente todos tus expedientes, análisis, historial de chat y perfil.
        </p>

        <button class="purge-btn" @click="handlePurge">
          <BaseIcon name="trash" size="sm" color="red" />
          <span>Borrar todo mi historial</span>
        </button>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.settings-view {
  @include stack(20px);
  padding: 24px clamp(16px, 4vw, 24px) 60px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.settings-header {
  h1 { font-size: $fs-xl; font-weight: $fw-bold; color: $alfii-cream; }
}

.settings-content {
  @include stack(16px);
}

.settings-card {
  @include card-surface;
  @include stack(12px);

  h3 { font-size: $fs-md; font-weight: $fw-bold; color: $alfii-cream; }
  .card-desc { font-size: $fs-xs; color: rgba($alfii-cream, 0.7); line-height: $lh-relaxed; }
  .account-email { font-size: $fs-sm; font-weight: $fw-semibold; color: $alfii-sage; }
  .account-email.anon { color: $alfii-red; }
}

.action-buttons {
  @include stack(8px);
}

.action-btn {
  @include row(10px);
  padding: 12px 16px;
  background-color: rgba($alfii-navy, 0.5);
  border: 1px solid rgba($alfii-cream, 0.1);
  border-radius: 10px;
  font-size: $fs-xs;
  font-weight: $fw-medium;
  color: $alfii-cream;

  &:hover { border-color: rgba($alfii-cream, 0.2); }
}

.danger-zone {
  border-color: rgba($alfii-red, 0.3);

  .purge-btn {
    @include row(8px, center, center);
    width: 100%;
    padding: 14px;
    background-color: rgba($alfii-red, 0.15);
    border: 1px solid rgba($alfii-red, 0.4);
    border-radius: 10px;
    color: $alfii-cream;
    font-size: $fs-xs;
    font-weight: $fw-bold;
  }
}
</style>
