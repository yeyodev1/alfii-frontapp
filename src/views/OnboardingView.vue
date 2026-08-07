<script setup lang="ts">
import SkipDataModal from '@/components/modals/SkipDataModal.vue';
import LessonSheet from '@/components/modals/LessonSheet.vue';
import AlfiiLogo from '@/components/shared/AlfiiLogo.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import PowerCard from '@/components/shared/PowerCard.vue';
import BirthDatePicker from '@/components/shared/BirthDatePicker.vue';
import type { IconName } from '@/config/icons';
import { ref, onMounted, nextTick, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useModal } from '@/composables/useModal';
import { useToastStore } from '@/stores/toast';
import { getMyCard, type PowerCardData } from '@/services/card.service';
import api from '@/services/http';

const router = useRouter();
const { open } = useModal();
const toastStore = useToastStore();

const messages = ref<{ role: 'user' | 'alfii'; content: string }[]>([]);
const currentStep = ref(0);
const totalSteps = ref(8);
const stepKey = ref('PREFERRED_NAME');
const suggestedChips = ref<string[]>([]);
const chipOptions = ref<{ label: string; hint: string }[]>([]);
const inputMessage = ref('');
const sending = ref(false);
const dateInput = ref('');
const chatContainer = ref<HTMLElement | null>(null);

// La carta es la recompensa del test: se muestra al completar y, si el usuario
// ya la vio antes, se refresca en cada bloque para que vea subir las stats.
const card = ref<PowerCardData | null>(null);
const completed = ref(false);

const progressPercent = computed(() =>
  Math.round((currentStep.value / Math.max(totalSteps.value, 1)) * 100)
);

/** Los dos bloques sensibles avisan que se pueden saltar sin coste. */
const isSensitiveStep = computed(
  () => stepKey.value === 'INCOME' || stepKey.value === 'PHYSIQUE'
);

const needsDateInput = computed(() => stepKey.value === 'BIRTH_DATE');

/**
 * Que se pide en cada bloque, dicho sin rodeos.
 *
 * PORQUE existe este mapa: la pregunta solo vivia dentro de la burbuja del chat.
 * En cuanto el hilo crece, la pregunta sube y se pierde, y el usuario se queda
 * mirando un campo de texto sin saber que escribir. Esto lo deja fijo encima del
 * input, junto con lo que gana por responder.
 */
const STEP_META: Record<string, { title: string; ask: string; gain: string; icon: IconName }> = {
  PREFERRED_NAME: {
    title: '¿Cómo te llamo?',
    ask: 'Tu nombre, o como te dicen tus amigos.',
    gain: 'Para hablarte a ti, no a un usuario',
    icon: 'step.PREFERRED_NAME',
  },
  BIRTH_DATE: {
    title: '¿Cuándo naciste?',
    ask: 'Elige día, mes y año.',
    gain: 'Calibra el tono y las referencias',
    icon: 'step.BIRTH_DATE',
  },
  STATUS: {
    title: '¿A qué te dedicas?',
    ask: 'Tu trabajo y qué tan bien te va del 1 al 5.',
    gain: 'Sube EST · Estatus',
    icon: 'step.STATUS',
  },
  ASSETS: {
    title: '¿Qué juega a tu favor?',
    ask: 'Tus armas reales: físico, conversación, humor, ambición, lo que sea.',
    gain: 'Sube FIS · Físico',
    icon: 'step.ASSETS',
  },
  PHILOSOPHY: {
    title: '¿Qué buscas y qué no negocias?',
    ask: 'Qué quieres de esto y cuáles son tus líneas rojas.',
    gain: 'Sube MRC · Marco',
    icon: 'step.PHILOSOPHY',
  },
  PERSONALITY: {
    title: '¿Cómo eres cuando hablas?',
    ask: 'Directo, tranquilo, bromista... elige lo que más te suene.',
    gain: 'Define el estilo de tus scripts',
    icon: 'step.PERSONALITY',
  },
  INCOME: {
    title: '¿En qué rango andan tus ingresos?',
    ask: 'Un rango aproximado al mes. Si prefieres no decirlo, sáltalo.',
    gain: 'Sube EST · Estatus',
    icon: 'step.ASSETS',
  },
  PHYSIQUE: {
    title: '¿Altura y complexión?',
    ask: 'Estatura, peso si lo tienes a mano, y cómo te ves del 1 al 5. Opcional.',
    gain: 'Sube FIS · Físico',
    icon: 'bolt',
  },
};

