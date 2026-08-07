<script setup lang="ts">
import BaseSheet from '@/components/modals/BaseSheet.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import AlfiiLogo from '@/components/shared/AlfiiLogo.vue';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'upload'): void;
  (e: 'start-audit'): void;
}>();

function handleUpload() {
  emit('close');
  emit('upload');
}

function handleStartAudit() {
  emit('close');
  emit('start-audit');
}
</script>

<template>
  <BaseSheet @close="$emit('close')">
    <div class="wingman-intro-sheet">
      <div class="logo-badge">
        <AlfiiLogo size="lg" mode="iso" />
      </div>

      <div class="headline-box">
        <span class="badge-tag">EL INICIO DE LA EXPERIENCIA</span>
        <h2>Estás a punto de activar a tu <span class="highlight">estratega personal.</span></h2>
        <p class="description">
          No una inteligencia artificial genérica. Tu wingman, tu ventaja táctica, tu arma secreta para dominar cada interacción. Alfii analiza tu chat, detecta trampas y calibra cada respuesta a tu personalidad real.
        </p>
      </div>

      <div class="trust-features">
        <div class="feature-item">
          <BaseIcon name="privacy" color="sage" size="xs" />
          <span>100% Efímero: tu captura no se guarda en ningún servidor.</span>
        </div>
        <div class="feature-item">
          <BaseIcon name="privacy" color="sage" size="xs" />
          <span>Nadie sabrá con quién hablas ni qué le respondes.</span>
        </div>
      </div>

      <div class="actions-stack">
        <button class="primary-btn" @click="handleUpload">
          <BaseIcon name="upload" color="cream" size="base" />
          <span>Subir mi primera captura</span>
        </button>

        <button class="secondary-btn" @click="handleStartAudit">
          <BaseIcon name="step.PERSONALITY" color="cream" size="xs" />
          <span>Personalizar mi perfil primero (La Auditoría)</span>
        </button>
      </div>
    </div>
  </BaseSheet>
</template>

<style lang="scss" scoped>
.wingman-intro-sheet {
  @include stack(20px, center);
  text-align: center;
}

.logo-badge {
  padding: 12px;
  background-color: rgba($alfii-red, 0.12);
  border: 1px solid rgba($alfii-red, 0.3);
  border-radius: 50%;
  box-shadow: 0 0 30px rgba($alfii-red, 0.25);
}

.headline-box {
  @include stack(10px, center);

  .badge-tag {
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.12em;
    color: $alfii-red;
  }

  h2 {
    font-size: $fs-xl;
    font-weight: $fw-extrabold;
    color: $alfii-cream;
    line-height: $lh-tight;

    .highlight {
      color: $alfii-red;
    }
  }

  .description {
    font-size: $fs-sm;
    color: rgba($alfii-cream, 0.8);
    line-height: $lh-relaxed;
    max-width: 420px;
  }
}

.trust-features {
  @include stack(8px);
  width: 100%;
  padding: 14px;
  background-color: rgba($alfii-navy, 0.6);
  border-radius: 12px;

  .feature-item {
    @include row(8px, center);
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.8);
    text-align: left;
  }
}

.actions-stack {
  @include stack(10px);
  width: 100%;

  .primary-btn {
    @include row(10px, center, center);
    width: 100%;
    padding: 16px;
    background-color: $alfii-red;
    color: $alfii-cream;
    font-weight: $fw-bold;
    font-size: $fs-md;
    border-radius: 14px;
    box-shadow: 0 8px 25px rgba($alfii-red, 0.4);
  }

  .secondary-btn {
    @include row(8px, center, center);
    width: 100%;
    padding: 12px;
    background-color: rgba($alfii-plum, 0.8);
    border: 1px solid rgba($alfii-cream, 0.15);
    color: rgba($alfii-cream, 0.85);
    font-weight: $fw-semibold;
    font-size: $fs-xs;
    border-radius: 12px;
  }
}
</style>
