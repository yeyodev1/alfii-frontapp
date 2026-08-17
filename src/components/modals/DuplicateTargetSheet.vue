<script setup lang="ts">
import BaseSheet from '@/components/modals/BaseSheet.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import { computed, ref } from 'vue';

/**
 * Choque de nombres al crear un expediente.
 *
 * PORQUE se pregunta en vez de decidir solo: unir por nombre mezclaria dos
 * memorias distintas si resulta que son dos personas, y crear otra ficha parte
 * en dos la memoria de la misma chica. Ninguna de las dos se puede deshacer
 * facil, y el unico que sabe cual es cual es el usuario.
 */

const props = defineProps<{
  name: string;
  existing: {
    id: string;
    displayName: string;
    stage?: string;
    analysisCount?: number;
    lastMessageAt?: string | null;
  };
  // Callbacks awaitables y no emits: ambas opciones disparan una peticion al
  // backend y los botones deben mostrar la espera real (mismo criterio que
  // NameConfirmSheet).
  onMerge?: () => Promise<unknown> | void;
  onSeparate?: () => Promise<unknown> | void;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const working = ref<'merge' | 'separate' | null>(null);

async function choose(kind: 'merge' | 'separate') {
  if (working.value) return;
  working.value = kind;
  try {
    await (kind === 'merge' ? props.onMerge?.() : props.onSeparate?.());
  } finally {
    working.value = null;
  }
}

const STAGE_LABELS: Record<string, string> = {
  APERTURA: 'Apertura',
  CALIBRACION: 'Calibrando',
  ESCALADA: 'Escalando',
  CITA_AGENDADA: 'Cita agendada',
  POST_CITA: 'Despues de la cita',
  ENFRIADO: 'Enfriado',
  CERRADO: 'Cerrado',
};

const stageLabel = computed(() =>
  props.existing.stage ? STAGE_LABELS[props.existing.stage] ?? props.existing.stage : null
);

const lastActivity = computed(() => {
  if (!props.existing.lastMessageAt) return null;
  const days = Math.floor(
    (Date.now() - new Date(props.existing.lastMessageAt).getTime()) / 86_400_000
  );
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} dias`;
});
</script>

<template>
  <BaseSheet title="Ya tienes a alguien con ese nombre" @close="emit('close')">
    <div class="dup">
      <p class="lead">
        Parece que <strong>{{ name }}</strong> ya está en tu bóveda. Dime si es ella
        para no partir su expediente en dos.
      </p>

      <div class="existing-card">
        <div class="ex-avatar">{{ existing.displayName.charAt(0).toUpperCase() }}</div>
        <div class="ex-meta">
          <strong>{{ existing.displayName }}</strong>
          <span>
            <template v-if="stageLabel">{{ stageLabel }}</template>
            <template v-if="existing.analysisCount">
              · {{ existing.analysisCount }} análisis
            </template>
            <template v-if="lastActivity"> · {{ lastActivity }}</template>
          </span>
        </div>
      </div>

      <button class="choice primary" :disabled="!!working" @click="choose('merge')">
        <BaseIcon v-if="working === 'merge'" name="spinner" spin size="sm" color="cream" />
        <BaseIcon v-else name="check" size="sm" color="cream" />
        <span class="ch-txt">
          <strong>{{ working === 'merge' ? 'Sumando a su expediente...' : 'Es la misma' }}</strong>
          <em>Sumo esta captura a su expediente y sigo recordando todo</em>
        </span>
      </button>

      <button class="choice" :disabled="!!working" @click="choose('separate')">
        <BaseIcon v-if="working === 'separate'" name="spinner" spin size="sm" color="sage" />
        <BaseIcon v-else name="plus" size="sm" color="sage" />
        <span class="ch-txt">
          <strong>{{ working === 'separate' ? 'Creando expediente...' : 'Es otra persona' }}</strong>
          <em>Creo un expediente aparte y las distingo por el nombre</em>
        </span>
      </button>

      <button class="cancel" :disabled="!!working" @click="emit('close')">Ahora no</button>
    </div>
  </BaseSheet>
</template>

<style lang="scss" scoped>
.dup {
  @include stack(13px);
}

.lead {
  font-size: $fs-sm;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.85);
}

.existing-card {
  @include row(12px, center);
  padding: 12px 14px;
  border-radius: 14px;
  background-color: rgba($alfii-navy, 0.7);
  border: 1px solid rgba($alfii-cream, 0.12);

  .ex-avatar {
    @include center;
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    border-radius: 50%;
    font-size: $fs-md;
    font-weight: $fw-bold;
    color: $alfii-cream;
    background-color: rgba($alfii-red, 0.3);
    border: 1px solid rgba($alfii-red, 0.5);
  }

  .ex-meta {
    @include stack(2px);

    strong { font-size: $fs-sm; font-weight: $fw-bold; }
    span { font-size: $fs-2xs; color: rgba($alfii-cream, 0.55); }
  }
}

.choice {
  @include row(12px, center);
  width: 100%;
  text-align: left;
  padding: 14px;
  border-radius: 14px;
  background-color: rgba($alfii-plum, 0.8);
  border: 1px solid rgba($alfii-cream, 0.14);
  transition: border-color $dur-fast $ease-out;

  &:hover:not(:disabled) { border-color: rgba($alfii-cream, 0.3); }

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  &.primary {
    background: linear-gradient(135deg, rgba($alfii-plum, 0.95) 0%, rgba($alfii-red, 0.22) 100%);
    border-color: rgba($alfii-red, 0.45);
  }

  .ch-txt {
    @include stack(3px, flex-start);

    strong { font-size: $fs-sm; font-weight: $fw-bold; color: $alfii-cream; }
    em {
      font-style: normal;
      font-size: $fs-2xs;
      line-height: $lh-snug;
      color: rgba($alfii-cream, 0.6);
    }
  }
}

.cancel {
  align-self: center;
  padding: 6px 10px;
  font-size: $fs-xs;
  font-weight: $fw-semibold;
  color: rgba($alfii-cream, 0.5);
}
</style>
