<script setup lang="ts">
/**
 * Import de conversacion completa: export .txt de WhatsApp o texto pegado.
 *
 * El texto vive SOLO en memoria del componente: se manda al preview, el
 * usuario elige quien es ella y se re-envia para analizar. Nada se guarda en
 * el cliente ni el servidor persiste el archivo (misma promesa que las
 * capturas efimeras).
 */
import { ref, computed } from 'vue';
import BaseSheet from '@/components/modals/BaseSheet.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import api from '@/services/http';
import { useToastStore } from '@/stores/toast';

interface PreviewParticipant {
  name: string;
  messageCount: number;
}

interface ImportPreview {
  participants: PreviewParticipant[];
  messageCount: number;
  mediaFiltered: number;
  systemDropped: number;
  willSummarize: boolean;
  recentWindow: number;
}

const props = defineProps<{
  /** Sin targetId = primer analisis (crea expediente al confirmar nombre). */
  targetId?: string | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'analyzed', res: any): void;
}>();

const toastStore = useToastStore();

type Step = 'source' | 'preview' | 'analyzing';
const step = ref<Step>('source');
const mode = ref<'file' | 'paste'>('file');

const fileInput = ref<HTMLInputElement | null>(null);
const chatText = ref('');
const pasteText = ref('');
const fileName = ref('');
const preview = ref<ImportPreview | null>(null);
const herName = ref('');
const loadingPreview = ref(false);

const canContinuePaste = computed(() => pasteText.value.trim().length >= 40);

function buildFormData(extra?: Record<string, string>): FormData {
  const formData = new FormData();
  const blob = new Blob([chatText.value], { type: 'text/plain' });
  formData.append('export', blob, fileName.value || 'chat.txt');
  for (const [key, value] of Object.entries(extra ?? {})) formData.append(key, value);
  return formData;
}

function triggerFile() {
  fileInput.value?.click();
}

async function handleFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  fileName.value = file.name;
  chatText.value = await file.text();
  await loadPreview();
}

async function continueWithPaste() {
  chatText.value = pasteText.value;
  fileName.value = 'chat.txt';
  await loadPreview();
}

