<script setup lang="ts">
import SkipDataModal from '@/components/modals/SkipDataModal.vue';
import LessonSheet from '@/components/modals/LessonSheet.vue';
import CardSheet from '@/components/modals/CardSheet.vue';
import MissionModal from '@/components/modals/MissionModal.vue';
import AlfiiLogo from '@/components/shared/AlfiiLogo.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import PowerCard from '@/components/shared/PowerCard.vue';
import BirthDatePicker from '@/components/shared/BirthDatePicker.vue';
import type { IconName } from '@/config/icons';
import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { gsap } from '@/composables/useGsap';
import { useRouter } from 'vue-router';
import { useModal } from '@/composables/useModal';
import { useToastStore } from '@/stores/toast';
import { getMyCard, type PowerCardData } from '@/services/card.service';
import api from '@/services/http';

const router = useRouter();
const { open, close: closeModal } = useModal();
const toastStore = useToastStore();

const messages = ref<{ role: 'user' | 'alfii'; content: string }[]>([]);
const currentStep = ref(0);
const totalSteps = ref(8);
const stepKey = ref('PREFERRED_NAME');
// Solo chipOptions: el backend manda las mismas opciones en suggestedChips pero
// sin su explicacion, y una opcion sin explicacion es una opcion que se elige a
// ciegas. Aqui siempre se pinta la version con hint.
const chipOptions = ref<{ label: string; hint: string }[]>([]);
/** Lo que Alfii recuerda del usuario, atado a la pregunta de este turno. */
const contextNote = ref('');
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
type StepMeta = {
  title: string;
  ask: string;
  gain: string;
  statCode: string;
  statName: string;
  icon: IconName;
};

const STEP_META: Record<string, StepMeta> = {
  PREFERRED_NAME: {
    title: '¿Cómo te llamo?',
    ask: 'Tu nombre, o como te dicen tus amigos.',
    gain: 'Para hablarte a ti, no a un usuario',
    statCode: 'ID',
    statName: 'Identidad',
    icon: 'step.PREFERRED_NAME',
  },
  BIRTH_DATE: {
    title: '¿Cuándo naciste?',
    ask: 'Elige día, mes y año.',
    gain: 'Calibra el tono y las referencias',
    statCode: 'ID',
    statName: 'Identidad',
    icon: 'step.BIRTH_DATE',
  },
  STATUS: {
    title: '¿A qué te dedicas?',
    ask: 'Tu trabajo y qué tan bien te va del 1 al 5.',
    gain: 'Sube EST · Estatus',
    statCode: 'EST',
    statName: 'Estatus',
    icon: 'step.STATUS',
  },
  ASSETS: {
    title: '¿Qué juega a tu favor?',
    ask: 'Tus armas reales: físico, conversación, humor, ambición, lo que sea.',
    gain: 'Sube FIS · Físico',
    statCode: 'FIS',
    statName: 'Físico',
    icon: 'step.ASSETS',
  },
  PHILOSOPHY: {
    title: '¿Qué buscas y qué no negocias?',
    ask: 'Qué quieres de esto y cuáles son tus líneas rojas.',
    gain: 'Sube MRC · Marco',
    statCode: 'MRC',
    statName: 'Marco',
    icon: 'step.PHILOSOPHY',
  },
  PERSONALITY: {
    title: '¿Cómo eres cuando hablas?',
    ask: 'Directo, tranquilo, bromista... elige lo que más te suene.',
    gain: 'Define el estilo de tus scripts',
    statCode: 'EST',
    statName: 'Estilo',
    icon: 'step.PERSONALITY',
  },
  INCOME: {
    title: '¿En qué rango andan tus ingresos?',
    ask: 'Un rango aproximado al mes. Si prefieres no decirlo, sáltalo.',
    gain: 'Sube EST · Estatus',
    statCode: 'EST',
    statName: 'Estatus',
    icon: 'step.ASSETS',
  },
  PHYSIQUE: {
    title: '¿Altura y complexión?',
    ask: 'Estatura, peso si lo tienes a mano, y cómo te ves del 1 al 5. Opcional.',
    gain: 'Sube FIS · Físico',
    statCode: 'FIS',
    statName: 'Físico',
    icon: 'bolt',
  },
};

const meta = computed(
  () => STEP_META[stepKey.value] ?? STEP_META.PREFERRED_NAME!
);

