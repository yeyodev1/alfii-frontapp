<script setup lang="ts">
/**
 * Alta de una chica desde su chat de WhatsApp (/nueva).
 *
 * Cuatro pasos en una sola pantalla: como exportar → subir/pegar → confirmar
 * (quien es ella + aceptar el analisis) → Alfii lee. El texto vive SOLO en
 * memoria de esta vista; el servidor lo analiza y no lo persiste.
 *
 * Al terminar entrega el resultado al mismo carril que la captura: el store
 * de primer analisis y /analisis, que ya sabe confirmar nombre, detectar
 * duplicados y pedir cuenta si hace falta. No se duplica nada de eso aqui.
 */
import { ref, computed, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import AlfiiLogo from '@/components/shared/AlfiiLogo.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import ExportGuide from '@/components/addtarget/ExportGuide.vue';
import ImportDropzone from '@/components/addtarget/ImportDropzone.vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useFirstAnalysisStore, type FirstAnalysisResponse } from '@/stores/firstAnalysis';
import api from '@/services/http';

interface PreviewParticipant { name: string; messageCount: number }
interface ImportPreview {
  participants: PreviewParticipant[];
  messageCount: number;
  mediaFiltered: number;
  systemDropped: number;
  willSummarize: boolean;
  recentWindow: number;
}

const router = useRouter();
const authStore = useAuthStore();
const toastStore = useToastStore();
const firstAnalysisStore = useFirstAnalysisStore();

type Step = 'guide' | 'upload' | 'confirm' | 'analyzing';
const STEP_ORDER: Step[] = ['guide', 'upload', 'confirm', 'analyzing'];
const STEP_META: Record<Step, { eyebrow: string; title: string }> = {
  guide: { eyebrow: 'Paso 1 · Exportar', title: 'Saca el chat de WhatsApp' },
  upload: { eyebrow: 'Paso 2 · Subir', title: 'Dame la conversación' },
  confirm: { eyebrow: 'Paso 3 · Confirmar', title: '¿Quién es ella?' },
  analyzing: { eyebrow: 'Paso 4 · Análisis', title: 'Alfii está leyendo todo' },
};

const step = ref<Step>('guide');
const mode = ref<'file' | 'paste'>('file');
const chatText = ref('');
const fileName = ref('');
const preview = ref<ImportPreview | null>(null);
const herName = ref('');
const accepted = ref(false);
const loadingPreview = ref(false);

const stepIndex = computed(() => STEP_ORDER.indexOf(step.value));
const meta = computed(() => STEP_META[step.value]);
const canAnalyze = computed(() => !!herName.value && accepted.value);
const backTo = computed(() => (authStore.user && !authStore.user.isAnonymous ? '/vault' : '/'));

function buildFormData(extra?: Record<string, string>): FormData {
  const fd = new FormData();
  fd.append('export', new Blob([chatText.value], { type: 'text/plain' }), fileName.value || 'chat.txt');
  for (const [k, v] of Object.entries(extra ?? {})) fd.append(k, v);
  return fd;
}

function goUpload(pasteMode = false) {
  mode.value = pasteMode ? 'paste' : 'file';
  step.value = 'upload';
}

async function onText({ text, fileName: name }: { text: string; fileName: string }) {
  chatText.value = text;
  fileName.value = name;
  loadingPreview.value = true;
  try {
    const res: ImportPreview = await api.post('/import/preview', buildFormData(), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!res.participants?.length) throw new Error('No reconocí mensajes ahí. ¿Es el export de WhatsApp?');
    preview.value = res;
    herName.value = '';
    accepted.value = false;
    step.value = 'confirm';
  } catch (err: any) {
    toastStore.show(err.message || 'No pude leer esa conversación.', 'error');
  } finally {
    loadingPreview.value = false;
  }
}

function onError(message: string) {
  toastStore.show(message, 'error');
}

// Frases que rotan mientras el modelo trabaja: la espera larga sin feedback
// se siente como error.
const PHASES = [
  'Separando quién habla y cuándo…',
  'Midiendo quién inicia y quién cierra…',
  'Buscando cambios en el interés de ella…',
  'Detectando pruebas y señales…',
  'Armando el expediente…',
];
const phaseIdx = ref(0);
let phaseTimer: number | null = null;

async function analyze() {
  if (!canAnalyze.value) return;
  step.value = 'analyzing';
  phaseIdx.value = 0;
  phaseTimer = window.setInterval(() => {
    phaseIdx.value = Math.min(phaseIdx.value + 1, PHASES.length - 1);
  }, 3200);
  try {
    const res: FirstAnalysisResponse = await api.post('/analyze/first/text', buildFormData({ herName: herName.value }), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    firstAnalysisStore.setFromUpload(res);
    chatText.value = '';
    router.push('/analisis');
  } catch (err: any) {
    toastStore.show(err.message || 'No pude analizar la conversación.', 'error');
    step.value = 'confirm';
  } finally {
    if (phaseTimer) window.clearInterval(phaseTimer);
    phaseTimer = null;
  }
}

function back() {
  if (step.value === 'upload') step.value = 'guide';
  else if (step.value === 'confirm') { preview.value = null; step.value = 'upload'; }
  else router.push(backTo.value);
}

onUnmounted(() => { if (phaseTimer) window.clearInterval(phaseTimer); });
</script>

<template>
  <div class="add-page">
    <header class="add-head">
      <button type="button" class="head-back" :disabled="step === 'analyzing'" @click="back">
        <BaseIcon name="back" size="sm" color="cream" />
      </button>
      <AlfiiLogo size="sm" mode="full" />
      <ol class="dots" aria-label="Progreso">
        <li v-for="(s, i) in STEP_ORDER" :key="s" :class="{ done: i < stepIndex, on: i === stepIndex }"></li>
      </ol>
    </header>

    <main class="add-body">
      <Transition name="step" mode="out-in">
        <section :key="step" class="card">
          <span class="eyebrow">{{ meta.eyebrow }}</span>
          <h1>{{ meta.title }}</h1>

          <ExportGuide v-if="step === 'guide'" @ready="goUpload(false)" @paste="goUpload(true)" />

          <ImportDropzone
            v-else-if="step === 'upload'"
            v-model:mode="mode"
            :busy="loadingPreview"
            @text="onText"
            @error="onError"
          />

          <div v-else-if="step === 'confirm' && preview" class="confirm">
            <div class="stats">
              <div class="stat"><strong>{{ preview.messageCount }}</strong><span>mensajes</span></div>
              <div class="stat"><strong>{{ preview.participants.length }}</strong><span>personas</span></div>
              <div class="stat"><strong>{{ preview.mediaFiltered }}</strong><span>adjuntos fuera</span></div>
            </div>
            <p v-if="preview.willSummarize" class="note">
              <BaseIcon name="info" size="xs" color="muted" />
              Los últimos {{ preview.recentWindow }} mensajes entran literales; lo anterior se resume
              para que nada se pierda.
            </p>

            <div class="people">
              <button
                v-for="p in preview.participants"
                :key="p.name"
                type="button"
                class="person"
                :class="{ on: herName === p.name }"
                @click="herName = p.name"
              >
                <span class="avatar">{{ p.name.charAt(0).toUpperCase() }}</span>
                <span class="p-text">
                  <strong>{{ p.name }}</strong>
                  <small>{{ p.messageCount }} mensajes</small>
                </span>
                <BaseIcon :name="herName === p.name ? 'check' : 'arrowRight'" size="xs" :color="herName === p.name ? 'sage' : 'muted'" />
              </button>
            </div>

            <label class="consent" :class="{ on: accepted }">
              <input v-model="accepted" type="checkbox" />
              <span class="box"><BaseIcon v-if="accepted" name="check" size="xs" color="cream" /></span>
              <span class="consent-text">
                Acepto que Alfii analice esta conversación. El texto no se guarda; los adjuntos
                nunca viajan. Solo el análisis queda en el expediente de ella.
              </span>
            </label>

            <button type="button" class="btn-primary" :disabled="!canAnalyze" @click="analyze">
              <BaseIcon name="bolt" size="sm" color="cream" />
              <span>{{ herName ? `Analizar el chat con ${herName}` : 'Elige quién es ella' }}</span>
            </button>
          </div>

          <div v-else class="analyzing">
            <div class="pulse"><BaseIcon name="spinner" spin size="2xl" color="red" /></div>
            <p class="phase">{{ PHASES[phaseIdx] }}</p>
            <p class="hint">Está recorriendo toda la conversación con {{ herName }}. Toma un momento.</p>
          </div>
        </section>
      </Transition>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.add-page {
  min-height: 100dvh;
  background:
    radial-gradient(80% 50% at 50% -10%, rgba($alfii-red, 0.18), transparent 70%),
    $alfii-navy;
  color: $alfii-cream;
  @include stack(0);
}

.add-head {
  @include row(14px, center, space-between);
  padding: max(14px, env(safe-area-inset-top)) clamp(16px, 4vw, 32px) 12px;

  .head-back {
    @include center;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background-color: rgba($alfii-cream, 0.06);
    border: 1px solid rgba($alfii-cream, 0.12);

    &:disabled { opacity: 0.35; }
  }

  .dots {
    @include row(6px);
    list-style: none;
    margin: 0;
    padding: 0;

    li {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background-color: rgba($alfii-cream, 0.18);
      transition: width $dur-base $ease-out, background-color $dur-base $ease-out;

      &.done { background-color: $alfii-sage; }
      &.on { width: 24px; background-color: $alfii-red; }
    }
  }
}

.add-body {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 8px clamp(16px, 4vw, 32px) max(32px, env(safe-area-inset-bottom));
}

.card {
  @include stack(18px);
  width: 100%;
  max-width: 560px;

  .eyebrow {
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: $alfii-red;
  }

  h1 {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(28px, 5vw, 38px);
    line-height: $lh-tight;
    letter-spacing: -0.02em;
    margin: -8px 0 4px;
  }
}

.step-enter-active, .step-leave-active { transition: opacity $dur-base $ease-out, transform $dur-base $ease-out; }
.step-enter-from { opacity: 0; transform: translateY(14px); }
.step-leave-to { opacity: 0; transform: translateY(-10px); }

.confirm { @include stack(16px); }

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;

  .stat {
    @include stack(2px, center);
    padding: 12px 8px;
    border-radius: 14px;
    background-color: rgba($alfii-cream, 0.04);
    border: 1px solid rgba($alfii-cream, 0.1);

    strong { font-family: var(--font-display); font-size: $fs-xl; font-weight: 800; }
    span { font-size: $fs-2xs; color: rgba($alfii-cream, 0.55); }
  }
}

.note {
  @include row(8px, flex-start);
  font-size: $fs-2xs;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.6);
}

