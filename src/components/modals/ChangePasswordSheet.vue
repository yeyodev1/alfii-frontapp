<script setup lang="ts">
/**
 * Hoja para cambiar la contrasena desde dentro de la sesion.
 *
 * Se abre con useModal desde cualquier vista:
 *
 *   import { useModal } from '@/composables/useModal';
 *   import ChangePasswordSheet from '@/components/modals/ChangePasswordSheet.vue';
 *   const { open } = useModal();
 *   open('change-password', ChangePasswordSheet);
 *
 * ModalHost engancha el evento `close` a modalStore.pop, asi que aqui basta con
 * emitirlo. `success` es opcional para que la vista refresque lo que necesite.
 */
import { computed, ref } from 'vue';
import BaseSheet from '@/components/modals/BaseSheet.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import api from '@/services/http';
import type { ApiError } from '@/services/http';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';

const MIN_LEN = 8;
const MAX_LEN = 128;

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'success'): void;
}>();

const authStore = useAuthStore();
const toastStore = useToastStore();

const currentPassword = ref('');
const newPassword = ref('');
const repeat = ref('');
const showPassword = ref(false);
const submitting = ref(false);
const errorMsg = ref('');

/**
 * Mismo medidor que la pantalla de nueva contrasena: largo en dos tramos mas
 * variedad de familias de caracteres. Sin libreria, porque el usuario solo
 * necesita saber si va justo o va sobrado.
 */
function scorePassword(value: string): number {
  if (!value) return 0;
  const families = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  let score = 0;
  if (value.length >= MIN_LEN) score += 1;
  if (value.length >= 12) score += 1;
  if (families >= 2) score += 1;
  if (families >= 3) score += 1;
  return score;
}

const strength = computed(() => scorePassword(newPassword.value));

// Solo rojo / crema / salvia: la paleta de marca no admite un sexto color.
const strengthLabel = computed(() => {
  if (!newPassword.value) return '';
  if (strength.value <= 1) return 'Débil';
  if (strength.value === 2) return 'Aceptable';
  if (strength.value === 3) return 'Buena';
  return 'Fuerte';
});

const strengthTone = computed(() => {
  if (strength.value <= 1) return 'tone-weak';
  if (strength.value === 2) return 'tone-mid';
  return 'tone-strong';
});

const tooShort = computed(
  () => newPassword.value.length > 0 && newPassword.value.length < MIN_LEN
);
const mismatch = computed(() => repeat.value.length > 0 && repeat.value !== newPassword.value);

// Se bloquea repetir la actual en cliente: el backend igual la rechazaria, pero
// esperar a un viaje de red para decir algo tan obvio se siente roto.
const sameAsCurrent = computed(
  () => newPassword.value.length > 0 && newPassword.value === currentPassword.value
);

const canSubmit = computed(
  () =>
    !submitting.value &&
    currentPassword.value.length > 0 &&
    newPassword.value.length >= MIN_LEN &&
    newPassword.value.length <= MAX_LEN &&
    newPassword.value === repeat.value &&
    !sameAsCurrent.value
);

