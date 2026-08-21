<script setup lang="ts">
/**
 * Previsualizacion de la captura antes de analizarla.
 *
 * Antes la imagen se mandaba a ciegas. Aqui el usuario la ve, confirma que es
 * la correcta y puede escribir que quiere que Alfii mire ("el tono de la
 * ultima", "que le respondo aqui"). Esa nota entra al analisis y queda en el
 * hilo antes de la captura.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';
import BaseSheet from '@/components/modals/BaseSheet.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';

const props = defineProps<{
  file: File;
  onConfirm?: (note: string) => Promise<unknown> | void;
}>();

const emit = defineEmits<{ (e: 'close'): void }>();

const url = ref('');
const note = ref('');
const busy = ref(false);

onMounted(() => { url.value = URL.createObjectURL(props.file); });
onBeforeUnmount(() => { if (url.value) URL.revokeObjectURL(url.value); });

const CHIPS = ['¿Qué le respondo?', 'Lee el tono de ella', '¿Me está probando?', '¿Cuándo contesto?'];

function addChip(c: string) {
  note.value = note.value ? `${note.value.trim()} ${c}` : c;
}

async function confirm() {
  if (busy.value) return;
  busy.value = true;
  try {
    await props.onConfirm?.(note.value.trim());
    emit('close');
  } finally {
    busy.value = false;
  }
}

function sizeLabel(bytes: number) {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
</script>

<template>
  <BaseSheet title="Revisa la captura" @close="emit('close')">
    <div class="preview">
      <div class="frame">
        <img v-if="url" :src="url" alt="Captura a analizar" />
        <span class="meta">{{ file.name }} · {{ sizeLabel(file.size) }}</span>
      </div>

      <label class="note">
        <span class="note-label">¿Qué quieres que mire Alfii? <small>(opcional)</small></span>
        <textarea
          v-model="note"
          rows="2"
          maxlength="600"
          placeholder="Ej: es lo último que me escribió, ¿qué le respondo sin sonar desesperado?"
        ></textarea>
      </label>

      <div class="chips">
        <button v-for="c in CHIPS" :key="c" type="button" @click="addChip(c)">{{ c }}</button>
      </div>

      <button type="button" class="btn-primary" :disabled="busy" @click="confirm">
        <BaseIcon v-if="busy" name="spinner" spin size="sm" color="cream" />
        <BaseIcon v-else name="bolt" size="sm" color="cream" />
        <span>{{ busy ? 'Enviando…' : 'Analizar esta captura' }}</span>
      </button>

      <p class="privacy">
        <BaseIcon name="privacy" size="xs" color="sage" />
        Alfii lee el texto de la imagen; la captura no se comparte con nadie.
      </p>
    </div>
  </BaseSheet>
</template>

<style lang="scss" scoped>
.preview { @include stack(14px); }

.frame {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba($alfii-cream, 0.16);
  background-color: rgba($alfii-navy, 0.6);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);

  img {
    display: block;
    width: 100%;
    max-height: 46dvh;
    object-fit: contain;
    background-color: #000;
  }

  .meta {
    position: absolute;
    left: 10px;
    bottom: 10px;
    padding: 4px 10px;
    border-radius: 999px;
    background-color: rgba($alfii-navy, 0.85);
    backdrop-filter: blur(8px);
    font-size: 11px;
    color: rgba($alfii-cream, 0.8);
    max-width: calc(100% - 20px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.note {
  @include stack(6px);

  .note-label {
    font-size: $fs-xs;
    font-weight: $fw-semibold;
    color: $alfii-cream;
    small { font-weight: $fw-normal; color: rgba($alfii-cream, 0.5); }
  }

  textarea {
    width: 100%;
    padding: 12px 14px;
    border-radius: 12px;
    background-color: rgba($alfii-cream, 0.05);
    border: 1px solid rgba($alfii-cream, 0.15);
    color: $alfii-cream;
    font-size: $fs-xs;
    line-height: $lh-base;
    resize: vertical;
    &:focus { outline: none; border-color: $alfii-sage; }
  }
}

.chips {
  @include row(6px, center);
  flex-wrap: wrap;

  button {
    padding: 6px 11px;
    border-radius: 999px;
    font-size: $fs-2xs;
    font-weight: $fw-semibold;
    color: rgba($alfii-cream, 0.8);
    background-color: rgba($alfii-cream, 0.06);
    border: 1px solid rgba($alfii-cream, 0.14);
    &:hover { background-color: rgba($alfii-cream, 0.12); color: $alfii-cream; }
  }
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
  &:disabled { opacity: 0.6; }
}

.privacy {
  @include row(8px, flex-start);
  font-size: $fs-2xs;
  color: rgba($alfii-cream, 0.55);
}
</style>
