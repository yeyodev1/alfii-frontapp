<script setup lang="ts">
import BaseSheet from '@/components/modals/BaseSheet.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import { ref } from 'vue';

const props = defineProps<{
  detectedName?: string;
  analysisId: string;
  /**
   * Callback y no emit: crear el expediente es una peticion al backend y la
   * hoja necesita esperar su resultado para mostrar el estado de carga. Un
   * emit se dispara y no devuelve nada; con el callback se hace await y el
   * boton refleja la espera real.
   */
  onConfirm?: (name: string) => Promise<unknown> | void;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const name = ref(props.detectedName || '');
const saving = ref(false);

async function handleConfirm() {
  const trimmed = name.value.trim();
  if (!trimmed || saving.value) return;
  saving.value = true;
  try {
    await props.onConfirm?.(trimmed);
  } finally {
    // Si todo salio bien la hoja ya se cerro; si fallo, queda lista para
    // reintentar en vez de con un spinner eterno.
    saving.value = false;
  }
}
</script>

<template>
  <BaseSheet title="Guardar expediente de ella" @close="$emit('close')">
    <div class="name-sheet">
      <div class="wingman-banner">
        <BaseIcon name="robot" color="red" size="base" />
        <p>Estás a punto de activar a tu <strong>estratega personal</strong>.</p>
      </div>

      <div class="header-info">
        <BaseIcon name="folder" color="sage" size="xl" />
        <p class="subtitle">
          Detectamos este nombre en la captura. ¿Así la guardamos en tu Bóveda?
        </p>
      </div>

      <div class="input-box">
        <label>Nombre o apodo</label>
        <input
          v-model="name"
          type="text"
          placeholder="Ej. Sofi, Maria..."
          maxlength="60"
          autofocus
          :disabled="saving"
          @keyup.enter="handleConfirm"
        />
      </div>

      <div class="benefit-card">
        <BaseIcon name="bolt" color="sage" size="sm" />
        <p>
          Cada captura que subas de ella hace que Alfii sea más preciso. Recordará su arquetipo, qué scripts funcionaron y qué horarios prefiere.
        </p>
      </div>

      <button
        class="confirm-btn"
        :class="{ saving }"
        :disabled="!name.trim() || saving"
        @click="handleConfirm"
      >
        <BaseIcon v-if="saving" name="spinner" spin size="sm" color="plum" />
        <span>{{ saving ? 'Creando expediente...' : 'Crear expediente' }}</span>
      </button>
    </div>
  </BaseSheet>
</template>

<style lang="scss" scoped>
.name-sheet {
  @include stack(18px);
}

.wingman-banner {
  @include row(10px, center);
  padding: 12px 14px;
  background-color: rgba($alfii-red, 0.12);
  border: 1px solid rgba($alfii-red, 0.3);
  border-radius: 12px;

  p {
    font-size: $fs-xs;
    color: $alfii-cream;
    line-height: $lh-snug;

    strong {
      color: $alfii-red;
    }
  }
}

.header-info {
  @include stack(8px, center);
  text-align: center;

  .subtitle {
    font-size: $fs-sm;
    color: rgba($alfii-cream, 0.8);
    line-height: $lh-relaxed;
  }
}

.input-box {
  @include stack(6px);

  label {
    font-size: $fs-xs;
    font-weight: $fw-medium;
    color: rgba($alfii-cream, 0.6);
  }

  input {
    width: 100%;
    padding: 14px 16px;
    background-color: rgba($alfii-navy, 0.6);
    border: 1px solid rgba($alfii-cream, 0.18);
    border-radius: 12px;
    font-size: $fs-md;
    font-weight: $fw-semibold;
    color: $alfii-cream;

    &:focus {
      border-color: $alfii-sage;
    }
  }
}

.benefit-card {
  @include row(10px, flex-start);
  padding: 14px;
  background-color: rgba($alfii-sage, 0.08);
  border-radius: 12px;
  border-left: 3px solid $alfii-sage;

  p {
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.85);
    line-height: $lh-relaxed;
  }
}

.confirm-btn {
  @include row(8px, center, center);
  width: 100%;
  padding: 16px;
  background-color: $alfii-sage;
  color: $alfii-navy;
  font-weight: $fw-bold;
  font-size: $fs-md;
  border-radius: 12px;

  &:disabled {
    opacity: 0.5;
  }

  // Cargando se ve activo, no apagado: el usuario debe leer "trabajando",
  // no "boton roto".
  &.saving {
    opacity: 0.85;
    cursor: wait;
  }
}
</style>
