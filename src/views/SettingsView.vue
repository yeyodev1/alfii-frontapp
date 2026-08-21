<script setup lang="ts">
import BaseIcon from '@/components/shared/BaseIcon.vue';
import ProfileCompletenessBadge from '@/components/shared/ProfileCompletenessBadge.vue';
import ConfirmModal from '@/components/modals/ConfirmModal.vue';
import ChangePasswordSheet from '@/components/modals/ChangePasswordSheet.vue';
import { ref, computed, onMounted } from 'vue';
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

// ---------------------------------------------------------------------------
// Correos y WhatsApp
// ---------------------------------------------------------------------------
const hasAccount = computed(() => !!authStore.user && !authStore.user.isAnonymous);
const prefs = computed(() => authStore.user?.emailPrefs ?? { reengagement: true, achievements: true });
const waJoined = computed(() => authStore.user?.whatsappWaitlist === true);
const savingPref = ref<string | null>(null);

async function setPref(key: 'reengagement' | 'achievements', value: boolean) {
  savingPref.value = key;
  try {
    const res: any = await api.patch('/me/email-prefs', { [key]: value });
    if (authStore.user) authStore.user.emailPrefs = res.emailPrefs;
    toastStore.show(value ? 'Correos activados.' : 'Listo, no te mandamos esos correos.', 'success');
  } catch (err: any) {
    toastStore.show(err.message || 'No pude guardar.', 'error');
  } finally {
    savingPref.value = null;
  }
}

async function setAllMail(value: boolean) {
  savingPref.value = 'all';
  try {
    const res: any = await api.patch('/me/email-prefs', { reengagement: value, achievements: value });
    if (authStore.user) authStore.user.emailPrefs = res.emailPrefs;
    toastStore.show(value ? 'Todos los correos activados.' : 'Te diste de baja de todos los correos.', 'success');
  } catch (err: any) {
    toastStore.show(err.message || 'No pude guardar.', 'error');
  } finally {
    savingPref.value = null;
  }
}