async function loadPreview() {
  if (loadingPreview.value) return;
  loadingPreview.value = true;
  try {
    const res: ImportPreview = await api.post('/import/preview', buildFormData(), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    preview.value = res;
    // Con dos participantes, ella suele ser quien NO exporto el chat; no se
    // preasume: el usuario toca su nombre.
    herName.value = '';
    step.value = 'preview';
  } catch (err: any) {
    toastStore.show(err.message || 'No pude leer esa conversación.', 'error');
  } finally {
    loadingPreview.value = false;
  }
}

async function analyze(pickedName: string) {
  herName.value = pickedName;
  step.value = 'analyzing';
  try {
    const url = props.targetId ? `/targets/${props.targetId}/analyze/text` : '/analyze/first/text';
    const res: any = await api.post(url, buildFormData({ herName: pickedName }), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    emit('analyzed', res);
    emit('close');
  } catch (err: any) {
    toastStore.show(err.message || 'No pude analizar la conversación.', 'error');
    step.value = 'preview';
  }
}

function backToSource() {
  preview.value = null;
  step.value = 'source';
}
</script>

<template>
  <BaseSheet title="Importar conversación" @close="emit('close')">
    <div class="import-sheet">
      <input
        ref="fileInput"
        type="file"
        accept=".txt,text/plain"
        class="hidden-input"
        @change="handleFileSelected"
      />

      <!-- Paso 1: origen -->
      <template v-if="step === 'source'">
        <p class="why">
          <BaseIcon name="lightbulb" size="xs" color="sage" />
          Con la conversación completa Alfii lee patrones que en una captura no existen: quién
          inicia, cómo cambió el interés de ella, qué pasó de verdad.
        </p>

        <div class="mode-tabs">
          <button type="button" :class="{ on: mode === 'file' }" @click="mode = 'file'">
            <BaseIcon name="fileContract" size="xs" :color="mode === 'file' ? 'sage' : 'muted'" />
            Archivo .txt
          </button>
          <button type="button" :class="{ on: mode === 'paste' }" @click="mode = 'paste'">
            <BaseIcon name="platform.whatsapp" size="xs" :color="mode === 'paste' ? 'sage' : 'muted'" />
            Pegar texto
          </button>
        </div>

        <template v-if="mode === 'file'">
          <ol class="howto">
            <li>Abre el chat con ella en WhatsApp</li>
            <li>Menú <strong>⋮ &gt; Más &gt; Exportar chat</strong></li>
            <li>Elige <strong>Sin archivos</strong> y guarda el .txt</li>
          </ol>
          <button type="button" class="btn-primary" :disabled="loadingPreview" @click="triggerFile">
            <BaseIcon v-if="loadingPreview" name="spinner" spin size="xs" color="plum" />
            <BaseIcon v-else name="upload" size="xs" color="plum" />
            <span>Elegir archivo .txt</span>
          </button>
        </template>

        <template v-else>
          <div class="field">
            <textarea
              v-model="pasteText"
              rows="7"
              placeholder="Pega aquí la conversación tal cual la copiaste de WhatsApp"
            ></textarea>
          </div>
          <button
            type="button"
            class="btn-primary"
            :disabled="!canContinuePaste || loadingPreview"
            @click="continueWithPaste"
          >
            <BaseIcon v-if="loadingPreview" name="spinner" spin size="xs" color="plum" />
            <span>Continuar</span>
          </button>
        </template>

        <p class="privacy-note">
          <BaseIcon name="privacy" size="xs" color="sage" />
          El archivo no se guarda: se lee, se analiza y muere. Los adjuntos ni siquiera viajan.
        </p>
      </template>

      <!-- Paso 2: preview + quien es ella -->
      <template v-else-if="step === 'preview' && preview">
        <div class="preview-stats">
          <div class="stat">
            <strong>{{ preview.messageCount }}</strong>
            <span>mensajes</span>
          </div>
          <div class="stat">
            <strong>{{ preview.mediaFiltered }}</strong>
            <span>multimedia filtrados</span>
          </div>
        </div>

        <p v-if="preview.willSummarize" class="summarize-note">
          <BaseIcon name="info" size="xs" color="muted" />
          Los últimos {{ preview.recentWindow }} mensajes entran literales; el resto se resume
          para que nada se pierda.
        </p>

        <h3>¿Quién es ella?</h3>
        <div class="participant-wrap">
          <button
            v-for="p in preview.participants"
            :key="p.name"
            type="button"
            class="participant"
            @click="analyze(p.name)"
          >
            <span class="p-avatar">{{ p.name.charAt(0).toUpperCase() }}</span>
            <span class="p-text">
              <strong>{{ p.name }}</strong>
              <small>{{ p.messageCount }} mensajes</small>
            </span>
            <BaseIcon name="arrowRight" size="xs" color="muted" />
          </button>
        </div>

        <button type="button" class="btn-ghost" @click="backToSource">
          <BaseIcon name="back" size="xs" color="muted" />
          <span>Elegir otro archivo</span>
        </button>
      </template>

      <!-- Paso 3: analizando -->
      <template v-else>
        <div class="analyzing">
          <BaseIcon name="spinner" spin size="xl" color="red" />
          <h3>Alfii está leyendo todo</h3>
          <p>
            Está recorriendo la conversación con {{ herName }}: patrones, cambios de tono, señales.
            Esto toma un momento.
          </p>
        </div>
      </template>
    </div>
  </BaseSheet>
</template>

<style lang="scss" scoped>
.import-sheet {
  @include stack(14px);
}

.hidden-input {
  display: none;
}

.why {
  @include row(8px, flex-start);
  padding: 10px 12px;
  background-color: rgba($alfii-sage, 0.08);
  border-left: 3px solid $alfii-sage;
  border-radius: 10px;
  font-size: $fs-2xs;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.75);
}

.mode-tabs {
  @include row(8px, stretch);

  button {
    @include row(6px, center, center);
    flex: 1 1 0;
    padding: 10px;
    border-radius: 12px;
    background-color: rgba($alfii-navy, 0.55);
    border: 1px solid rgba($alfii-cream, 0.12);
    font-size: $fs-xs;
    font-weight: $fw-semibold;
    color: rgba($alfii-cream, 0.75);
    cursor: pointer;

    &.on {
      border-color: $alfii-sage;
      background-color: rgba($alfii-sage, 0.12);
      color: $alfii-cream;
    }
  }
}

.howto {
  @include stack(6px);
  padding-left: 20px;
  font-size: $fs-xs;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.7);

  strong { color: $alfii-cream; }
}

