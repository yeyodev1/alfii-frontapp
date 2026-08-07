<script setup lang="ts">
import BaseModal from '@/components/modals/BaseModal.vue';

defineProps<{
  title: string;
  message: string;
  danger?: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
  (e: 'confirm'): void;
}>();
</script>

<template>
  <BaseModal :title="title" :icon="danger ? 'trash' : 'risk'">
    <div class="confirm-modal-content">
      <p class="message-text">{{ message }}</p>

      <div class="modal-actions">
        <button class="cancel-btn" @click="$emit('close')">
          Cancelar
        </button>
        <button
          class="confirm-btn"
          :class="{ 'is-danger': danger }"
          @click="$emit('confirm')"
        >
          Confirmar
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
.confirm-modal-content {
  @include stack(20px);
}

.message-text {
  font-size: $fs-sm;
  color: rgba($alfii-cream, 0.85);
  line-height: $lh-relaxed;
}

.modal-actions {
  @include row(10px, center, flex-end);

  .cancel-btn {
    padding: 10px 16px;
    background-color: rgba($alfii-cream, 0.08);
    color: $alfii-cream;
    font-size: $fs-xs;
    font-weight: $fw-semibold;
    border-radius: 10px;
  }

  .confirm-btn {
    padding: 10px 20px;
    background-color: $alfii-sage;
    color: $alfii-navy;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    border-radius: 10px;

    &.is-danger {
      background-color: $alfii-red;
      color: $alfii-cream;
    }
  }
}
</style>
