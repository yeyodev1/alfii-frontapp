<script setup lang="ts">
/**
 * Caja de subida: el unico sitio del hero donde se pide accion.
 *
 * Soporta las tres formas de entregar una captura: clic/tap, arrastrar y
 * soltar (escritorio) y el input de archivo del padre. En tactil no hay hover,
 * asi que el gesto se confirma con un rebote corto al pulsar.
 */
import BaseIcon from '@/components/shared/BaseIcon.vue';

defineProps<{ uploading?: boolean; isDragOver?: boolean }>();

const emit = defineEmits<{
  (e: 'upload'): void;
  (e: 'drop', ev: DragEvent): void;
  (e: 'dragstate', v: boolean): void;
}>();
</script>

<template>
  <div
    class="dropzone"
    :class="{ 'is-dragover': isDragOver, 'is-uploading': uploading }"
    @click="emit('upload')"
    @dragover.prevent="emit('dragstate', true)"
    @dragleave.prevent="emit('dragstate', false)"
    @drop.prevent="emit('drop', $event)"
  >
    <div class="dz-icon">
      <BaseIcon :name="uploading ? 'spinner' : 'upload'" :spin="uploading" color="red" size="xl" />
    </div>

    <div class="dz-text">
      <h2 class="dz-title">{{ uploading ? 'Leyendo la conversación...' : 'Sube tu captura' }}</h2>
      <p class="dz-hint">
        {{ uploading ? 'Descifrando subtexto y arquetipo' : 'WhatsApp · Instagram · Tinder · Telegram' }}
      </p>
    </div>

    <button class="dz-btn" :disabled="uploading">
      <span>{{ uploading ? 'Procesando...' : 'Analizar ahora' }}</span>
      <BaseIcon name="arrowRight" size="xs" color="cream" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
// Tarjeta solida, no recuadro de subida.
//
// El borde discontinuo decia "arrastra un archivo aqui", que es un gesto de
// escritorio: en un movil solo parecia un formulario a medio terminar. Con
// borde fino y fondo propio se lee como el panel principal de la pantalla.
.dropzone {
  position: relative;
  width: 100%;
  max-width: 620px;
  padding: 20px;
  border-radius: 18px;
  cursor: pointer;
  text-align: left;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    'icono texto'
    'boton boton';
  align-items: center;
  gap: 14px 16px;
  background: linear-gradient(155deg, rgba($alfii-plum, 0.92) 0%, rgba($alfii-navy, 0.94) 100%);
  border: 1px solid rgba($alfii-red, 0.45);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42);
  transition: border-color $dur-base $ease-out, transform $dur-base $ease-out;

  @media (min-width: 768px) {
    padding: 38px 32px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  &:hover,
  &.is-dragover {
    border-color: $alfii-red;
    transform: translateY(-3px);
  }

  &:active {
    transform: scale(0.985);
  }

  &.is-uploading {
    border-color: $alfii-sage;
    cursor: wait;
  }

  .dz-icon {
    grid-area: icono;
    width: 52px;
    height: 52px;
    border-radius: 14px;
    @include center;
    background-color: rgba($alfii-red, 0.15);
    border: 1px solid rgba($alfii-red, 0.35);

    @media (min-width: 768px) {
      width: 64px;
      height: 64px;
      border-radius: 50%;
    }
  }

  .dz-text {
    grid-area: texto;
    @include stack(3px);
  }

  .dz-title {
    font-size: clamp(1.15rem, 4.6vw, 1.375rem);
    font-weight: $fw-extrabold;
    line-height: 1.2;
  }

  .dz-hint {
    font-size: $fs-2xs;
    line-height: 1.45;
    color: rgba($alfii-cream, 0.55);

    @media (min-width: 768px) { font-size: $fs-xs; }
  }

  .dz-btn {
    grid-area: boton;
    @include row(10px, center, center);
    width: 100%;
    max-width: 320px;
    padding: 15px 24px;
    border-radius: 13px;
    font-size: $fs-md;
    font-weight: $fw-bold;
    background-color: $alfii-red;
    color: $alfii-cream;
    box-shadow: 0 8px 24px rgba($alfii-red, 0.45);
  }
}
</style>