const meta = computed(
  () => STEP_META[stepKey.value] ?? STEP_META.PREFERRED_NAME!
);

// En movil la carta ocupa demasiado si va siempre abierta: se muestra como una
// tira compacta que el usuario despliega cuando quiere ver el detalle.
const cardOpen = ref(false);

async function refreshCard() {
  try {
    card.value = await getMyCard();
  } catch {
    // La carta es un extra motivacional: si falla, el onboarding sigue. Nunca
    // debe bloquear el flujo por un adorno.
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
    const res: any = await api.get('/onboarding/opener');

    // Recargar la pagina no debe perder nada: el backend devuelve la
    // conversacion previa y se rehidrata tal cual. El opener solo se pinta
    // cuando de verdad es el primer turno.
    if (res.history?.length) {
      messages.value = res.history.map((m: any) => ({ role: m.role, content: m.content }));
    }
    if (res.reply) {
      messages.value.push({ role: 'alfii', content: res.reply });
    }

    // La carta ya puede tener stats de una sesion anterior.
    if (res.resumed) void refreshCard();

    currentStep.value = res.step;
    totalSteps.value = res.totalSteps;
    stepKey.value = res.stepKey;
    suggestedChips.value = res.suggestedChips || [];
    chipOptions.value = res.chipOptions || [];
    scrollToBottom();
  } catch (err: any) {
    toastStore.show(err.message || 'Error al iniciar la auditoría', 'error');
  }
});

async function sendTurn(payload: { message?: string; chipSelection?: string[]; birthDate?: string; skip?: string }) {
  if (sending.value) return;
  sending.value = true;

  if (payload.message) {
    messages.value.push({ role: 'user', content: payload.message });
  } else if (payload.chipSelection?.length) {
    messages.value.push({ role: 'user', content: payload.chipSelection.join(', ') });
  } else if (payload.birthDate) {
    messages.value.push({ role: 'user', content: `Fecha de nacimiento: ${payload.birthDate}` });
  }
  scrollToBottom();

  try {
    const res: any = await api.post('/onboarding/message', payload);
    messages.value.push({ role: 'alfii', content: res.reply });
    currentStep.value = res.step;
    totalSteps.value = res.totalSteps;
    stepKey.value = res.stepKey;
    suggestedChips.value = res.suggestedChips || [];
    chipOptions.value = res.chipOptions || [];
    inputMessage.value = '';
    dateInput.value = '';

    if (res.microLessonId) {
      open('lesson', LessonSheet, { lessonId: res.microLessonId });
    }

    // Refrescar la carta en cada bloque cerrado: el usuario ve la stat subir
    // justo despues de responder, que es lo que sostiene la mecanica.
    await refreshCard();

    if (res.completed) {
      completed.value = true;
      scrollToBottom();
    }
  } catch (err: any) {
    toastStore.show(err.message || 'Ocurrió un error', 'error');
  } finally {
    sending.value = false;
    scrollToBottom();
  }
}

function handleSkip() {
  const currentField = getCurrentFieldName();
  open('skipModal', SkipDataModal, {
    fieldName: currentField,
    onConfirmSkip: () => {
      sendTurn({ skip: currentField });
    },
  });
}

function getCurrentFieldName(): string {
  switch (stepKey.value) {
    case 'PREFERRED_NAME': return 'preferredName';
    case 'BIRTH_DATE': return 'birthDate';
    case 'STATUS': return 'status';
    case 'ASSETS': return 'assets';
    case 'PHILOSOPHY': return 'philosophy';
    case 'PERSONALITY': return 'personality';
    case 'INCOME': return 'income';
    case 'PHYSIQUE': return 'physique';
    default: return 'status';
  }
}

