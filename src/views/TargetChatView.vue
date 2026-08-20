<script setup lang="ts">
import BaseIcon from '@/components/shared/BaseIcon.vue';
import AnalysisCard from '@/components/shared/AnalysisCard.vue';
import RiskBadge from '@/components/shared/RiskBadge.vue';
import HerProfileCard from '@/components/shared/HerProfileCard.vue';
import ImportSheet from '@/components/modals/ImportSheet.vue';
import ExpedienteSidebar from '@/components/shared/ExpedienteSidebar.vue';
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/http';
import { useModal } from '@/composables/useModal';
import { classifyFile, type DropKind } from '@/utils/chatFile';

import { useToastStore } from '@/stores/toast';

const route = useRoute();
// Reactivo: el sidebar navega entre /chat/:id reutilizando esta misma vista.
const routeId = computed(() => (Array.isArray(route.params.id) ? route.params.id[0] : route.params.id) || '');
let targetId = routeId.value;

const target = ref<any | null>(null);
const messages = ref<any[]>([]);
const inputMessage = ref('');
const sending = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const chatContainer = ref<HTMLElement | null>(null);
const toastStore = useToastStore();
const showProfile = ref(false);

/** Recarga el expediente sin tocar el hilo: lo dispara el evento SSE `state`. */
async function refreshTarget() {
  try {
    const res: any = await api.get(`/targets/${targetId}`);
    target.value = res.target;
  } catch {
    // Si falla, el header se queda con el estado anterior; no rompe el chat
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}

async function loadExpediente() {
  targetId = routeId.value;
  target.value = null;
  messages.value = [];
  showProfile.value = false;
  try {
    const resTarget: any = await api.get(`/targets/${targetId}`);
    target.value = resTarget.target;

    const resMsgs: any = await api.get(`/targets/${targetId}/messages`);
    messages.value = resMsgs.messages || [];

    // Saludo proactivo de reingreso
    const resGreet: any = await api.get(`/targets/${targetId}/greeting`);
    if (resGreet.greeting) {
      messages.value.push({
        _id: resGreet.messageId,
        role: 'alfii',
        kind: 'greeting',
        content: resGreet.greeting,
      });
    }

    scrollToBottom();
  } catch (err: any) {
    toastStore.show(err.message || 'Error al cargar expediente', 'error');
  }
}

onMounted(loadExpediente);
watch(routeId, (id, prev) => {
  if (id && id !== prev) void loadExpediente();
});

const STAGE_LABELS: Record<string, string> = {
  APERTURA: 'Apertura',
  CALIBRACION: 'Calibrando',
  ESCALADA: 'Escalando',
  CITA_AGENDADA: 'Cita agendada',
  POST_CITA: 'Después de la cita',
  ENFRIADO: 'Enfriado',
  CERRADO: 'Cerrado',
};

/** Cambios de expediente que el backend guardo en el turno: se muestran como
 *  chip de sistema, no como burbuja de Alfii. */
const CHANGE_LABELS: Record<string, string> = {
  stage: 'etapa',
  meters: 'medidores',
  archetype: 'arquetipo',
  riskFlag: 'red flag',
  riskLevel: 'nivel de riesgo',
  'herProfile.herAge': 'edad',
  'herProfile.herOccupation': 'ocupación',
  'herProfile.instagram': 'instagram',
  'herProfile.howWeMet': 'cómo se conocieron',
  'herProfile.knownSinceMonths': 'tiempo conociéndose',
  'herProfile.relationshipGoal': 'objetivo',
  'herProfile.notes': 'notas',
};

function changeLabel(content: string): string {
  const labels = String(content || '')
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean)
    .map((f) => CHANGE_LABELS[f] || f.replace(/^herProfile\./, ''));
  return labels.length ? labels.join(', ') : 'expediente';
}

function triggerUpload() {
  fileInput.value?.click();
}

const { open } = useModal();

/** Import del chat completo sobre este expediente: mas contexto que una captura. */
function openImport(initialFile?: File) {
  open('importChat', ImportSheet, {
    targetId,
    initialFile: initialFile ?? null,
    onAnalyzed: (res: any) => {
      messages.value.push({
        role: 'alfii',
        kind: 'analysis',
        analysisId: { payload: res.analysis },
        content: res.analysis.lead,
      });
      if (res.target) target.value = res.target;
      scrollToBottom();
    },
  });
}

