<script setup lang="ts">
/**
 * Paso 1 del alta de una chica: como sacar el chat de WhatsApp.
 *
 * La gente no sabe que WhatsApp exporta; si el primer paso es "sube el .txt"
 * se pierden aqui. Por eso la guia va ANTES del dropzone, por sistema, con los
 * nombres literales de los menus.
 */
import { ref } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';

const emit = defineEmits<{
  (e: 'ready'): void;
  (e: 'paste'): void;
}>();

type Os = 'android' | 'ios';
const os = ref<Os>(/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'ios' : 'android');

const STEPS: Record<Os, Array<{ title: string; detail: string }>> = {
  android: [
    { title: 'Abre el chat con ella', detail: 'Solo ese chat, no un grupo.' },
    { title: 'Toca ⋮ arriba a la derecha', detail: 'Luego Más → Exportar chat.' },
    { title: 'Elige "Sin archivos"', detail: 'Las fotos y audios no sirven para el análisis y pesan.' },
    { title: 'Guárdalo o mándatelo', detail: 'A Drive, a tu correo o a "Tú" en WhatsApp. Sale un .txt.' },
  ],
  ios: [
    { title: 'Abre el chat con ella', detail: 'Solo ese chat, no un grupo.' },
    { title: 'Toca su nombre arriba', detail: 'Baja hasta el final → Exportar chat.' },
    { title: 'Elige "Sin archivos"', detail: 'Las fotos y audios no sirven para el análisis y pesan.' },
    { title: 'Guárdalo en Archivos o AirDrop', detail: 'Sale un .zip: puedes subirlo tal cual, yo lo abro.' },
  ],
};
</script>

<template>
  <section class="guide">
    <div class="os-tabs" role="tablist">
      <button type="button" role="tab" :class="{ on: os === 'android' }" @click="os = 'android'">
        Android
      </button>
      <button type="button" role="tab" :class="{ on: os === 'ios' }" @click="os = 'ios'">iPhone</button>
    </div>

    <ol class="steps">
      <li v-for="(s, i) in STEPS[os]" :key="s.title" class="step">
        <span class="num">{{ i + 1 }}</span>
        <div class="step-text">
          <strong>{{ s.title }}</strong>
          <p>{{ s.detail }}</p>
        </div>
      </li>
    </ol>

    <div class="actions">
      <button type="button" class="btn-primary" @click="emit('ready')">
        <BaseIcon name="upload" size="sm" color="cream" />
        <span>Ya tengo el archivo</span>
      </button>
      <button type="button" class="btn-link" @click="emit('paste')">
        Prefiero copiar y pegar los mensajes
      </button>
    </div>

    <p class="privacy">
      <BaseIcon name="privacy" size="xs" color="sage" />
      El archivo no se guarda en ningún servidor: se lee, se analiza y muere.
    </p>
  </section>
</template>

<style lang="scss" scoped>
.guide {
  @include stack(20px);
}

.os-tabs {
  @include row(0, stretch);
  padding: 4px;
  border-radius: 999px;
  background-color: rgba($alfii-cream, 0.06);
  border: 1px solid rgba($alfii-cream, 0.1);
  align-self: flex-start;

  button {
    padding: 8px 18px;
    border-radius: 999px;
    font-size: $fs-xs;
    font-weight: $fw-semibold;
    color: rgba($alfii-cream, 0.65);
    transition: background-color $dur-fast $ease-out, color $dur-fast $ease-out;

    &.on {
      background-color: $alfii-cream;
      color: $alfii-navy;
    }
  }
}

.steps {
  @include stack(10px);
  list-style: none;
  padding: 0;
  margin: 0;
}

.step {
  @include row(14px, flex-start);
  padding: 14px 16px;
  border-radius: 16px;
  background-color: rgba($alfii-cream, 0.04);
  border: 1px solid rgba($alfii-cream, 0.1);
  animation: fadeInUp $dur-base $ease-out both;

  @for $i from 1 through 4 {
    &:nth-child(#{$i}) { animation-delay: #{$i * 60}ms; }
  }

  .num {
    @include center;
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: linear-gradient(135deg, $alfii-red, #ff3b5c);
    font-family: var(--font-display);
    font-weight: 800;
    font-size: $fs-xs;
    color: $alfii-cream;
  }

  .step-text {
    @include stack(3px);

    strong {
      font-size: $fs-sm;
      color: $alfii-cream;
    }

    p {
      font-size: $fs-2xs;
      line-height: $lh-relaxed;
      color: rgba($alfii-cream, 0.62);
    }
  }
}

.actions {
  @include stack(10px, center);
}

.btn-primary {
  @include row(8px, center, center);
  width: 100%;
  padding: 15px 20px;
  border-radius: 14px;
  background-color: $alfii-red;
  color: $alfii-cream;
  font-size: $fs-sm;
  font-weight: $fw-bold;
  box-shadow: 0 6px 22px rgba($alfii-red, 0.4);
  transition: transform $dur-fast $ease-out, background-color $dur-fast $ease-out;

  &:hover { background-color: #ff1a40; transform: translateY(-1px); }
}

.btn-link {
  font-size: $fs-xs;
  color: rgba($alfii-cream, 0.6);
  text-decoration: underline;
  text-underline-offset: 3px;

  &:hover { color: $alfii-cream; }
}

.privacy {
  @include row(8px, flex-start);
  font-size: $fs-2xs;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.55);
}
</style>