function sendMessage() {
  const text = inputMessage.value.trim();
  if (!text) return;
  sendTurn({ message: text });
}

function sendChip(chip: string) {
  sendTurn({ chipSelection: [chip] });
}

function sendDate() {
  if (!dateInput.value) return;
  sendTurn({ birthDate: dateInput.value });
}
</script>

<template>
  <div class="audit-page">
    <!-- Cabecera: progreso siempre visible, el usuario necesita ver que termina -->
    <header class="audit-head">
      <AlfiiLogo size="sm" mode="full" />
      <div class="progress-wrap">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
        </div>
        <span class="progress-label">Bloque {{ currentStep + 1 }} de {{ totalSteps }}</span>
      </div>
    </header>

    <div class="audit-body">
      <!-- Columna principal: conversacion y respuesta -->
      <div class="audit-main">
        <!-- Tira de la carta en movil: compacta y desplegable -->
        <div v-if="card" class="card-strip">
          <button class="strip-toggle" @click="cardOpen = !cardOpen">
            <span class="strip-rating">{{ card.overall }}</span>
            <span class="strip-txt">
              <strong>Tu carta</strong>
              <em>{{ card.tier }} · {{ card.completeness }}% completa</em>
            </span>
            <BaseIcon :name="cardOpen ? 'close' : 'expand'" size="xs" color="cream" />
          </button>
          <div v-if="cardOpen" class="strip-body">
            <PowerCard :card="card" :compact="true" />
          </div>
        </div>

        <div ref="chatContainer" class="audit-thread">
          <div v-for="(msg, idx) in messages" :key="idx" class="msg-row" :class="msg.role">
            <div class="bubble">
              <p>{{ msg.content }}</p>
            </div>
          </div>

          <div v-if="sending" class="msg-row alfii">
            <div class="bubble typing">
              <BaseIcon name="thinking" size="sm" color="red" spin />
              <span>Alfii está anotando...</span>
            </div>
          </div>

          <div v-if="completed" class="done-block">
            <h2>Matriz de Identidad completa</h2>
            <p>Desde ahora cada análisis se calibra con esto. Vas a notar la diferencia en los scripts.</p>
            <button class="primary-btn" @click="router.push('/vault')">
              <span>Ir a mis expedientes</span>
              <BaseIcon name="arrowRight" size="xs" color="cream" />
            </button>
          </div>
        </div>

        <!-- Zona de respuesta: primero QUE se pide, despues como responder -->
        <footer v-if="!completed" class="audit-input">
          <div class="step-brief">
            <div class="brief-head">
              <BaseIcon :name="meta.icon" size="sm" color="red" />
              <h3>{{ meta.title }}</h3>
              <span class="brief-gain">{{ meta.gain }}</span>
            </div>
            <p class="brief-ask">{{ meta.ask }}</p>
          </div>

          <!-- Fecha de nacimiento: selector propio, nunca el nativo -->
          <BirthDatePicker
            v-if="needsDateInput"
            v-model="dateInput"
            @confirm="sendDate"
          />

          <template v-else>
            <!-- Con explicacion cuando el backend la manda: elegir "Estratega
                 silencioso" sin saber que implica es elegir a ciegas. -->
            <div v-if="chipOptions.length" class="options-row">
              <button
                v-for="opt in chipOptions"
                :key="opt.label"
                class="option-card"
                :disabled="sending"
                @click="sendChip(opt.label)"
              >
                <strong>{{ opt.label }}</strong>
                <span>{{ opt.hint }}</span>
              </button>
            </div>

            <div v-else-if="suggestedChips.length" class="chips-row">
              <button
                v-for="chip in suggestedChips"
                :key="chip"
                class="chip"
                :disabled="sending"
                @click="sendChip(chip)"
              >
                {{ chip }}
              </button>
            </div>

            <div class="type-row">
              <textarea
                v-model="inputMessage"
                class="text-field"
                rows="1"
                placeholder="Escribe tu respuesta..."
                :disabled="sending"
                @keydown.enter.exact.prevent="sendMessage"
              ></textarea>
              <button class="send-btn" :disabled="sending || !inputMessage.trim()" @click="sendMessage">
                <BaseIcon name="arrowUp" size="sm" color="cream" />
              </button>
            </div>
          </template>

          <button class="skip-btn" :disabled="sending" @click="handleSkip">
            <BaseIcon name="forward" size="xs" color="muted" />
            <span>{{ isSensitiveStep ? 'Prefiero no decirlo' : 'Saltar este dato' }}</span>
          </button>
        </footer>
      </div>

      <!-- Columna lateral en escritorio: la carta siempre a la vista -->
      <aside v-if="card" class="card-col">
        <PowerCard :card="card" />
      </aside>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// Mobile-first. Flex exclusivamente, cero grid.