async function handleFileSelected(event: Event) {
  const fileTarget = event.target as HTMLInputElement;
  const file = fileTarget.files?.[0];
  if (file) await analyzeScreenshot(file);
  fileTarget.value = '';
}

async function analyzeScreenshot(file: File) {
  sending.value = true;
  try {
    const formData = new FormData();
    formData.append('screenshot', file);

    const res: any = await api.post(`/targets/${targetId}/analyze`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    // La captura entra al hilo antes del analisis, igual que la persiste el
    // backend: el usuario ve primero lo que subio y despues la lectura.
    if (res.imageUrl) {
      messages.value.push({ role: 'user', kind: 'screenshot', imageUrl: res.imageUrl });
    }

    messages.value.push({
      role: 'alfii',
      kind: 'analysis',
      analysisId: { payload: res.analysis },
      content: res.analysis.lead,
    });

    if (res.target) target.value = res.target;
  } catch (err: any) {
    toastStore.show(err.message || 'Error al analizar la captura', 'error');
  } finally {
    sending.value = false;
    scrollToBottom();
  }
}

// ---------------------------------------------------------------------------
// Arrastrar y soltar sobre TODO el chat.
//
// Una captura se analiza al instante; un .txt/.zip de WhatsApp abre la hoja de
// import con el archivo ya leido. El overlay se pinta desde el primer
// dragenter en la ventana y adivina el tipo mirando dataTransfer.items para
// decirle al usuario que va a pasar ANTES de soltar.
// ---------------------------------------------------------------------------
const dragDepth = ref(0);
const dragKind = ref<DropKind>('unknown');
const isDragging = computed(() => dragDepth.value > 0);

function kindFromTransfer(dt: DataTransfer | null): DropKind {
  const item = dt?.items?.[0];
  if (!item || item.kind !== 'file') return 'unknown';
  // Durante dragover el nombre no viaja; solo el MIME. Sin MIME (algunos
  // .txt en Windows) se asume chat: es el caso mas comun al arrastrar texto.
  return item.type ? classifyFile({ type: item.type }) : 'chat';
}

function hasFiles(dt: DataTransfer | null): boolean {
  return !!dt && Array.from(dt.types || []).includes('Files');
}

function onDragEnter(e: DragEvent) {
  if (!hasFiles(e.dataTransfer)) return;
  e.preventDefault();
  dragDepth.value += 1;
  dragKind.value = kindFromTransfer(e.dataTransfer);
}

function onDragOver(e: DragEvent) {
  if (!hasFiles(e.dataTransfer)) return;
  e.preventDefault();
  if (e.dataTransfer) e.dataTransfer.dropEffect = sending.value ? 'none' : 'copy';
}

function onDragLeave(e: DragEvent) {
  if (!hasFiles(e.dataTransfer)) return;
  dragDepth.value = Math.max(0, dragDepth.value - 1);
}

async function onDrop(e: DragEvent) {
  if (!hasFiles(e.dataTransfer)) return;
  e.preventDefault();
  dragDepth.value = 0;
  if (sending.value) return;
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  const kind = classifyFile(file);
  if (kind === 'image') {
    await analyzeScreenshot(file);
  } else if (kind === 'chat') {
    openImport(file);
  } else {
    toastStore.show('Suelta una captura (imagen) o el chat exportado de WhatsApp (.txt / .zip).', 'error');
  }
}

const DROP_COPY: Record<DropKind, { title: string; sub: string; icon: string }> = {
  image: { title: 'Suelta la captura', sub: 'Alfii la lee y te dice qué responder.', icon: 'camera' },
  chat: { title: 'Suelta el chat de WhatsApp', sub: 'Importa la conversación completa al expediente.', icon: 'platform.whatsapp' },
  unknown: { title: 'Suelta para analizar', sub: 'Una captura o el .txt / .zip exportado de WhatsApp.', icon: 'upload' },
};
const dropCopy = computed(() => DROP_COPY[dragKind.value]);

async function sendTextMessage() {
  const text = inputMessage.value.trim();
  if (!text || sending.value) return;

  sending.value = true;
  inputMessage.value = '';

  messages.value.push({ role: 'user', kind: 'text', content: text });
  scrollToBottom();

  try {
    // Streaming SSE manual mediante fetch nativo
    const token = localStorage.getItem('alfii_token');
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8100/api'}/targets/${targetId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: text }),
    });

    if (!response.ok) {
      let detail = '';
      try { detail = (await response.json())?.message || ''; } catch { /* sin cuerpo */ }
      throw new Error(detail || `Error ${response.status} al enviar mensaje`);
    }
    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // Se toma la referencia REACTIVA del array: mutar el objeto plano no
    // dispara render y la burbuja se quedaba a medias hasta otro re-render.
    messages.value.push({ role: 'alfii', kind: 'text', content: '' });
    const alfiiMsg = messages.value[messages.value.length - 1];

    // Parser SSE: un evento = bloque separado por linea en blanco, con lineas
    // `event:` y `data:`. Se tolera \r\n y comentarios de heartbeat (`: ping`).
    const handleEvent = (eventName: string, rawData: string) => {
      let data: any = null;
      try { data = JSON.parse(rawData); } catch { data = rawData; }

      switch (eventName) {
        case 'delta':
          if (typeof data === 'string') {
            alfiiMsg.content += data;
            scrollToBottom();
          }
          break;
        case 'state':
          // El backend guardo cambios de expediente (medidores, datos de ella
          // extraidos del chat): se refresca el header y la tarjeta de perfil.
          void refreshTarget();
          break;
        case 'error':
          if (data?.partial) {
            alfiiMsg.truncated = true;
          }
          toastStore.show(data?.message || 'Se corto la respuesta', 'error');
          break;
        case 'done':
          if (data?.messageId) alfiiMsg._id = data.messageId;
          break;
      }
    };

    let buffer = '';
    const flushBlock = (block: string) => {
      let eventName = 'message';
      const dataLines: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith(':')) continue;
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
      }
      if (dataLines.length) handleEvent(eventName, dataLines.join('\n'));
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let sep: number;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        flushBlock(buffer.slice(0, sep));
        buffer = buffer.slice(sep + 2);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) flushBlock(buffer);

    if (!alfiiMsg.content.trim()) {
      messages.value.splice(messages.value.indexOf(alfiiMsg), 1);
    }
  } catch (err: any) {
    toastStore.show(err.message || 'Error al enviar mensaje', 'error');
  } finally {
    sending.value = false;
    scrollToBottom();
  }
}
</script>

