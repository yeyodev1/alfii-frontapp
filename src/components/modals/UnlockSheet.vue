<script setup lang="ts">
import BaseSheet from '@/components/modals/BaseSheet.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';

// Hoja puramente persuasiva: explica que gana el usuario al crear cuenta.
// NO implementa autenticacion. Emite 'proceed' y la vista abre AuthSheet.
withDefaults(
  defineProps<{
    scriptsLocked?: number;
    detectedName?: string;
    cta?: string;
  }>(),
  {
    scriptsLocked: 2,
    detectedName: 'ella',
    cta: 'Crea tu cuenta para desbloquear las otras dos respuestas',
  }
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'proceed'): void;
}>();
</script>

<template>
  <BaseSheet title="Necesito conocerte mejor" @close="emit('close')">
    <div class="unlock-sheet">
      <div class="hero-lock">
        <div class="lock-halo">
          <BaseIcon name="lock" color="red" size="xl" />
        </div>
        <p class="hero-copy">{{ cta }}</p>
      </div>

      <ul class="gain-list">
        <li>
          <BaseIcon name="scripts" color="sage" size="base" />
          <div>
            <strong>{{ scriptsLocked }} respuestas más</strong>
            <span>Otro tono, otro riesgo, otro resultado. Eliges tú, no yo.</span>
          </div>
        </li>
        <li>
          <BaseIcon name="folder" color="sage" size="base" />
          <div>
            <strong>Recordaré a {{ detectedName }}</strong>
            <span>Su arquetipo, sus horarios y qué script funcionó quedan en tu bóveda.</span>
          </div>
        </li>
        <li>
          <BaseIcon name="bolt" color="sage" size="base" />
          <div>
            <strong>Cada captura me hace más preciso</strong>
            <span>Dejo de adivinar y empiezo a leer el patrón de ustedes dos.</span>
          </div>
        </li>
      </ul>

      <div class="privacy-note">
        <BaseIcon name="privacy" color="muted" size="sm" />
        <p>Solo un correo y una contraseña. Ni nombre legal, ni teléfono, ni tarjeta.</p>
      </div>

      <button class="unlock-btn" @click="emit('proceed')">
        <span>Desbloquear las respuestas</span>
        <BaseIcon name="arrowRight" color="cream" size="xs" />
      </button>

      <button class="later-btn" @click="emit('close')">Ahora no, sigo con la que tengo</button>
    </div>
  </BaseSheet>
</template>

<style lang="scss" scoped>
.unlock-sheet {
  @include stack(18px);
}

.hero-lock {
  @include stack(12px, center);
  text-align: center;
  padding: 18px 14px;
  border-radius: 16px;
  background-color: rgba($alfii-red, 0.1);
  border: 1px solid rgba($alfii-red, 0.28);

  .lock-halo {
    width: 62px;
    height: 62px;
    border-radius: 50%;
    @include center;
    background-color: rgba($alfii-navy, 0.65);
    border: 1px solid rgba($alfii-red, 0.4);
  }

  .hero-copy {
    font-size: $fs-md;
    font-weight: $fw-semibold;
    line-height: $lh-snug;
    color: $alfii-cream;
  }
}

.gain-list {
  @include stack(12px);

  li {
    @include row(12px, flex-start);
    padding: 12px 14px;
    border-radius: 12px;
    background-color: rgba($alfii-navy, 0.55);
    border-left: 3px solid $alfii-sage;

    div {
      @include stack(3px);
    }

    strong {
      font-size: $fs-sm;
      font-weight: $fw-bold;
      color: $alfii-cream;
    }

    span {
      font-size: $fs-xs;
      line-height: $lh-relaxed;
      color: rgba($alfii-cream, 0.7);
    }
  }
}

.privacy-note {
  @include row(8px, flex-start);

  p {
    font-size: $fs-xs;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.6);
  }
}

.unlock-btn {
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  background-color: $alfii-red;
  color: $alfii-cream;
  font-size: $fs-md;
  font-weight: $fw-bold;
  @include row(10px, center, center);
  transition: transform $dur-fast $ease-out;

  &:active {
    transform: scale(0.98);
  }
}

.later-btn {
  width: 100%;
  font-size: $fs-xs;
  color: rgba($alfii-cream, 0.5);
  text-decoration: underline;
}

@media (min-width: 768px) {
  .hero-lock .hero-copy {
    font-size: $fs-lg;
  }
}
</style>
