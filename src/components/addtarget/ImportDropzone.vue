<script setup lang="ts">
/**
 * Paso 2 del alta: recibir el chat.
 *
 * Acepta el .txt de Android, el .zip de iPhone (lo abre aqui mismo con fflate
 * y saca el _chat.txt: el usuario no tiene que descomprimir nada) o texto
 * pegado. Emite SOLO texto plano; quien lo recibe decide que hacer con el.
 */
import { ref, computed } from 'vue';
import { unzipSync, strFromU8 } from 'fflate';
import BaseIcon from '@/components/shared/BaseIcon.vue';

const props = defineProps<{
  mode: 'file' | 'paste';
  busy: boolean;
}>();

const emit = defineEmits<{
  (e: 'text', payload: { text: string; fileName: string }): void;
  (e: 'error', message: string): void;
  (e: 'update:mode', mode: 'file' | 'paste'): void;
}>();

const MAX_BYTES = 2 * 1024 * 1024;
const fileInput = ref<HTMLInputElement | null>(null);
const dragOver = ref(false);
const pasteText = ref('');
const canPaste = computed(() => pasteText.value.trim().length >= 40);

function pick() {
  fileInput.value?.click();
}

async function readFile(file: File) {
  if (props.busy) return;
  const lower = file.name.toLowerCase();
  try {
    if (lower.endsWith('.zip') || file.type === 'application/zip') {
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
      const names = Object.keys(entries).filter((n) => n.toLowerCase().endsWith('.txt') && !n.startsWith('__MACOSX'));
      const chosen = names.find((n) => /_chat\.txt$/i.test(n)) ?? names[0];
      if (!chosen) throw new Error('Ese .zip no trae ningún chat de WhatsApp (.txt).');
      const text = strFromU8(entries[chosen]!);
      if (text.length > MAX_BYTES) throw new Error('Ese chat pesa más de 2 MB. Exporta un tramo más corto.');
      emit('text', { text, fileName: chosen.split('/').pop() || 'chat.txt' });
      return;
    }
    if (file.size > MAX_BYTES) throw new Error('Ese archivo pesa más de 2 MB. Exporta un tramo más corto.');
    if (!lower.endsWith('.txt') && !file.type.startsWith('text/')) {
      throw new Error('Necesito el .txt (o el .zip) que exporta WhatsApp, no una imagen.');
    }
    emit('text', { text: await file.text(), fileName: file.name });
  } catch (err: any) {
    emit('error', err?.message || 'No pude leer ese archivo.');
  } finally {
    if (fileInput.value) fileInput.value.value = '';
  }
}

function onInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) readFile(file);
}

function onDrop(e: DragEvent) {
  dragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) readFile(file);
}

function sendPaste() {
  if (!canPaste.value) return;
  emit('text', { text: pasteText.value, fileName: 'chat.txt' });
}
</script>

<template>
  <section class="dropzone-step">
    <input ref="fileInput" type="file" accept=".txt,.zip,text/plain,application/zip" class="hidden" @change="onInput" />

    <div class="mode-tabs" role="tablist">
      <button type="button" :class="{ on: mode === 'file' }" @click="emit('update:mode', 'file')">
        <BaseIcon name="fileContract" size="xs" :color="mode === 'file' ? 'sage' : 'muted'" />
        Archivo exportado
      </button>
      <button type="button" :class="{ on: mode === 'paste' }" @click="emit('update:mode', 'paste')">
        <BaseIcon name="copy" size="xs" :color="mode === 'paste' ? 'sage' : 'muted'" />
        Pegar texto
      </button>
    </div>

    <div
      v-if="mode === 'file'"
      class="drop"
      :class="{ over: dragOver, busy }"
      role="button"
      tabindex="0"
      @click="pick"
      @keydown.enter.prevent="pick"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="onDrop"
    >
      <div class="drop-icon">
        <BaseIcon :name="busy ? 'spinner' : 'upload'" :spin="busy" size="xl" color="cream" />
      </div>
      <strong>{{ busy ? 'Leyendo la conversación…' : 'Suelta aquí el chat' }}</strong>
      <p>.txt de Android o .zip de iPhone · máx. 2 MB</p>
      <span class="fake-btn">Elegir archivo</span>
    </div>

    <div v-else class="paste">
      <textarea
        v-model="pasteText"
        rows="9"
        placeholder="Pega aquí la conversación tal cual la copiaste de WhatsApp (mínimo unas cuantas líneas)"
      ></textarea>
      <button type="button" class="btn-primary" :disabled="!canPaste || busy" @click="sendPaste">
        <BaseIcon v-if="busy" name="spinner" spin size="sm" color="cream" />
        <BaseIcon v-else name="forward" size="sm" color="cream" />
        <span>Continuar</span>
      </button>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.dropzone-step {
  @include stack(16px);
}

.hidden { display: none; }

.mode-tabs {
  @include row(8px, stretch);

  button {
    @include row(6px, center, center);
    flex: 1 1 0;
    padding: 11px;
    border-radius: 12px;
    background-color: rgba($alfii-cream, 0.04);
    border: 1px solid rgba($alfii-cream, 0.12);
    font-size: $fs-xs;
    font-weight: $fw-semibold;
    color: rgba($alfii-cream, 0.7);

    &.on {
      border-color: $alfii-sage;
      background-color: rgba($alfii-sage, 0.12);
      color: $alfii-cream;
    }
  }
}

.drop {
  @include stack(8px, center);
  padding: 36px 20px 28px;
  border-radius: 20px;
  border: 2px dashed rgba($alfii-cream, 0.25);
  background-color: rgba($alfii-cream, 0.03);
  text-align: center;
  cursor: pointer;
  transition: border-color $dur-fast $ease-out, background-color $dur-fast $ease-out, transform $dur-fast $ease-out;

  &:hover, &.over {
    border-color: $alfii-sage;
    background-color: rgba($alfii-sage, 0.08);
  }

  &.over { transform: scale(1.01); }
  &.busy { pointer-events: none; opacity: 0.8; }

  .drop-icon {
    @include center;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background-color: rgba($alfii-red, 0.18);
    border: 1px solid rgba($alfii-red, 0.4);
    margin-bottom: 6px;
  }

  strong {
    font-size: $fs-md;
    color: $alfii-cream;
  }

  p {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.55);
  }

  .fake-btn {
    margin-top: 10px;
    padding: 9px 18px;
    border-radius: 999px;
    background-color: $alfii-cream;
    color: $alfii-navy;
    font-size: $fs-xs;
    font-weight: $fw-bold;
  }
}

.paste {
  @include stack(12px);

  textarea {
    width: 100%;
    padding: 14px;
    border-radius: 14px;
    background-color: rgba($alfii-cream, 0.04);
    border: 1px solid rgba($alfii-cream, 0.14);
    color: $alfii-cream;
    font-size: $fs-xs;
    line-height: $lh-base;
    resize: vertical;

    &:focus {
      outline: none;
      border-color: $alfii-sage;
    }
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

  &:disabled { opacity: 0.45; box-shadow: none; cursor: not-allowed; }
}
</style>