<template>
  <div
    class="target-chat-view"
    :class="{ 'is-dragging': isDragging }"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- Overlay de arrastre: cubre todo el chat, no captura eventos (los
         recibe el contenedor) y dice que va a pasar segun el tipo de archivo. -->
    <Transition name="drop">
      <div v-if="isDragging" class="drop-overlay" aria-hidden="true">
        <div class="drop-frame" :class="`kind-${dragKind}`">
          <span class="drop-ring"></span>
          <span class="drop-ring delay"></span>
          <div class="drop-icon">
            <BaseIcon :name="(dropCopy.icon as any)" size="2xl" color="cream" />
          </div>
          <h2>{{ dropCopy.title }}</h2>
          <p>{{ dropCopy.sub }}</p>
          <div class="drop-chips">
            <span :class="{ on: dragKind === 'image' }"><BaseIcon name="camera" size="xs" color="cream" /> Captura</span>
            <span :class="{ on: dragKind === 'chat' }"><BaseIcon name="platform.whatsapp" size="xs" color="cream" /> Chat .txt / .zip</span>
          </div>
        </div>
      </div>
    </Transition>

    <ExpedienteSidebar class="desktop-only" :active-id="targetId" />

    <div class="chat-column">
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="handleFileSelected"
    />

    <!-- Header de la chica -->
    <header v-if="target" class="target-header">
      <RouterLink to="/vault" class="back-btn">
        <BaseIcon name="back" size="sm" color="cream" />
      </RouterLink>

      <span class="header-avatar desktop-only" :class="`accent-${target.accentColor || 'red'}`">
        {{ target.avatarInitial || String(target.displayName || '?').charAt(0).toUpperCase() }}
      </span>

      <!-- Tappable: abre/cierra la ficha de ella sin salir del chat -->
      <button class="target-info" type="button" @click="showProfile = !showProfile">
        <h3>{{ target.displayName }}</h3>
        <div class="sub-row">
          <span class="arq" v-if="target.archetype">{{ target.archetype.label }}</span>
          <span class="sep" v-if="target.archetype">·</span>
          <span class="stage">{{ STAGE_LABELS[target.stage] || target.stage }}</span>
          <template v-if="target.herProfile?.herAge">
            <span class="sep">·</span>
            <span class="stage">{{ target.herProfile.herAge }} años</span>
          </template>
          <BaseIcon :name="showProfile ? 'arrowUp' : 'arrowRight'" size="xs" color="muted" />
        </div>
      </button>

      <div class="header-actions">
        <RiskBadge :level="(target.risk?.level as any) || 'LIMPIO'" />
        <RouterLink class="profile-btn desktop-only" :to="`/chat/${targetId}/ficha`">
          <BaseIcon name="archetype" size="xs" color="sage" />
          Ficha de ella
        </RouterLink>
      </div>
    </header>

    <!-- Ficha de ella: colapsable bajo el header -->
    <div v-if="target && showProfile" class="profile-panel">
      <div class="profile-grid">
        <RouterLink class="ficha-link" :to="`/chat/${targetId}/ficha`">
          <span class="ficha-link__mark">{{ target.avatarInitial || '?' }}</span>
          <span class="ficha-link__text">
            <strong>Ver ficha técnica</strong>
            <small>Carta de personaje, evolución e hitos con fechas</small>
          </span>
          <BaseIcon name="arrowRight" size="xs" color="muted" />
        </RouterLink>
        <HerProfileCard
          :target-id="targetId"
          :display-name="target.displayName"
          :her-profile="target.herProfile"
          :completeness="target.herCompleteness"
          @saved="(t: any) => (target = t)"
        />
      </div>
    </div>

    <!-- Hilo de mensajes -->
    <div ref="chatContainer" class="chat-thread">
      <div class="thread-inner">
      <div
        v-for="(msg, idx) in messages"
        :key="msg._id || idx"
        class="msg-row"
        :class="[msg.role, { system: msg.kind === 'stateChange' }]"
      >
        <!-- Cambio de expediente: chip de sistema, no burbuja -->
        <span v-if="msg.kind === 'stateChange'" class="state-chip">
          <BaseIcon name="check" size="xs" color="sage" />
          Expediente actualizado · {{ changeLabel(msg.content) }}
        </span>

        <!-- Captura subida: queda en el hilo junto a su analisis -->
        <div v-else-if="msg.kind === 'screenshot' && msg.imageUrl" class="screenshot-msg">
          <img :src="msg.imageUrl" alt="Captura analizada" loading="lazy" />
        </div>

        <!-- Analisis: entra plegado, el usuario lo abre si quiere el detalle -->
        <div v-else-if="msg.kind === 'analysis'" class="analysis-msg">
          <AnalysisCard :analysis="msg.analysisId?.payload || msg.analysis" collapsible />
        </div>

        <!-- Texto normal o saludo -->
        <template v-else>
          <span v-if="msg.role === 'alfii'" class="alfii-mark desktop-only">a</span>
          <div class="text-bubble" :class="{ truncated: msg.truncated }">
            <p>{{ msg.content }}</p>
            <span v-if="msg.truncated" class="truncated-note">Respuesta cortada · pídele que continúe</span>
          </div>
        </template>
      </div>

      <div v-if="sending" class="msg-row alfii">
        <span class="alfii-mark desktop-only">a</span>
        <div class="text-bubble typing">
          <BaseIcon name="thinking" size="sm" color="red" spin />
          <span>Alfii está leyendo...</span>
        </div>
      </div>
      </div>
    </div>

    <!-- Input bar -->
    <footer class="input-bar">
      <div class="input-inner">
      <button class="upload-btn" @click="triggerUpload" :disabled="sending">
        <BaseIcon name="camera" size="base" color="cream" />
      </button>

      <button
        class="upload-btn"
        title="Importar conversación completa"
        :disabled="sending"
        @click="openImport()"
      >
        <BaseIcon name="platform.whatsapp" size="base" color="cream" />
      </button>

      <textarea
        v-model="inputMessage"
        placeholder="Pregúntale a Alfii..."
        rows="1"
        @keydown.enter.prevent="sendTextMessage"
      ></textarea>

      <button
        class="send-btn"
        :disabled="!inputMessage.trim() || sending"
        @click="sendTextMessage"
      >
        <BaseIcon name="arrowUp" size="sm" color="cream" />
      </button>
      </div>
    </footer>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.target-chat-view {
  @include row(0, stretch);
  height: 100dvh;
  width: 100%;
}