async function handleSubmit() {
  if (!canSubmit.value) return;
  errorMsg.value = '';
  submitting.value = true;
  try {
    const res: any = await api.post('/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
    });

    // El backend rota el token al cambiar la contrasena: si no se guarda el
    // nuevo, la sesion se cae en la siguiente peticion. El store no expone
    // setToken, asi que se replica lo que hacen login/register.
    localStorage.setItem('alfii_token', res.token);
    authStore.token = res.token;
    authStore.user = res.user;

    toastStore.show(
      'Contraseña actualizada. Te hemos enviado un correo de confirmación a tu cuenta.',
      'success',
      6000
    );
    emit('success');
    emit('close');
  } catch (err) {
    const apiErr = err as ApiError;
    errorMsg.value =
      apiErr.status === 401
        ? 'Tu contraseña actual no es esa. Vuelve a escribirla.'
        : apiErr.message || 'No pudimos cambiar tu contraseña. Intenta de nuevo.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <BaseSheet title="Cambiar contraseña" @close="emit('close')">
    <form class="change-password" @submit.prevent="handleSubmit">
      <div class="intro-box">
        <BaseIcon name="lock" color="red" size="base" />
        <p>
          Al guardarla cerramos el resto de sesiones y te avisamos por correo. Mínimo
          {{ MIN_LEN }} caracteres.
        </p>
      </div>

      <div class="input-group">
        <div class="label-row">
          <label for="cp-current">Contraseña actual</label>
          <button type="button" class="reveal-btn" @click="showPassword = !showPassword">
            {{ showPassword ? 'Ocultar' : 'Ver' }}
          </button>
        </div>
        <input
          id="cp-current"
          v-model="currentPassword"
          :type="showPassword ? 'text' : 'password'"
          placeholder="La que usas ahora"
          required
          :maxlength="MAX_LEN"
          autocomplete="current-password"
        />
      </div>

      <div class="input-group">
        <label for="cp-new">Nueva contraseña</label>
        <input
          id="cp-new"
          v-model="newPassword"
          :type="showPassword ? 'text' : 'password'"
          placeholder="Mínimo 8 caracteres"
          required
          :minlength="MIN_LEN"
          :maxlength="MAX_LEN"
          autocomplete="new-password"
        />

        <div v-if="newPassword" class="strength" :class="strengthTone">
          <div class="strength-bars">
            <span
              v-for="step in 4"
              :key="step"
              class="bar"
              :class="{ 'is-on': step <= strength }"
            ></span>
          </div>
          <span class="strength-label">{{ strengthLabel }}</span>
        </div>

        <p v-if="tooShort" class="field-hint">
          Te faltan {{ MIN_LEN - newPassword.length }} caracteres.
        </p>
        <p v-else-if="sameAsCurrent" class="field-hint">
          Esa es la que ya tienes. Elige una distinta.
        </p>
      </div>

      <div class="input-group">
        <label for="cp-repeat">Repite la nueva</label>
        <input
          id="cp-repeat"
          v-model="repeat"
          :type="showPassword ? 'text' : 'password'"
          placeholder="La misma otra vez"
          required
          :maxlength="MAX_LEN"
          autocomplete="new-password"
        />
        <p v-if="mismatch" class="field-hint">Las dos contraseñas no coinciden.</p>
        <p v-else-if="repeat && !mismatch" class="field-hint is-ok">
          <BaseIcon name="check" color="sage" size="xs" />
          <span>Coinciden.</span>
        </p>
      </div>

      <div v-if="errorMsg" class="error-banner">
        <BaseIcon name="risk" color="red" size="sm" />
        <span>{{ errorMsg }}</span>
      </div>

      <button type="submit" class="submit-btn" :disabled="!canSubmit">
        <BaseIcon v-if="submitting" name="spinner" spin color="cream" size="base" />
        <span v-else>Guardar contraseña</span>
      </button>
    </form>
  </BaseSheet>
</template>

<style lang="scss" scoped>
.change-password {
  @include stack(16px);
}

.intro-box {
  @include row(10px, flex-start);
  padding: 14px 16px;
  background-color: rgba($alfii-red, 0.08);
  border: 1px solid rgba($alfii-red, 0.2);
  border-radius: 14px;

  p {
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.75);
    line-height: $lh-relaxed;
  }
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

.label-row {
  @include row(12px, center, space-between);
}

.reveal-btn {
  font-size: $fs-2xs;
  font-weight: $fw-bold;
  color: rgba($alfii-cream, 0.65);
  text-decoration: underline;
}

.strength {
  @include row(10px, center, space-between);
  padding-top: 2px;

  .strength-bars {
    @include row(4px);
    flex: 1;
  }

  .bar {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background-color: rgba($alfii-cream, 0.12);
    transition: background-color $dur-fast $ease-out;
  }

  .strength-label {
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    min-width: 62px;
    text-align: right;
  }

  &.tone-weak {
    .bar.is-on { background-color: $alfii-red; }
    .strength-label { color: $alfii-red; }
  }

  &.tone-mid {
    .bar.is-on { background-color: rgba($alfii-cream, 0.75); }
    .strength-label { color: rgba($alfii-cream, 0.75); }
  }

  &.tone-strong {
    .bar.is-on { background-color: $alfii-sage; }
    .strength-label { color: $alfii-sage; }
  }
}

.field-hint {
  @include row(6px, center);
  font-size: $fs-2xs;
  color: rgba($alfii-red, 0.9);

  &.is-ok {
    color: $alfii-sage;
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
    opacity: 0.5;
    cursor: default;
  }
}

@media (min-width: 768px) {
  .intro-box p {
    font-size: $fs-sm;
  }
}
</style>
