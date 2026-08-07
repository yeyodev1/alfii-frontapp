<script setup lang="ts">
/**
 * Nueva contrasena (/nueva-contrasena?token=XXXX).
 *
 * El correo de recuperacion apunta aqui con el token en la query. El token vive
 * 1 hora y se quema al usarlo, asi que el caso "caducado" no es raro: es el
 * segundo camino mas probable despues del exito, y por eso tiene su propio
 * bloque explicativo en vez de un texto de error suelto.
 */
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import api from '@/services/http';
import type { ApiError } from '@/services/http';
import { useAuthStore } from '@/stores/auth';

const MIN_LEN = 8;
const MAX_LEN = 128;

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// El token puede llegar repetido en la query; vue-router lo entrega como array.
const token = computed(() => {
  const raw = route.query.token;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' ? value.trim() : '';
});

const password = ref('');
const repeat = ref('');
const showPassword = ref(false);
const submitting = ref(false);
const errorMsg = ref('');
const tokenBurned = ref(false);

/**
 * Medidor de fuerza hecho a mano.
 *
 * No se trae una libreria para esto: son cuatro reglas que caben en diez lineas
 * y el usuario solo necesita saber si va justo o va sobrado, no una entropia
 * exacta. Puntua largo (dos tramos) y variedad de familias de caracteres.
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

const strength = computed(() => scorePassword(password.value));

// Solo rojo / crema / salvia: la paleta no tiene ambar ni naranja y no se
// inventa un sexto color solo para el escalon intermedio.
const strengthLabel = computed(() => {
  if (!password.value) return '';
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

const tooShort = computed(() => password.value.length > 0 && password.value.length < MIN_LEN);
const mismatch = computed(() => repeat.value.length > 0 && repeat.value !== password.value);
const canSubmit = computed(
  () =>
    !submitting.value &&
    password.value.length >= MIN_LEN &&
    password.value.length <= MAX_LEN &&
    password.value === repeat.value
);

async function handleSubmit() {
  if (!canSubmit.value) return;
  errorMsg.value = '';
  submitting.value = true;
  try {
    const res: any = await api.post('/auth/reset-password', {
      token: token.value,
      password: password.value,
    });

    // El store no expone setToken en su API publica, asi que se replica lo que
    // hacen login/register: primero localStorage, que es de donde lee el
    // interceptor de axios, y despues el estado reactivo.
    localStorage.setItem('alfii_token', res.token);
    authStore.token = res.token;
    authStore.user = res.user;

    router.push('/heroe');
  } catch (err) {
    const apiErr = err as ApiError;
    if (apiErr.details?.reason === 'invalid_reset_token') {
      tokenBurned.value = true;
    } else {
      errorMsg.value = apiErr.message || 'No pudimos cambiar tu contraseña. Intenta de nuevo.';
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="reset-view">
    <div class="reset-card">
      <!-- Sin token no hay nada que intentar: el formulario ni se pinta. -->
      <template v-if="!token">
        <header class="card-header">
          <span class="header-icon">
            <BaseIcon name="close" color="red" size="xl" />
          </span>
          <h1 class="card-title">Este enlace está incompleto</h1>
          <p class="card-lead">
            Falta el código de seguridad. Suele pasar cuando el correo se copia a mano o el
            gestor de correo corta el enlace en dos líneas.
          </p>
        </header>
        <RouterLink to="/recuperar" class="submit-btn as-link">
          <span>Pedir un enlace nuevo</span>
          <BaseIcon name="arrowRight" color="cream" size="sm" />
        </RouterLink>
      </template>

      <!-- Token quemado o vencido: mismo callejon, misma salida. -->
      <template v-else-if="tokenBurned">
        <header class="card-header">
          <span class="header-icon">
            <BaseIcon name="timing" color="red" size="xl" />
          </span>
          <h1 class="card-title">El enlace ya no sirve</h1>
          <p class="card-lead">
            Los enlaces de recuperación duran <strong>1 hora</strong> y se gastan al usarlos.
            Si tardaste un poco o ya lo abriste antes, pide otro: tarda un minuto.
          </p>
        </header>
        <RouterLink to="/recuperar" class="submit-btn as-link">
          <span>Pedir un enlace nuevo</span>
          <BaseIcon name="arrowRight" color="cream" size="sm" />
        </RouterLink>
      </template>

      <template v-else>
        <header class="card-header">
          <span class="header-icon">
            <BaseIcon name="lock" color="red" size="xl" />
          </span>
          <h1 class="card-title">Crea tu nueva contraseña</h1>
          <p class="card-lead">
            Mínimo {{ MIN_LEN }} caracteres. Al guardarla entras directo a tu cuenta.
          </p>
        </header>

        <form class="reset-form" @submit.prevent="handleSubmit">
          <div class="input-group">
            <div class="label-row">
              <label for="reset-password">Nueva contraseña</label>
              <button type="button" class="reveal-btn" @click="showPassword = !showPassword">
                {{ showPassword ? 'Ocultar' : 'Ver' }}
              </button>
            </div>
            <input
              id="reset-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Mínimo 8 caracteres"
              required
              :minlength="MIN_LEN"
              :maxlength="MAX_LEN"
              autocomplete="new-password"
            />

            <div v-if="password" class="strength" :class="strengthTone">
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
              Te faltan {{ MIN_LEN - password.length }} caracteres.
            </p>
          </div>

          <div class="input-group">
            <label for="reset-repeat">Repite la contraseña</label>
            <input
              id="reset-repeat"
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
            <span v-else>Guardar y entrar</span>
          </button>
        </form>
      </template>

      <RouterLink to="/" class="back-link">
        <BaseIcon name="back" color="muted" size="sm" />
        <span>Volver al inicio</span>
      </RouterLink>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.reset-view {
  width: 100%;
  min-height: 100%;
  @include stack(0, center);
  justify-content: flex-start;
  padding: 32px 16px 48px;
  background-color: $alfii-navy;
}

.reset-card {
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

  strong {
    color: $alfii-cream;
  }
}

.reset-form {
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
  gap: 8px;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }

  &.as-link {
    text-decoration: none;
  }
}

.back-link {
  @include row(6px, center, center);
  font-size: $fs-xs;
  font-weight: $fw-semibold;
  color: rgba($alfii-cream, 0.6);
  padding-top: 4px;
}

@media (min-width: 768px) {
  .reset-view {
    padding: 64px 24px;
  }

  .card-title {
    font-size: $fs-2xl;
  }
}
</style>