// Sidebar de expedientes solo en escritorio. En movil el flujo es
// Boveda -> expediente con el boton de volver del header.
.desktop-only { display: none !important; }

@media (min-width: 1024px) {
  .desktop-only { display: flex !important; }
  .target-header .back-btn { display: none; }
}

.chat-column {
  @include stack(0);
  flex: 1;
  min-width: 0;
  height: 100%;
}

// Padding lateral del chat; el ancho de lectura lo fija .thread-inner.
$chat-pad: clamp(16px, 3vw, 32px);
$reading-width: 860px;

.hidden-input { display: none; }

.target-header {
  @include row(12px, center);
  flex: 0 0 auto;
  padding: 12px $chat-pad;
  background-color: rgba($alfii-plum, 0.9);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba($alfii-cream, 0.08);

  .back-btn { padding: 6px; }

  .header-avatar {
    @include center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    font-weight: $fw-bold;
    font-size: $fs-md;
    color: $alfii-cream;
    &.accent-red { background-color: rgba($alfii-red, 0.3); border: 1px solid $alfii-red; }
    &.accent-sage { background-color: rgba($alfii-sage, 0.3); border: 1px solid $alfii-sage; }
    &.accent-cream { background-color: rgba($alfii-cream, 0.2); border: 1px solid $alfii-cream; }
    &.accent-plum { background-color: rgba($alfii-plum, 0.9); border: 1px solid rgba($alfii-cream, 0.2); }
    &.accent-navy { background-color: rgba($alfii-navy, 0.8); border: 1px solid rgba($alfii-cream, 0.2); }
  }

  .header-actions {
    @include row(10px, center);
  }

  .profile-btn {
    @include row(8px, center);
    padding: 9px 14px;
    border-radius: 12px;
    background-color: rgba($alfii-navy, 0.6);
    border: 1px solid rgba($alfii-cream, 0.14);
    color: $alfii-cream;
    font-size: $fs-xs;
    font-weight: $fw-semibold;
    cursor: pointer;
    white-space: nowrap;
    transition: border-color $dur-fast $ease-out;
    &:hover { border-color: rgba($alfii-cream, 0.3); }
  }

  .target-info {
    flex: 1;
    @include stack(2px);
    background: transparent;
    text-align: left;
    cursor: pointer;

    h3 { font-size: $fs-md; font-weight: $fw-bold; color: $alfii-cream; }
    .sub-row {
      @include row(6px);
      font-size: $fs-2xs;
      color: rgba($alfii-cream, 0.6);
      .arq { color: $alfii-sage; font-weight: $fw-bold; }
      .sep { color: rgba($alfii-cream, 0.35); }
    }
  }
}