.people { @include stack(8px); }

.person {
  @include row(12px);
  padding: 12px 14px;
  border-radius: 14px;
  background-color: rgba($alfii-cream, 0.04);
  border: 1px solid rgba($alfii-cream, 0.12);
  text-align: left;
  transition: border-color $dur-fast $ease-out, background-color $dur-fast $ease-out;

  &:hover { border-color: rgba($alfii-cream, 0.3); }
  &.on { border-color: $alfii-sage; background-color: rgba($alfii-sage, 0.12); }

  .avatar {
    @include center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, $alfii-plum, rgba($alfii-red, 0.7));
    font-family: var(--font-display);
    font-weight: 800;
    font-size: $fs-md;
    flex-shrink: 0;
  }

  .p-text {
    @include stack(1px);
    flex: 1;
    strong { font-size: $fs-sm; }
    small { font-size: $fs-2xs; color: rgba($alfii-cream, 0.55); }
  }
}

.consent {
  @include row(12px, flex-start);
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba($alfii-cream, 0.12);
  cursor: pointer;
  transition: border-color $dur-fast $ease-out;

  &.on { border-color: rgba($alfii-sage, 0.6); }

  input { position: absolute; opacity: 0; pointer-events: none; }

  .box {
    @include center;
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 7px;
    border: 1.5px solid rgba($alfii-cream, 0.4);
    margin-top: 1px;
    transition: background-color $dur-fast $ease-out, border-color $dur-fast $ease-out;
  }

  &.on .box { background-color: $alfii-sage; border-color: $alfii-sage; }

  .consent-text {
    font-size: $fs-2xs;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.75);
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
  transition: transform $dur-fast $ease-out, opacity $dur-fast $ease-out;

  &:hover:not(:disabled) { transform: translateY(-1px); }
  &:disabled { opacity: 0.45; box-shadow: none; cursor: not-allowed; }
}

.analyzing {
  @include stack(14px, center);
  padding: 40px 0;
  text-align: center;

  .pulse {
    @include center;
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background-color: rgba($alfii-red, 0.12);
    box-shadow: 0 0 0 0 rgba($alfii-red, 0.35);
    animation: pulseRing 1.8s ease-out infinite;
  }

  .phase { font-size: $fs-md; font-weight: $fw-semibold; min-height: 1.4em; }
  .hint { font-size: $fs-2xs; color: rgba($alfii-cream, 0.55); max-width: 320px; }
}

@keyframes pulseRing {
  0% { box-shadow: 0 0 0 0 rgba($alfii-red, 0.35); }
  100% { box-shadow: 0 0 0 28px rgba($alfii-red, 0); }
}
</style>
