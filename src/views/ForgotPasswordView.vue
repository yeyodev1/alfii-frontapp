<script setup lang="ts">
/**
 * Recuperar contrasena (/recuperar).
 *
 * Esta pantalla NO confirma ni desmiente si un correo tiene cuenta en alfii.
 * Responder distinto segun exista o no la convertiria en un buscador: cualquiera
 * podria escribir el correo de un conocido y averiguar que usa la app. Por eso
 * el backend devuelve 200 siempre y aqui se pinta el mismo mensaje pase lo que
 * pase.
 */
import { ref } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import api from '@/services/http';

const email = ref('');
const sent = ref(false);
const submitting = ref(false);
const errorMsg = ref('');

async function handleSubmit() {
  if (submitting.value) return;
  errorMsg.value = '';
  submitting.value = true;
  try {
    await api.post('/auth/forgot-password', { email: email.value.trim() });
    sent.value = true;
  } catch {
    // El endpoint responde 200 aunque la cuenta no exista, asi que llegar aqui
    // solo puede ser un fallo de red o un limite de peticiones. Se avisa sin
    // mencionar la cuenta para no filtrar nada por la puerta de atras.
    errorMsg.value = 'No pudimos enviar el correo ahora mismo. Intenta de nuevo en un momento.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="forgot-view">
    <div class="forgot-card">
      <template v-if="!sent">
        <header class="card-header">
          <span class="header-icon">
            <BaseIcon name="key" color="red" size="xl" />
          </span>
          <h1 class="card-title">¿Olvidaste tu contraseña?</h1>
          <p class="card-lead">
            Escribe el correo con el que guardaste tu cuenta y te mandamos un enlace para
            crear una nueva.
          </p>
        </header>

        <form class="forgot-form" @submit.prevent="handleSubmit">
          <div class="input-group">
            <label for="forgot-email">Correo electrónico</label>
            <input
              id="forgot-email"
              v-model="email"
              type="email"
              placeholder="tu@correo.com"
              required
              autocomplete="email"
            />
          </div>

          <div v-if="errorMsg" class="error-banner">
            <BaseIcon name="risk" color="red" size="sm" />
            <span>{{ errorMsg }}</span>
          </div>

          <button type="submit" class="submit-btn" :disabled="submitting">
            <BaseIcon v-if="submitting" name="spinner" spin color="cream" size="base" />
            <span v-else>Enviarme el enlace</span>
          </button>
        </form>

        <p class="privacy-note">
          <BaseIcon name="privacy" color="muted" size="sm" />
          <span>
            No te decimos si ese correo tiene cuenta o no. Es a propósito: así nadie puede
            usar esta pantalla para averiguar quién usa alfii.
          </span>
        </p>
      </template>

      <template v-else>
        <header class="card-header">
          <span class="header-icon is-sage">
            <BaseIcon name="email" color="sage" size="xl" />
          </span>
          <h1 class="card-title">Revisa tu correo</h1>
          <p class="card-lead">
            Si ese correo tiene cuenta, te llega un enlace en un minuto.
          </p>
        </header>

        <div class="info-block">
          <p>
            El enlace <strong>caduca en 1 hora</strong> y solo sirve una vez. Si tarda,
            mira también en spam o promociones.
          </p>
        </div>

        <button type="button" class="ghost-btn" @click="sent = false">
          Probar con otro correo
        </button>
      </template>

      <RouterLink to="/" class="back-link">
        <BaseIcon name="back" color="muted" size="sm" />
        <span>Volver al inicio</span>
      </RouterLink>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// Movil primero: una sola columna que ocupa el ancho util y respira poco.
.forgot-view {
  width: 100%;
  min-height: 100%;
  @include stack(0, center);
  justify-content: flex-start;
  padding: 32px 16px 48px;
  background-color: $alfii-navy;
}

.forgot-card {
  @include card-surface;
  @include stack(20px);
  width: 100%;
  max-width: 440px;
}

.card-header {
  @include stack(10px, center);
  text-align: center;
}

.header-icon {
  @include center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: rgba($alfii-red, 0.12);
  border: 1px solid rgba($alfii-red, 0.28);

  &.is-sage {
    background-color: rgba($alfii-sage, 0.14);
    border-color: rgba($alfii-sage, 0.35);
  }
}

.card-title {
  font-size: $fs-xl;
  font-weight: $fw-extrabold;
  color: $alfii-cream;
  line-height: $lh-tight;
}

.card-lead {
  font-size: $fs-sm;
  color: rgba($alfii-cream, 0.7);
  line-height: $lh-relaxed;
}

.forgot-form {
  @include stack(16px);
}

.input-group {
  @include stack(6px);

  label {
    font-size: $fs-xs;
    font-weight: $fw-medium;
    color: rgba($alfii-cream, 0.7);
  }

  input {
    width: 100%;
    padding: 14px 16px;
    background-color: rgba($alfii-navy, 0.6);
    border: 1px solid rgba($alfii-cream, 0.16);
    border-radius: 12px;
    font-size: $fs-base;
    color: $alfii-cream;

    &:focus {
      border-color: $alfii-red;
    }
  }
}

.error-banner {
  @include row(8px, flex-start);
  padding: 10px 14px;
  background-color: rgba($alfii-red, 0.15);
  border-radius: 8px;
  font-size: $fs-xs;
  color: $alfii-cream;
  line-height: $lh-base;
}

.submit-btn {
  width: 100%;
  padding: 16px;
  background-color: $alfii-red;
  color: $alfii-cream;
  font-weight: $fw-bold;
  font-size: $fs-md;
  border-radius: 12px;
  @include center;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
}

.ghost-btn {
  width: 100%;
  padding: 14px;
  border: 1px solid rgba($alfii-cream, 0.2);
  border-radius: 12px;
  font-size: $fs-sm;
  font-weight: $fw-semibold;
  color: rgba($alfii-cream, 0.85);
  @include center;
}

.info-block {
  padding: 14px 16px;
  background-color: rgba($alfii-navy, 0.5);
  border: 1px solid rgba($alfii-cream, 0.1);
  border-radius: 12px;

  p {
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.75);
    line-height: $lh-relaxed;
  }

  strong {
    color: $alfii-cream;
  }
}

.privacy-note {
  @include row(8px, flex-start);
  font-size: $fs-2xs;
  color: rgba($alfii-cream, 0.5);
  line-height: $lh-relaxed;
}

.back-link {
  @include row(6px, center, center);
  font-size: $fs-xs;
  font-weight: $fw-semibold;
  color: rgba($alfii-cream, 0.6);
  padding-top: 4px;
}

@media (min-width: 768px) {
  .forgot-view {
    padding: 64px 24px;
  }

  .card-title {
    font-size: $fs-2xl;
  }
}
</style>