.profile-panel {
  flex: 0 0 auto;
  padding: 10px $chat-pad;
  border-bottom: 1px solid rgba($alfii-cream, 0.08);
  background-color: rgba($alfii-navy, 0.5);
  animation: fadeInUp $dur-base $ease-out both;
}

// min-height: 0 para que el hilo scrollee dentro y no empuje la barra de input
// fuera de pantalla cuando la conversacion crece.
.chat-thread {
  flex: 1;
  min-height: 0;
  @include scroll-y;
  padding: 16px $chat-pad;

  @media (min-width: 1024px) {
    padding-top: 28px;
    padding-bottom: 28px;
  }
}

.thread-inner {
  @include stack(12px);
  width: 100%;
  max-width: $reading-width;
  margin: 0 auto;

  @media (min-width: 1024px) { gap: 14px; }
}

.profile-panel {
  @include scroll-y;
  max-height: 70vh;
}

.profile-grid {
  @include stack(14px);
  max-width: $reading-width;
  margin: 0 auto;
}

.ficha-link {
  @include row(12px, center);
  padding: 12px 14px;
  border-radius: 14px;
  background: linear-gradient(160deg, rgba($alfii-red, 0.16) 0%, rgba($alfii-plum, 0.9) 100%);
  border: 1px solid rgba($alfii-red, 0.4);
  color: $alfii-cream;
  text-decoration: none;

  &__mark {
    @include center;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background-color: rgba($alfii-red, 0.3);
    border: 1px solid $alfii-red;
    font-weight: $fw-extrabold;
    font-size: $fs-md;
  }
  &__text {
    @include stack(2px);
    flex: 1;
    strong { font-size: $fs-sm; font-weight: $fw-bold; }
    small { font-size: $fs-2xs; color: rgba($alfii-cream, 0.6); }
  }
}

