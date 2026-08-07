<script setup lang="ts">
import BaseSheet from '@/components/modals/BaseSheet.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  legalVersion: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success'): void;
}>();

const authStore = useAuthStore();
const isLogin = ref(false);
const email = ref('');
const password = ref('');
const confirm18 = ref(false);
const errorMsg = ref('');
const submitting = ref(false);

async function handleSubmit() {
  errorMsg.value = '';
  submitting.value = true;
  try {
    if (isLogin.value) {
      await authStore.login(email.value, password.value);
    } else {
      await authStore.register({
        email: email.value,
        password: password.value,
        confirm18: confirm18.value,
        legalVersion: props.legalVersion,
      });
    }
    emit('success');
    emit('close');
  } catch (err: any) {
    errorMsg.value = err.message || 'Ocurrió un error. Intenta de nuevo.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BaseSheet :title="isLogin ? 'Iniciar sesión' : 'Este análisis ya es tuyo'" @close="$emit('close')">
    <div class="auth-sheet">
      <div v-if="!isLogin" class="pitch-box">
        <p class="pitch-lead">Para no perder el expediente de ella necesito exactamente dos cosas:</p>
        <div class="field-item">
          <BaseIcon name="email" color="red" size="base" />
          <span>Un correo electrónico</span>
        </div>
        <div class="field-item">
          <BaseIcon name="key" color="red" size="base" />
          <span>Una contraseña</span>
        </div>
        <p class="pitch-disclaimer">
          No te pido tu nombre legal, ni tu teléfono, ni tu tarjeta de crédito. Nada más que esto.
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="input-group">
          <label>Correo electrónico</label>
          <input
            v-model="email"
            type="email"
            placeholder="tu@correo.com"
            required
            autocomplete="email"
          />
        </div>

        <div class="input-group">
          <label>Contraseña</label>
          <input
            v-model="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            required
            minlength="8"
            autocomplete="current-password"
          />
        </div>

        <div v-if="!isLogin" class="legal-checkbox">
          <label class="checkbox-container">
            <input type="checkbox" v-model="confirm18" required />
            <span class="checkmark"></span>
            <span class="label-text">
              Confirmo que tengo <strong>18 años o más</strong> y acepto los
              <RouterLink to="/legal" target="_blank" class="link">Términos, Privacidad y Descargo</RouterLink>.
            </span>
          </label>
        </div>

        <div v-if="errorMsg" class="error-banner">
          <BaseIcon name="risk" color="red" size="sm" />
          <span>{{ errorMsg }}</span>
        </div>

        <button type="submit" class="submit-btn" :disabled="submitting">
          <BaseIcon v-if="submitting" name="spinner" spin color="cream" size="base" />
          <span v-else>{{ isLogin ? 'Entrar' : 'Guardar mi cuenta' }}</span>
        </button>
      </form>

      <div class="toggle-mode">
        <button type="button" @click="isLogin = !isLogin">
          {{ isLogin ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Inicia sesión' }}
        </button>
      </div>
    </div>
  </BaseSheet>
</template>

<style lang="scss" scoped>
.auth-sheet {
  @include stack(20px);
}

.pitch-box {
  @include stack(12px);
  padding: 16px;
  background-color: rgba($alfii-red, 0.08);
  border-radius: 14px;
  border: 1px solid rgba($alfii-red, 0.2);

  .pitch-lead {
    font-size: $fs-sm;
    font-weight: $fw-semibold;
    color: $alfii-cream;
  }

  .field-item {
    @include row(10px);
    font-size: $fs-sm;
    font-weight: $fw-medium;
    color: $alfii-cream;
  }

  .pitch-disclaimer {
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.6);
    line-height: $lh-relaxed;
  }
}

.auth-form {
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

.legal-checkbox {
  .checkbox-container {
    @include row(10px, flex-start);
    cursor: pointer;
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.8);
    line-height: $lh-relaxed;

    input {
      display: none;

      &:checked + .checkmark {
        background-color: $alfii-red;
        border-color: $alfii-red;

        &::after {
          display: block;
        }
      }
    }

    .checkmark {
      width: 20px;
      height: 20px;
      min-width: 20px;
      border: 2px solid rgba($alfii-cream, 0.3);
      border-radius: 6px;
      position: relative;
      margin-top: 2px;

      &::after {
        content: '';
        position: absolute;
        display: none;
        left: 6px;
        top: 2px;
        width: 5px;
        height: 10px;
        border: solid $alfii-cream;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }

    .link {
      color: $alfii-red;
      text-decoration: underline;
    }
  }
}

.error-banner {
  @include row(8px);
  padding: 10px 14px;
  background-color: rgba($alfii-red, 0.15);
  border-radius: 8px;
  font-size: $fs-xs;
  color: $alfii-cream;
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
}

.toggle-mode {
  text-align: center;
  button {
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.6);
    text-decoration: underline;
  }
}
</style>