/**
 * Lo que Alfii acaba de preguntar, no lo que el bloque pregunta en general.
 *
 * PORQUE: el titulo del bloque es fijo ("¿Qué buscas y qué no negocias?") pero
 * dentro del bloque hay varias sub-preguntas. Mostrar el texto estatico encima
 * de unas opciones que responden a otra cosa era exactamente lo que descuadraba:
 * el usuario leia una pregunta y tocaba la respuesta de la anterior.
 */
const currentAsk = computed(() => {
  const lastAlfii = [...messages.value].reverse().find((m) => m.role === 'alfii');
  return lastAlfii?.content.trim() || meta.value.ask;
});

/**
 * El panel de mision: abierto por defecto siempre que haya opciones.
 *
 * PORQUE abierto y no detras de un boton: las opciones SON la pregunta. Si hay
 * que descubrirlas, el usuario acaba escribiendo a mano lo que podia tocar, que
 * es justo la friccion que el bloque intenta quitar. Se cierra al elegir, al
 * saltar, o cuando el usuario decide escribirlo el mismo.
 */
const missionOpen = ref(false);
const missionDismissed = ref(false);

const hasMission = computed(
  () => !completed.value && !needsDateInput.value && chipOptions.value.length > 0
);

const showMission = computed(() => hasMission.value && missionOpen.value && !sending.value);

const textField = ref<HTMLTextAreaElement | null>(null);

function writeInstead() {
  missionOpen.value = false;
  missionDismissed.value = true;
  nextTick(() => textField.value?.focus());
}

function reopenMission() {
  missionDismissed.value = false;
  missionOpen.value = true;
}

function openCardSheet() {
  if (!card.value) return;
  open('cardSheet', CardSheet, { card: card.value });
}

/**
 * Destello cuando la carta sube.
 *
 * La recompensa del bloque es ver moverse el numero. Si sube en silencio
 * mientras el usuario mira el chat, el bloque se siente como un formulario.
 */
const statDelta = ref(0);
const cardChip = ref<HTMLElement | null>(null);
const progressFill = ref<HTMLElement | null>(null);