.msg-row {
  @include row(0);

  &.user {
    justify-content: flex-end;
    .text-bubble {
      background-color: rgba($alfii-red, 0.2);
      border: 1px solid rgba($alfii-red, 0.4);
      color: $alfii-cream;
      border-bottom-right-radius: 4px;
    }
  }

  &.system {
    justify-content: center;
    .state-chip {
      @include row(6px, center);
      padding: 5px 12px;
      border-radius: 999px;
      background-color: rgba($alfii-sage, 0.12);
      border: 1px solid rgba($alfii-sage, 0.3);
      color: $alfii-sage;
      font-size: 12px;
      font-weight: $fw-semibold;
    }
  }

  &.alfii {
    justify-content: flex-start;
    align-items: flex-end;
    gap: 10px;

    .alfii-mark {
      @include center;
      flex: 0 0 28px;
      width: 28px;
      height: 28px;
      border-radius: 9px;
      background-color: $alfii-red;
      color: $alfii-cream;
      font-weight: $fw-extrabold;
      font-size: 15px;
    }

    .text-bubble {
      background-color: $alfii-plum;
      border: 1px solid rgba($alfii-cream, 0.1);
      color: $alfii-cream;
      border-bottom-left-radius: 4px;
    }
  }

  .text-bubble {
    max-width: min(85%, 72ch);
    padding: 12px 16px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;

    @media (min-width: 1024px) {
      max-width: 70%;
      font-size: $fs-base;
      line-height: 1.6;
    }

    &.truncated { border-style: dashed; }

    .truncated-note {
      display: block;
      margin-top: 8px;
      font-size: $fs-2xs;
      color: rgba($alfii-cream, 0.55);
      font-style: italic;
    }
    border-radius: 16px;
    font-size: $fs-sm;
    line-height: $lh-relaxed;
    animation: fadeInUp $dur-base $ease-out both;

    &.typing {
      @include row(8px, center);
      font-size: $fs-xs;
      color: rgba($alfii-cream, 0.6);
    }
  }

  .analysis-msg {
    width: 100%;
    animation: fadeInUp $dur-base $ease-out both;
  }

  // La captura se muestra acotada: es contexto del analisis, no la pieza
  // principal del hilo.
  .screenshot-msg {
    max-width: min(72%, 420px);
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba($alfii-cream, 0.14);
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.4);

    img {
      display: block;
      width: 100%;
      max-height: 420px;
      object-fit: cover;
    }
  }
}