async function toggleWaitlist() {
  savingPref.value = 'wa';
  try {
    const res: any = await api.patch('/me/whatsapp-waitlist', { join: !waJoined.value });
    if (authStore.user) authStore.user.whatsappWaitlist = res.whatsappWaitlist;
    toastStore.show(res.whatsappWaitlist ? 'Te avisamos en cuanto Alfii esté en WhatsApp.' : 'Quitado de la lista.', 'success');
  } catch (err: any) {
    toastStore.show(err.message || 'No pude guardar.', 'error');
  } finally {
    savingPref.value = null;
  }
}

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

      <!-- Correos -->
      <section class="settings-card">
        <h3>Correos</h3>
        <p class="card-desc">
          Tú decides qué te escribimos. Los correos de seguridad (recuperar o cambiar contraseña) llegan siempre.
          Cada correo trae además un enlace para darte de baja con un clic, sin entrar a la app.
        </p>

        <p v-if="!hasAccount" class="card-desc anon-note">
          <BaseIcon name="info" size="xs" color="muted" /> Con sesión anónima no hay correo al que escribir. Crea una cuenta para gestionar esto.
        </p>

        <template v-else>
          <label class="pref-row" :class="{ on: prefs.reengagement }">
            <span class="pref-text">
              <strong>Recordatorios cuando llevas días sin entrar</strong>
              <small>Máximo 3 en toda la secuencia, espaciados. Nunca mencionan a nadie.</small>
            </span>
            <input type="checkbox" :checked="prefs.reengagement" :disabled="!!savingPref" @change="setPref('reengagement', ($event.target as HTMLInputElement).checked)" />
            <span class="switch"><BaseIcon v-if="savingPref === 'reengagement'" name="spinner" spin size="xs" color="cream" /></span>
          </label>

          <label class="pref-row" :class="{ on: prefs.achievements }">
            <span class="pref-text">
              <strong>Logros y subidas de categoría</strong>
              <small>Cuando tu carta sube de nivel o completas tu perfil.</small>
            </span>
            <input type="checkbox" :checked="prefs.achievements" :disabled="!!savingPref" @change="setPref('achievements', ($event.target as HTMLInputElement).checked)" />
            <span class="switch"><BaseIcon v-if="savingPref === 'achievements'" name="spinner" spin size="xs" color="cream" /></span>
          </label>

          <div class="action-buttons">
            <button v-if="prefs.reengagement || prefs.achievements" class="action-btn subtle" :disabled="!!savingPref" @click="setAllMail(false)">
              <BaseIcon name="logout" size="sm" color="cream" />
              <span>Desactivar todos los correos</span>
            </button>
            <button v-else class="action-btn" :disabled="!!savingPref" @click="setAllMail(true)">
              <BaseIcon name="rotate" size="sm" color="cream" />
              <span>Volver a activar los correos</span>
            </button>
          </div>
        </template>
      </section>

      <!-- WhatsApp (pronto) -->
      <section class="settings-card wa-card">
        <div class="wa-head">
          <span class="wa-icon"><BaseIcon name="platform.whatsapp" size="base" color="cream" /></span>
          <div>
            <span class="soon">Muy pronto</span>
            <h3>Alfii en WhatsApp, con el mismo contexto</h3>
          </div>
        </div>
        <p class="card-desc">
          Vas a poder escribirle a Alfii por WhatsApp y va a recordar exactamente lo mismo que aquí: tus expedientes,
          el historial de cada chica, las fotos y tus mejoras. Mismo Alfii, otro canal.
        </p>
        <template v-if="hasAccount">
          <label class="pref-row" :class="{ on: waJoined }">
            <span class="pref-text">
              <strong>Avísame cuando esté disponible</strong>
              <small>Un solo correo el día que se active, y acceso anticipado.</small>
            </span>
            <input type="checkbox" :checked="waJoined" :disabled="!!savingPref" @change="toggleWaitlist" />
            <span class="switch"><BaseIcon v-if="savingPref === 'wa'" name="spinner" spin size="xs" color="cream" /></span>
          </label>
        </template>
        <p v-else class="card-desc anon-note">
          <BaseIcon name="info" size="xs" color="muted" /> Crea una cuenta para que podamos avisarte.
        </p>
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
  max-width: 880px;
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

// Filas con interruptor (correos / WhatsApp)
.pref-row {
  @include row(12px, center);
  position: relative;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba($alfii-cream, 0.12);
  background-color: rgba($alfii-navy, 0.35);
  cursor: pointer;
  transition: border-color $dur-fast $ease-out;
  &.on { border-color: rgba($alfii-sage, 0.6); }
  input { position: absolute; opacity: 0; pointer-events: none; }
  .pref-text { @include stack(3px); flex: 1; min-width: 0; strong { font-size: $fs-sm; } small { font-size: $fs-2xs; color: rgba($alfii-cream, 0.55); line-height: $lh-relaxed; } }
  .switch {
    @include center; flex-shrink: 0; width: 46px; height: 26px; border-radius: 999px; position: relative;
    background-color: rgba($alfii-cream, 0.15); transition: background-color $dur-fast $ease-out;
    &::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background-color: $alfii-cream; transition: transform $dur-base $ease-spring; }
  }
  &.on .switch { background-color: $alfii-sage; &::after { transform: translateX(20px); } }
}
.anon-note { @include row(6px, flex-start); }
.action-btn.subtle { opacity: 0.8; }

.wa-card {
  border-color: rgba(#25d366, 0.35);
  background: linear-gradient(150deg, rgba(#25d366, 0.1), transparent 60%);
  .wa-head { @include row(12px, center); .wa-icon { @include center; width: 44px; height: 44px; border-radius: 50%; background-color: rgba(#25d366, 0.35); flex-shrink: 0; } .soon { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: $fw-bold; color: #25d366; } h3 { margin-top: 2px; } }
}
</style>
