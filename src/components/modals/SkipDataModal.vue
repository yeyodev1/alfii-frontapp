<script setup lang="ts">
import BaseModal from '@/components/modals/BaseModal.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';

defineProps<{
  fieldName: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm-skip'): void;
}>();
</script>

<template>
  <BaseModal title="¿Seguro?" icon="risk">
    <div class="skip-modal-content">
      <div class="warning-box">
        <BaseIcon name="risk" color="cream" size="lg" beat />
        <p>
          Sin este dato voy a trabajar a ciegas en una parte de tu análisis.
          Puedo continuar, pero mis recomendaciones van a salir más genéricas — y lo vas a notar cuando te dé los scripts.
        </p>
      </div>

      <div class="modal-actions">
        <button class="primary-btn" @click="$emit('close')">
          Mejor te lo doy
        </button>
        <button class="secondary-btn" @click="$emit('confirm-skip')">
          Continuar sin darlo
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
.skip-modal-content {
  @include stack(20px);
}

.warning-box {
  @include stack(12px, center);
  padding: 16px;
  background-color: rgba($alfii-red, 0.12);
  border: 1px solid rgba($alfii-red, 0.3);
  border-radius: 12px;
  text-align: center;

  p {
    font-size: $fs-sm;
    color: $alfii-cream;
    line-height: $lh-relaxed;
  }
}

.modal-actions {
  @include stack(10px);

  .primary-btn {
    width: 100%;
    padding: 14px;
    background-color: $alfii-red;
    color: $alfii-cream;
    font-weight: $fw-bold;
    border-radius: 12px;
  }

  .secondary-btn {
    width: 100%;
    padding: 12px;
    color: rgba($alfii-cream, 0.55);
    font-size: $fs-xs;
    font-weight: $fw-medium;
    text-align: center;
  }
}
</style>