.input-bar {
  flex: 0 0 auto;
  padding: 12px $chat-pad;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background-color: rgba($alfii-navy, 0.95);
  border-top: 1px solid rgba($alfii-cream, 0.08);

  @media (min-width: 1024px) { padding-bottom: 20px; }

  .input-inner {
    @include row(8px, center);
    width: 100%;
    max-width: $reading-width;
    margin: 0 auto;
  }

  .upload-btn {
    padding: 12px;
    background-color: rgba($alfii-plum, 0.8);
    border-radius: 12px;
  }

  textarea {
    flex: 1;
    padding: 12px 16px;
    min-height: 46px;
    max-height: 160px;
    background-color: rgba($alfii-plum, 0.6);
    border: 1px solid rgba($alfii-cream, 0.15);
    border-radius: 12px;
    font-size: $fs-sm;
    resize: none;

    &:focus { border-color: $alfii-red; }
  }

  .send-btn {
    padding: 12px;
    background-color: $alfii-red;
    border-radius: 12px;

    &:disabled { opacity: 0.5; }
  }
}

// ---------------------------------------------------------------------------
// Overlay de arrastrar y soltar
// ---------------------------------------------------------------------------
.target-chat-view { position: relative; }

.drop-overlay {
  position: absolute;
  inset: 0;
  z-index: 80;
  pointer-events: none;
  @include center;
  padding: clamp(16px, 4vw, 40px);
  background:
    radial-gradient(60% 50% at 50% 50%, rgba($alfii-red, 0.22), transparent 70%),
    rgba($alfii-navy, 0.82);
  backdrop-filter: blur(14px) saturate(1.2);
}

.drop-frame {
  @include stack(10px, center);
  position: relative;
  width: min(560px, 100%);
  padding: clamp(36px, 6vw, 56px) clamp(20px, 4vw, 40px);
  border-radius: 28px;
  border: 2px dashed rgba($alfii-cream, 0.45);
  background-color: rgba($alfii-plum, 0.55);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba($alfii-cream, 0.06);
  text-align: center;
  animation: dropFloat 2.4s $ease-in-out infinite;

  &.kind-image { border-color: $alfii-red; }
  &.kind-chat { border-color: $alfii-sage; }

  .drop-ring {
    position: absolute;
    inset: -2px;
    border-radius: inherit;
    border: 2px solid rgba($alfii-cream, 0.35);
    animation: dropRing 1.8s $ease-out infinite;
    &.delay { animation-delay: 0.9s; }
  }

  .drop-icon {
    @include center;
    width: 96px;
    height: 96px;
    border-radius: 50%;
    margin-bottom: 8px;
    background: linear-gradient(135deg, rgba($alfii-red, 0.9), rgba($alfii-sage, 0.7));
    box-shadow: 0 0 0 10px rgba($alfii-cream, 0.06), 0 18px 50px rgba($alfii-red, 0.45);
    animation: dropPulse 1.6s $ease-in-out infinite;
  }

  h2 {
    font-family: var(--font-display);
    font-weight: 800;
    font-size: clamp(24px, 4vw, 34px);
    letter-spacing: -0.02em;
    line-height: $lh-tight;
    color: $alfii-cream;
  }

  p {
    font-size: $fs-sm;
    color: rgba($alfii-cream, 0.72);
    max-width: 380px;
  }

  .drop-chips {
    @include row(8px, center, center);
    margin-top: 12px;
    flex-wrap: wrap;

    span {
      @include row(6px);
      padding: 7px 12px;
      border-radius: 999px;
      font-size: $fs-2xs;
      font-weight: $fw-semibold;
      color: rgba($alfii-cream, 0.55);
      border: 1px solid rgba($alfii-cream, 0.14);
      transition: all $dur-fast $ease-out;

      &.on {
        color: $alfii-cream;
        border-color: rgba($alfii-cream, 0.6);
        background-color: rgba($alfii-cream, 0.1);
        transform: scale(1.06);
      }
    }
  }
}

.drop-enter-active { transition: opacity $dur-base $ease-out; .drop-frame { transition: transform $dur-slow $ease-spring; } }
.drop-leave-active { transition: opacity $dur-fast $ease-out; }
.drop-enter-from, .drop-leave-to { opacity: 0; .drop-frame { transform: scale(0.92); } }

@keyframes dropFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes dropPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.07); }
}
@keyframes dropRing {
  0% { transform: scale(1); opacity: 0.7; }
  100% { transform: scale(1.06); opacity: 0; }
}
</style>
