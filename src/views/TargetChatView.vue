<script setup lang="ts">
import BaseIcon from '@/components/shared/BaseIcon.vue';
import AnalysisCard from '@/components/shared/AnalysisCard.vue';
import RiskBadge from '@/components/shared/RiskBadge.vue';
import HerProfileCard from '@/components/shared/HerProfileCard.vue';
import ImportSheet from '@/components/modals/ImportSheet.vue';
import { ref, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/http';
import { useModal } from '@/composables/useModal';

import { useToastStore } from '@/stores/toast';

const route = useRoute();
const targetId = (Array.isArray(route.params.id) ? route.params.id[0] : route.params.id) || '';

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

onMounted(async () => {
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
});

function triggerUpload() {
  fileInput.value?.click();
}

const { open } = useModal();

/** Import del chat completo sobre este expediente: mas contexto que una captura. */
function openImport() {
  open('importChat', ImportSheet, {
    targetId,
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
  if (!file) return;

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

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let alfiiMsg = { role: 'alfii', kind: 'text', content: '' };
    messages.value.push(alfiiMsg);

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: delta')) {
          const match = line.match(/data: ("(.*)"|.*)/);
          if (match) {
            try {
              const rawData = line.split('data: ')[1] || '""';
              const delta = JSON.parse(rawData);
              alfiiMsg.content += delta;
              scrollToBottom();
            } catch {
              // Parse fallback
            }
          }
        } else if (line.startsWith('event: state')) {
          // El backend guardo cambios de expediente (medidores, datos de ella
          // extraidos del chat): se refresca el header y la tarjeta de perfil.
          void refreshTarget();
        }
      }
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
  <div class="target-chat-view">
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

      <!-- Tappable: abre/cierra la ficha de ella sin salir del chat -->
      <button class="target-info" type="button" @click="showProfile = !showProfile">
        <h3>{{ target.displayName }}</h3>
        <div class="sub-row">
          <span class="arq" v-if="target.archetype">{{ target.archetype.label }}</span>
          <span class="stage">{{ target.stage }}</span>
          <BaseIcon :name="showProfile ? 'arrowUp' : 'arrowRight'" size="xs" color="muted" />
        </div>
      </button>

      <RiskBadge :level="(target.risk?.level as any) || 'LIMPIO'" />
    </header>

    <!-- Ficha de ella: colapsable bajo el header -->
    <div v-if="target && showProfile" class="profile-panel">
      <HerProfileCard
        :target-id="targetId"
        :display-name="target.displayName"
        :her-profile="target.herProfile"
        :completeness="target.herCompleteness"
        @saved="(t: any) => (target = t)"
      />
    </div>

    <!-- Hilo de mensajes -->
    <div ref="chatContainer" class="chat-thread">
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        class="msg-row"
        :class="msg.role"
      >
        <!-- Captura subida: queda en el hilo junto a su analisis -->
        <div v-if="msg.kind === 'screenshot' && msg.imageUrl" class="screenshot-msg">
          <img :src="msg.imageUrl" alt="Captura analizada" loading="lazy" />
        </div>

        <!-- Analisis: entra plegado, el usuario lo abre si quiere el detalle -->
        <div v-else-if="msg.kind === 'analysis'" class="analysis-msg">
          <AnalysisCard :analysis="msg.analysisId?.payload || msg.analysis" collapsible />
        </div>

        <!-- Texto normal o saludo -->
        <div v-else class="text-bubble">
          <p>{{ msg.content }}</p>
        </div>
      </div>

      <div v-if="sending" class="msg-row alfii">
        <div class="text-bubble typing">
          <BaseIcon name="thinking" size="sm" color="red" spin />
          <span>Alfii está leyendo...</span>
        </div>
      </div>
    </div>

    <!-- Input bar -->
    <footer class="input-bar">
      <button class="upload-btn" @click="triggerUpload" :disabled="sending">
        <BaseIcon name="camera" size="base" color="cream" />
      </button>

      <button
        class="upload-btn"
        title="Importar conversación completa"
        :disabled="sending"
        @click="openImport"
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
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.target-chat-view {
  @include stack(0);
  height: 100dvh;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.hidden-input { display: none; }

.target-header {
  @include row(12px, center);
  flex: 0 0 auto;
  padding: 12px clamp(16px, 4vw, 24px);
  background-color: rgba($alfii-plum, 0.9);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba($alfii-cream, 0.08);

  .back-btn { padding: 6px; }

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
    }
  }
}

.profile-panel {
  flex: 0 0 auto;
  padding: 10px clamp(16px, 4vw, 24px);
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
  padding: 16px clamp(16px, 4vw, 24px);
  @include stack(12px);
}

.msg-row {
  @include row(0);

  &.user {
    justify-content: flex-end;
    .text-bubble {
      background-color: rgba($alfii-red, 0.2);
      border: 1px solid rgba($alfii-red, 0.4);
      color: $alfii-cream;
    }
  }

  &.alfii {
    justify-content: flex-start;
    .text-bubble {
      background-color: $alfii-plum;
      border: 1px solid rgba($alfii-cream, 0.1);
      color: $alfii-cream;
    }
  }

  .text-bubble {
    max-width: 85%;
    padding: 12px 16px;
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
    max-width: 72%;
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
  @include row(8px, center);
  flex: 0 0 auto;
  padding: 12px clamp(16px, 4vw, 24px);
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background-color: rgba($alfii-navy, 0.95);
  border-top: 1px solid rgba($alfii-cream, 0.08);

  .upload-btn {
    padding: 12px;
    background-color: rgba($alfii-plum, 0.8);
    border-radius: 12px;
  }

  textarea {
    flex: 1;
    padding: 12px 16px;
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
</style>