/** Con movimiento reducido no hay coreografia: los valores cambian y ya. */
const motionOk =
  typeof window !== 'undefined' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function flashStatGain(before: number, after: number) {
  if (after <= before) return;
  statDelta.value = after - before;

  if (motionOk) {
    // Sacudida corta con rebote sobre el chip. Es el unico premio visible del
    // bloque cerrado, y un numero que cambia sin moverse no se ve.
    void nextTick(() => {
      if (!cardChip.value) return;
      gsap
        .timeline()
        .fromTo(
          cardChip.value,
          { scale: 1 },
          { scale: 1.22, duration: 0.22, ease: 'back.out(3)' }
        )
        .to(cardChip.value, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.45)' });

      gsap.fromTo(
        cardChip.value.querySelector('.gain-pop'),
        { y: 10, scale: 0.6, opacity: 0 },
        { y: -14, scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' }
      );
    });
  }

  setTimeout(() => {
    statDelta.value = 0;
  }, 2200);
}

/**
 * La barra de progreso se tensa al avanzar de bloque.
 *
 * Con una `transition` de CSS el salto es lineal y pasa desapercibido justo en
 * el momento que mas importa: el usuario acaba de contestar y quiere ver que
 * avanzo. Con overshoot elastico el avance se nota aunque solo sean 12 puntos.
 */
watch(
  progressPercent,
  (to, from) => {
    if (!progressFill.value) return;

    if (!motionOk) {
      gsap.set(progressFill.value, { width: `${to}%` });
      return;
    }

    gsap.fromTo(
      progressFill.value,
      { width: `${from ?? 0}%` },
      { width: `${to}%`, duration: 0.9, ease: 'elastic.out(1, 0.75)' }
    );
  },
  // immediate para pintar el progreso inicial: al retomar la Auditoria el
  // usuario entra en el bloque 5 y la barra debe estar donde le toca, no a cero
  // esperando a que conteste algo.
  { immediate: true, flush: 'post' }
);

async function refreshCard() {
  const before = card.value?.overall ?? 0;
  try {
    card.value = await getMyCard();
    flashStatGain(before, card.value?.overall ?? 0);
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
    chipOptions.value = res.chipOptions || [];
    contextNote.value = res.contextNote || '';
    missionOpen.value = chipOptions.value.length > 0;
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
    chipOptions.value = res.chipOptions || [];
    contextNote.value = res.contextNote || '';
    inputMessage.value = '';
    dateInput.value = '';

    // Turno nuevo, pregunta nueva: el panel vuelve a abrirse aunque el usuario
    // lo hubiera cerrado en el turno anterior para escribir a mano. Lo que
    // cerro era la pregunta de antes, no esta.
    missionDismissed.value = false;
    missionOpen.value = chipOptions.value.length > 0;

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
  // El panel se aparta mientras se confirma la omision: dos capas apiladas
  // dejaban el dialogo de "¿seguro?" encima de las opciones que rechaza.
  missionOpen.value = false;
  open('skipModal', SkipDataModal, {
    fieldName: currentField,
    onConfirmSkip: () => {
      // Confirmar no emite 'close', asi que sin este cierre explicito el
      // dialogo se quedaba abierto encima de la respuesta de Alfii.
      closeModal();
      sendTurn({ skip: currentField });
    },
    onClose: () => {
      if (!missionDismissed.value) missionOpen.value = hasMission.value;
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
  missionOpen.value = false;
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
          <!--
            El width lo escribe GSAP, no un binding: con los dos a la vez Vue
            repinta el valor final en cuanto cambia el paso y se come la
            animacion. Con movimiento reducido, el watch lo fija de golpe.
          -->
          <div ref="progressFill" class="progress-fill"></div>
        </div>
        <span class="progress-label">Bloque {{ currentStep + 1 }} de {{ totalSteps }}</span>
      </div>

      <!-- La carta cabe en un chip: tres datos aqui, el detalle en su hoja -->
      <button
        v-if="card"
        ref="cardChip"
        class="card-chip"
        :class="{ gained: statDelta > 0 }"
        @click="openCardSheet"
      >
        <span class="chip-rating">{{ card.overall }}</span>
        <span class="chip-pct">{{ card.completeness }}%</span>
        <span v-if="statDelta > 0" class="gain-pop">+{{ statDelta }}</span>
      </button>
    </header>

    <div class="audit-body">
      <!-- Columna principal: conversacion y respuesta -->
      <div class="audit-main">
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
          <!--
            Una sola linea. La pregunta larga ya esta en la burbuja de Alfii
            justo encima: repetirla completa aqui costaba 100px de conversacion.
          -->
          <!--
            Los bloques de texto libre (estatus, activos) no abren panel, asi que
            sin esto la memoria de Alfii solo se veria en la mitad de los pasos.
          -->
          <p v-if="contextNote && !showMission" class="recall-line">
            <BaseIcon name="thinking" size="xs" color="sage" />
            <span>{{ contextNote }}</span>
          </p>

          <div class="step-brief">
            <BaseIcon :name="meta.icon" size="xs" color="red" />
            <h3>{{ meta.title }}</h3>
            <span class="brief-gain">{{ meta.gain }}</span>
          </div>

          <!-- Fecha de nacimiento: selector propio, nunca el nativo -->
          <BirthDatePicker
            v-if="needsDateInput"
            v-model="dateInput"
            @confirm="sendDate"
          />

          <template v-else>
            <!--
              Las opciones ya no viven aqui: viven en el panel de mision. Lo que
              queda es la vuelta atras para quien lo cerro para escribir a mano.
            -->
            <button
              v-if="hasMission && missionDismissed"
              class="reopen-btn"
              :disabled="sending"
              @click="reopenMission"
            >
              <BaseIcon :name="meta.icon" size="xs" color="red" />
              <span>Ver las {{ chipOptions.length }} opciones</span>
            </button>

            <div class="type-row">
              <textarea
                ref="textField"
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

    <!-- La pregunta del turno, con sitio para que cada opcion se explique -->
    <MissionModal
      v-if="showMission"
      :step="currentStep"
      :total-steps="totalSteps"
      :title="meta.title"
      :ask="currentAsk"
      :stat-code="meta.statCode"
      :stat-name="meta.statName"
      :context-note="contextNote"
      :icon="meta.icon"
      :options="chipOptions"
      :sending="sending"
      :sensitive="isSensitiveStep"
      @pick="sendChip"
      @write="writeInstead"
      @skip="handleSkip"
    />
  </div>
</template>

<style lang="scss" scoped>
@keyframes progressSweep {
  0% { transform: translateX(-100%); }
  55%, 100% { transform: translateX(220%); }
}

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

  // Barrido continuo sobre lo ya ganado: la barra deja de leerse como un
  // adorno estatico y el avance se siente vivo bloque a bloque.
  .progress-fill {
    position: relative;
    overflow: hidden;
    height: 100%;
    border-radius: 3px;
    background-color: $alfii-red;
    box-shadow: 0 0 10px rgba($alfii-red, 0.6);
    // Sin transition: GSAP escribe el width en cada frame y una transition
    // encima anade su propia interpolacion sobre cada uno de esos valores. El
    // resultado es una barra que va a remolque y se come el rebote.

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba($alfii-cream, 0.5), transparent);
      animation: progressSweep 2.6s $ease-in-out infinite;
    }
  }

  .progress-label {
    font-size: $fs-2xs;
    font-weight: $fw-semibold;
    color: rgba($alfii-cream, 0.6);
  }

  // La carta reducida a chip: la nota y el % de completado, que es lo unico que
  // se mira de reojo mientras se responde. El resto, a un toque.
  .card-chip {
    position: relative;
    @include row(6px, center, center);
    flex: 0 0 auto;
    padding: 6px 11px;
    border-radius: 20px;
    background: linear-gradient(135deg, rgba($alfii-plum, 0.95) 0%, rgba($alfii-navy, 0.9) 100%);
    border: 1px solid rgba($alfii-cream, 0.16);
    transition: border-color $dur-fast $ease-out, transform $dur-fast $ease-spring;

    &:hover {
      border-color: rgba($alfii-red, 0.6);
      transform: translateY(-1px);
    }

    // El bloque terminado se cobra aqui: sin el destello la nota sube en
    // silencio y la recompensa se pierde.
    &.gained {
      border-color: rgba($alfii-sage, 0.8);
      animation: pulseGlow 1.1s $ease-in-out 2;
    }

    .gain-pop {
      position: absolute;
      top: -6px;
      right: -4px;
      padding: 1px 6px;
      border-radius: 10px;
      font-size: $fs-2xs;
      font-weight: $fw-extrabold;
      color: $alfii-navy;
      background-color: $alfii-sage;
      // La entrada la lleva GSAP con rebote; aqui solo el sitio y el color.
      pointer-events: none;
    }

    .chip-rating {
      font-size: $fs-md;
      font-weight: $fw-extrabold;
      line-height: 1;
      color: $alfii-cream;
    }

    .chip-pct {
      font-size: $fs-2xs;
      font-weight: $fw-bold;
      color: $alfii-sage;
    }
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
// Tres franjas finas y nada mas: titulo (1 linea), opciones (1 fila) e input.
// El alto total no depende de cuantas opciones mande el backend, que era lo que
// hacia que en un movil corto la conversacion desapareciera.
.audit-input {
  flex: 0 0 auto;
  @include stack(9px);
  padding: 10px clamp(16px, 4vw, 32px);
  padding-bottom: max(10px, env(safe-area-inset-bottom));
  border-top: 1px solid rgba($alfii-cream, 0.08);
  background-color: rgba($alfii-plum, 0.4);
}

// Una linea, con puntos suspensivos si no cabe: el pie tiene alto fijo y esto
// no puede ser lo que lo rompa.
.recall-line {
  @include row(6px, center);
  min-width: 0;
  font-size: $fs-2xs;
  color: rgba($alfii-sage, 0.9);
  animation: fadeInUp $dur-base $ease-out both;

  span {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

// Una linea. El texto largo de la pregunta ya esta en el hilo.
.step-brief {
  @include row(8px, center);
  min-width: 0;

  h3 {
    flex: 1;
    min-width: 0;
    font-size: $fs-sm;
    font-weight: $fw-bold;
    color: $alfii-cream;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .brief-gain {
    flex: 0 0 auto;
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: $alfii-sage;
    white-space: nowrap;
  }
}

// Vuelta al panel para quien lo cerro para escribir a mano. Solo aparece en ese
// caso: mostrarlo siempre seria un boton que compite con el panel ya abierto.
.reopen-btn {
  @include row(7px, center, center);
  align-self: center;
  padding: 7px 14px;
  border-radius: 20px;
  font-size: $fs-xs;
  font-weight: $fw-semibold;
  color: $alfii-cream;
  background-color: rgba($alfii-red, 0.14);
  border: 1px solid rgba($alfii-red, 0.35);
  transition: border-color $dur-fast $ease-out, background-color $dur-fast $ease-out;
  animation: fadeInUp $dur-base $ease-out both;

  &:hover:not(:disabled) {
    border-color: rgba($alfii-red, 0.7);
    background-color: rgba($alfii-red, 0.22);
  }

  &:disabled { opacity: 0.5; }
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

// La carta lateral solo existe en escritorio: en movil vive en el chip de la
// cabecera, que la abre en su hoja.
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

  // En escritorio la carta ya esta entera en la columna: el chip sobra.
  .audit-head .card-chip { display: none; }

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