.audit-page {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  background-color: $alfii-navy;
  color: $alfii-cream;
}

.audit-head {
  flex: 0 0 auto;
  @include row(14px, center);
  padding: 12px clamp(16px, 4vw, 32px);
  border-bottom: 1px solid rgba($alfii-cream, 0.08);
  background-color: rgba($alfii-navy, 0.9);
  backdrop-filter: blur(16px);

  .progress-wrap {
    @include stack(5px);
    flex: 1;
  }

  .progress-track {
    height: 5px;
    border-radius: 3px;
    background-color: rgba($alfii-cream, 0.1);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 3px;
    background-color: $alfii-red;
    box-shadow: 0 0 10px rgba($alfii-red, 0.6);
    transition: width $dur-slow $ease-out;
  }

  .progress-label {
    font-size: $fs-2xs;
    font-weight: $fw-semibold;
    color: rgba($alfii-cream, 0.6);
  }
}

// min-height: 0 para que la conversacion scrollee dentro y no empuje el input.
.audit-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.audit-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

// --- carta en movil ---
.card-strip {
  flex: 0 0 auto;
  padding: 10px clamp(16px, 4vw, 32px) 0;

  .strip-toggle {
    @include row(12px, center);
    width: 100%;
    padding: 10px 14px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba($alfii-plum, 0.95) 0%, rgba($alfii-navy, 0.9) 100%);
    border: 1px solid rgba($alfii-cream, 0.14);
  }

  .strip-rating {
    font-size: $fs-xl;
    font-weight: $fw-extrabold;
    color: $alfii-cream;
    line-height: 1;
  }

  .strip-txt {
    @include stack(2px, flex-start);
    flex: 1;

    strong { font-size: $fs-xs; font-weight: $fw-bold; }
    em {
      font-style: normal;
      font-size: $fs-2xs;
      color: rgba($alfii-cream, 0.55);
    }
  }

  .strip-body {
    @include center;
    padding-top: 10px;
    animation: fadeInUp $dur-base $ease-out both;
  }
}

.audit-thread {
  flex: 1;
  min-height: 0;
  @include scroll-y;
  @include stack(12px);
  padding: 16px clamp(16px, 4vw, 32px);
}

.msg-row {
  @include row(0);

  &.user {
    justify-content: flex-end;

    .bubble {
      background-color: rgba($alfii-red, 0.2);
      border: 1px solid rgba($alfii-red, 0.4);
    }
  }

  &.alfii {
    justify-content: flex-start;

    .bubble {
      background-color: $alfii-plum;
      border: 1px solid rgba($alfii-cream, 0.1);
    }
  }

  .bubble {
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
}

.done-block {
  @include stack(12px, center);
  text-align: center;
  padding: 20px 0 8px;

  h2 { font-size: $fs-xl; font-weight: $fw-extrabold; }
  p { font-size: $fs-sm; color: rgba($alfii-cream, 0.75); max-width: 420px; }
}

.primary-btn {
  @include row(8px, center, center);
  padding: 14px 26px;
  border-radius: 13px;
  font-size: $fs-sm;
  font-weight: $fw-bold;
  background-color: $alfii-red;
  color: $alfii-cream;
  box-shadow: 0 8px 22px rgba($alfii-red, 0.42);
}

// --- zona de respuesta ---
.audit-input {
  flex: 0 0 auto;
  @include stack(10px);
  padding: 12px clamp(16px, 4vw, 32px);
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid rgba($alfii-cream, 0.08);
  background-color: rgba($alfii-plum, 0.4);
}

// Lo que se pide, fijo encima del input: en el hilo la pregunta se pierde en
// cuanto entran dos mensajes mas.
.step-brief {
  @include stack(5px);
  padding: 11px 14px;
  border-radius: 13px;
  background-color: rgba($alfii-red, 0.1);
  border: 1px solid rgba($alfii-red, 0.28);

  .brief-head {
    @include row(8px, center);

    h3 {
      flex: 1;
      font-size: $fs-sm;
      font-weight: $fw-bold;
      color: $alfii-cream;
    }
  }

  .brief-gain {
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: $alfii-sage;
    white-space: nowrap;
  }

  .brief-ask {
    font-size: $fs-xs;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.75);
  }
}