.field textarea {
  width: 100%;
  padding: 14px 16px;
  background-color: rgba($alfii-navy, 0.6);
  border: 1px solid rgba($alfii-cream, 0.18);
  border-radius: 12px;
  font-size: $fs-sm;
  color: $alfii-cream;
  resize: none;

  &::placeholder { color: rgba($alfii-cream, 0.35); font-size: $fs-xs; }
  &:focus { outline: none; border-color: $alfii-sage; }
}

.btn-primary {
  @include row(8px, center, center);
  width: 100%;
  padding: 13px 20px;
  border-radius: 12px;
  background-color: $alfii-sage;
  color: $alfii-navy;
  font-size: $fs-sm;
  font-weight: $fw-bold;
  cursor: pointer;

  &:disabled { opacity: 0.5; cursor: default; }
}

.btn-ghost {
  @include row(6px, center, center);
  padding: 10px 14px;
  border-radius: 10px;
  font-size: $fs-xs;
  font-weight: $fw-semibold;
  color: rgba($alfii-cream, 0.6);
  background: transparent;
  cursor: pointer;

  &:hover { color: $alfii-cream; }
}

.privacy-note {
  @include row(8px, center, center);
  font-size: $fs-2xs;
  color: rgba($alfii-cream, 0.55);
}

.preview-stats {
  @include row(10px, stretch);

  .stat {
    @include stack(2px, center);
    flex: 1 1 0;
    padding: 12px;
    border-radius: 12px;
    background-color: rgba($alfii-navy, 0.55);
    border: 1px solid rgba($alfii-cream, 0.1);

    strong {
      font-size: $fs-lg;
      font-weight: $fw-extrabold;
      color: $alfii-cream;
    }

    span {
      font-size: $fs-2xs;
      color: rgba($alfii-cream, 0.55);
    }
  }
}

.summarize-note {
  @include row(8px, flex-start);
  font-size: $fs-2xs;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.6);
}

h3 {
  font-size: $fs-md;
  font-weight: $fw-bold;
  color: $alfii-cream;
}

.participant-wrap {
  @include stack(8px);
}

.participant {
  @include row(12px, center);
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  background-color: rgba($alfii-navy, 0.55);
  border: 1px solid rgba($alfii-cream, 0.12);
  cursor: pointer;
  transition: border-color $dur-fast $ease-out;

  &:hover { border-color: $alfii-sage; }

  .p-avatar {
    flex: 0 0 auto;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    @include center;
    background-color: rgba($alfii-red, 0.25);
    border: 1px solid rgba($alfii-red, 0.5);
    font-size: $fs-sm;
    font-weight: $fw-extrabold;
    color: $alfii-cream;
  }

  .p-text {
    @include stack(2px);
    flex: 1 1 auto;
    min-width: 0;
    text-align: left;

    strong {
      font-size: $fs-sm;
      color: $alfii-cream;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    small {
      font-size: $fs-2xs;
      color: rgba($alfii-cream, 0.55);
    }
  }
}

.analyzing {
  @include stack(12px, center);
  padding: 28px 8px;
  text-align: center;

  p {
    font-size: $fs-xs;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.65);
    max-width: 320px;
  }
}
</style>