// Tarjetas con explicacion: se envuelven en varias filas en vez de scrollar en
// horizontal, porque una opcion que hay que descubrir arrastrando no se elige.
.options-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 34dvh;
  @include scroll-y;

  .option-card {
    @include stack(3px, flex-start);
    flex: 1 1 165px;
    text-align: left;
    padding: 10px 13px;
    border-radius: 13px;
    background-color: rgba($alfii-navy, 0.72);
    border: 1px solid rgba($alfii-cream, 0.14);
    transition: border-color $dur-fast $ease-out, background-color $dur-fast $ease-out;

    &:hover:not(:disabled) {
      border-color: rgba($alfii-red, 0.55);
      background-color: rgba($alfii-plum, 0.9);
    }

    &:disabled { opacity: 0.5; }

    strong {
      font-size: $fs-sm;
      font-weight: $fw-bold;
      color: $alfii-cream;
    }

    span {
      font-size: $fs-2xs;
      line-height: $lh-snug;
      color: rgba($alfii-cream, 0.6);
    }
  }
}

.chips-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;

  .chip {
    flex: 0 0 auto;
    padding: 9px 14px;
    border-radius: 20px;
    font-size: $fs-xs;
    font-weight: $fw-semibold;
    color: $alfii-cream;
    background-color: rgba($alfii-navy, 0.7);
    border: 1px solid rgba($alfii-cream, 0.16);
    transition: border-color $dur-fast $ease-out;

    &:hover:not(:disabled) { border-color: rgba($alfii-red, 0.6); }
    &:disabled { opacity: 0.5; }
  }
}

.type-row {
  @include row(10px, flex-end);
}

.text-field {
  flex: 1;
  padding: 12px 14px;
  border-radius: 13px;
  font-size: $fs-sm;
  color: $alfii-cream;
  background-color: rgba($alfii-navy, 0.8);
  border: 1px solid rgba($alfii-cream, 0.14);
  resize: none;
  max-height: 120px;

  &::placeholder { color: rgba($alfii-cream, 0.4); }
  &:focus { border-color: rgba($alfii-red, 0.5); }
}

.send-btn {
  @include center;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  border-radius: 13px;
  background-color: $alfii-red;
  box-shadow: 0 4px 14px rgba($alfii-red, 0.4);

  &:disabled { opacity: 0.4; box-shadow: none; }
}

.skip-btn {
  @include row(6px, center, center);
  align-self: center;
  font-size: $fs-2xs;
  font-weight: $fw-semibold;
  color: rgba($alfii-cream, 0.5);
  padding: 4px 8px;
}

// La carta lateral solo existe en escritorio: en movil vive en la tira de arriba.
.card-col {
  display: none;
}

@media (min-width: 1024px) {
  .audit-body {
    flex-direction: row;
    align-items: stretch;
    justify-content: center;
    gap: 28px;
    padding: 0 clamp(16px, 3vw, 32px);
  }

  .audit-main {
    margin: 0;
    max-width: 640px;
  }

  .card-strip { display: none; }

  .card-col {
    display: flex;
    flex: 0 0 300px;
    align-items: flex-start;
    justify-content: center;
    padding-top: 20px;
    @include scroll-y;
  }
}
</style>
