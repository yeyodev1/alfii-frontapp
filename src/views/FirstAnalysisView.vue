<script setup lang="ts">
import AlfiiLogo from '@/components/shared/AlfiiLogo.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import UnlockSheet from '@/components/modals/UnlockSheet.vue';
import AuthSheet from '@/components/modals/AuthSheet.vue';
import NameConfirmSheet from '@/components/modals/NameConfirmSheet.vue';
import DuplicateTargetSheet from '@/components/modals/DuplicateTargetSheet.vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useFirstAnalysisStore, type FirstAnalysisScript } from '@/stores/firstAnalysis';
import { useToastStore } from '@/stores/toast';
import { useModal } from '@/composables/useModal';
import { ICON_MAP, type IconName } from '@/config/icons';
import api from '@/services/http';

const router = useRouter();
const store = useFirstAnalysisStore();
const toastStore = useToastStore();
const { open, close } = useModal();

const copiedStyle = ref<string | null>(null);
// justRevealed dispara la animacion de desenfoque solo la primera vez que se
// desbloquea; si el usuario ya llega registrado no queremos parpadeos.
const justRevealed = ref(false);
const showProfileInvite = ref(false);
// Guardamos que estilos llegaron bloqueados: son los unicos que deben animar
// al revelarse. El refetch puede devolver los scripts en otro orden.
const initiallyLocked = ref<string[]>([]);

// ---------------------------------------------------------------------------
// Wizard.
//
// Se decidio pantalla completa por paso en vez de una pagina larga con scroll
// porque cada bloque del analisis es una revelacion: mostrarlos todos a la vez
// deja al usuario leyendo en diagonal y el muro final pierde toda la tension.
// ---------------------------------------------------------------------------
type StepKey = 'hilo' | 'subtexto' | 'arquetipo' | 'timing' | 'respuestas';

const STEPS: { key: StepKey; label: string; icon: IconName }[] = [
  { key: 'hilo', label: 'Lo que te escribió', icon: 'platform.whatsapp' },
  { key: 'subtexto', label: 'Lo que quiso decir', icon: 'subtext' },
  { key: 'arquetipo', label: 'Quién es ella', icon: 'archetype' },
  { key: 'timing', label: 'Cuándo responder', icon: 'timing' },
  { key: 'respuestas', label: 'Tu respuesta', icon: 'scripts' },
];

const stepIndex = ref(0);
// La direccion decide si la transicion entra por la derecha o por la izquierda.
// Sin esto, volver atras se siente como avanzar y se pierde el sentido espacial.
const direction = ref<'next' | 'prev'>('next');

const currentStep = computed(() => STEPS[stepIndex.value] ?? STEPS[0]!);
const isLastStep = computed(() => stepIndex.value === STEPS.length - 1);
const isFirstStep = computed(() => stepIndex.value === 0);

function goNext() {
  if (isLastStep.value) return;
  direction.value = 'next';
  stepIndex.value += 1;
}

function goPrev() {
  if (isFirstStep.value) return;
  direction.value = 'prev';
  stepIndex.value -= 1;
}

function goToStep(idx: number) {
  if (idx === stepIndex.value) return;
  direction.value = idx > stepIndex.value ? 'next' : 'prev';
  stepIndex.value = idx;
}

// --- gestos y teclado ---------------------------------------------------
const touchStartX = ref(0);
const touchStartY = ref(0);
const SWIPE_THRESHOLD = 55;

function onTouchStart(e: TouchEvent) {
  const t = e.changedTouches[0];
  if (!t) return;
  touchStartX.value = t.screenX;
  touchStartY.value = t.screenY;
}

function onTouchEnd(e: TouchEvent) {
  const t = e.changedTouches[0];
  if (!t) return;
  const dx = t.screenX - touchStartX.value;
  const dy = t.screenY - touchStartY.value;
  // Se exige que el gesto sea claramente horizontal: si no, un scroll vertical
  // con algo de inclinacion cambiaria de paso sin que el usuario lo pida.
  if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  if (dx < 0) goNext();
  else goPrev();
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') goNext();
  if (e.key === 'ArrowLeft') goPrev();
}

onMounted(() => {
  // Sin analisis en memoria no hay nada que mostrar: devolvemos al Home.
  if (!store.hasData) {
    router.replace('/');
    return;
  }
  initiallyLocked.value = store.lockedScripts.map((s) => s.style);
  if (store.isFullyUnlocked) {
    showProfileInvite.value = true;
  }
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});

const platformIcon = computed<IconName>(() => {
  const key = `platform.${store.platform}`;
  return (key in ICON_MAP ? key : 'platform.other') as IconName;
});

const styleIcon = (style: string): IconName => {
  const key = `script.${style}`;
  return (key in ICON_MAP ? key : 'scripts') as IconName;
};

const analysis = computed(() => store.analysis as any);

const riskLevel = computed(() => analysis.value?.riskRadar?.level ?? 'LIMPIO');
const confidencePct = computed(() =>
  Math.round(Number(analysis.value?.archetypeDiagnosis?.confidence ?? 0) * 100)
);

// Texto de relleno DECORATIVO. El texto real de los scripts bloqueados nunca
// llega al cliente (viene null), asi que el borroso se dibuja sobre esto.
const FILLER: Record<string, string> = {
  PODER: 'Tengo la semana bastante cargada, pero si te portas bien te hago un hueco el jueves. Avísame tú.',
  CABALLERO: 'Me gustó cómo lo dijiste. Tengo una idea para el fin de semana, creo que te va a gustar más que la última.',
  PICARO: 'Interesante respuesta. Voy a fingir que no entendí para ver hasta dónde llegas con eso.',
};

function fillerFor(style: string) {
  return FILLER[style] || FILLER.PODER;
}

// ---------------------------------------------------------------------------
// Interaccion final: elegir con que respuesta se queda.
//
// Es el gesto que convierte: elegir una bloqueada lleva al registro con el
// deseo ya declarado por el propio usuario, no con un banner generico.
// ---------------------------------------------------------------------------
const chosenStyle = ref<string | null>(null);

function chooseScript(script: FirstAnalysisScript) {
  chosenStyle.value = script.style;

  if (script.locked) {
    openUnlock();
    return;
  }

  if (script.text) {
    navigator.clipboard.writeText(script.text);
    copiedStyle.value = script.style;
    toastStore.show('Respuesta copiada. Pégala tal cual.', 'success');
    setTimeout(() => {
      copiedStyle.value = null;
    }, 2200);
  }
}

// --------------------------------------------------------------------------
// Desbloqueo: UnlockSheet solo persuade, AuthSheet hace el registro real.
// --------------------------------------------------------------------------
function openUnlock() {
  open('unlock', UnlockSheet, {
    scriptsLocked: store.lockedCount,
    detectedName: store.detectedName,
    cta: store.data?.locked?.cta,
    onProceed: handleProceedToAuth,
  });
}

async function handleProceedToAuth() {
  close();
  try {
    const legalMeta: any = await api.get('/legal/meta');
    open('auth', AuthSheet, {
      legalVersion: legalMeta.version,
      onSuccess: handleAuthSuccess,
    });
  } catch {
    // El interceptor de http.ts ya mostro el toast del error.
  }
}

async function handleAuthSuccess() {
  try {
    await store.refetch();
    justRevealed.value = true;
    // Damos aire a la animacion antes de pedir el nombre: primero el premio,
    // despues la friccion.
    setTimeout(askForName, 1400);
  } catch {
    toastStore.show('Tu cuenta quedó creada, pero no pudimos recargar el análisis.', 'error');
  }
}

function askForName() {
  if (!store.needsNameConfirmation) {
    showProfileInvite.value = true;
    return;
  }
  open('nameConfirm', NameConfirmSheet, {
    detectedName: store.detectedName,
    analysisId: store.analysisId,
    onConfirm: (displayName: string) => confirmTarget(displayName),
  });
}

/**
 * Crea el expediente. Si el backend detecta un nombre repetido responde 409 con
 * el expediente que ya existe, y ahi decide el usuario: es la misma chica o es
 * otra que se llama igual. Nunca se elige por el.
 */
async function confirmTarget(displayName: string, mode?: 'merge' | 'separate') {
  try {
    const res: any = await api.post('/targets/confirm', {
      analysisId: store.analysisId,
      displayName,
      ...(mode ? { mode } : {}),
    });
    if (res?.target?.id) store.setTargetId(res.target.id);
    close();
    showProfileInvite.value = true;
    if (mode === 'merge') {
      toastStore.show(`Sumado al expediente de ${res.target.displayName}.`, 'success');
    }
  } catch (err: any) {
    if (err?.details?.reason === 'duplicate_target' && err.details.existing) {
      close();
      open('duplicateTarget', DuplicateTargetSheet, {
        name: displayName,
        existing: err.details.existing,
        onMerge: () => confirmTarget(displayName, 'merge'),
        onSeparate: () => confirmTarget(displayName, 'separate'),
        onClose: () => {
          close();
          // Sin expediente pero con el analisis ya hecho: se deja seguir para
          // que no pierda lo que acaba de leer.
          showProfileInvite.value = true;
        },
      });
      return;
    }
    // El interceptor ya avisa; dejamos la hoja abierta para reintentar.
  }
}

function goToOnboarding() {
  router.push('/onboarding');
}

function goToTarget() {
  if (store.targetId) router.push(`/chat/${store.targetId}`);
}

function goHome() {
  router.push('/');
}
</script>

<template>
  <div
    v-if="store.hasData && analysis"
    class="wizard"
    @touchstart.passive="onTouchStart"
    @touchend.passive="onTouchEnd"
  >
    <div class="glow glow-a"></div>
    <div class="glow glow-b"></div>

    <!-- Cabecera con los pasos -->
    <header class="wz-head">
      <button class="icon-btn" @click="goHome" aria-label="Volver al inicio">
        <BaseIcon name="close" size="sm" color="cream" />
      </button>

      <nav class="steps-nav">
        <button
          v-for="(s, i) in STEPS"
          :key="s.key"
          class="step-dot"
          :class="{ active: i === stepIndex, done: i < stepIndex }"
          :aria-label="s.label"
          @click="goToStep(i)"
        >
          <span class="dot-fill"></span>
        </button>
      </nav>

      <AlfiiLogo size="sm" mode="iso" />
    </header>

    <!-- Escenario: un paso a la vez, a pantalla completa -->
    <main class="wz-stage">
      <Transition :name="direction === 'next' ? 'slide-next' : 'slide-prev'" mode="out-in">
        <section :key="currentStep.key" class="wz-panel">
          <div class="panel-inner">
            <span class="step-tag">
              <BaseIcon :name="currentStep.icon" size="xs" color="red" />
              {{ currentStep.label }}
              <em>{{ stepIndex + 1 }}/{{ STEPS.length }}</em>
            </span>

            <!-- 1. El hilo -->
            <template v-if="currentStep.key === 'hilo'">
              <h1 class="wz-title">Esto fue lo que te escribió</h1>
              <div class="thread-box">
                <div class="thread-head">
                  <div class="th-avatar">{{ store.detectedName.charAt(0) }}</div>
                  <div class="th-meta">
                    <strong>{{ store.detectedName }}</strong>
                    <span><BaseIcon :name="platformIcon" size="xs" color="sage" /> captura leída</span>
                  </div>
                </div>
                <div class="thread-body">
                  <div
                    v-for="(msg, i) in store.thread"
                    :key="i"
                    class="bubble"
                    :class="msg.from === 'her' ? 'her' : 'him'"
                  >
                    <p>{{ msg.text }}</p>
                  </div>
                </div>
              </div>
              <p class="wz-foot-note">Desliza para ver qué hay detrás de esas palabras.</p>
            </template>

            <!-- 2. Subtexto -->
            <template v-else-if="currentStep.key === 'subtexto'">
              <h1 class="wz-title">Esto es lo que <span class="hl">realmente</span> quiso decir</h1>
              <div class="reveal-card">
                <p class="big-read">{{ analysis.subtext.reading }}</p>
                <div class="tag-row">
                  <span class="tag"><strong>Marco:</strong> {{ analysis.subtext.frameDetected }}</span>
                  <span v-if="analysis.subtext.shitTestDetected" class="tag warn">
                    <BaseIcon name="risk" size="xs" color="red" />
                    Te está probando: {{ analysis.subtext.shitTestType || 'shit test' }}
                  </span>
                </div>
              </div>
            </template>

            <!-- 3. Arquetipo y riesgo -->
            <template v-else-if="currentStep.key === 'arquetipo'">
              <h1 class="wz-title">Quién es ella, en corto</h1>
              <div class="reveal-card">
                <div class="arq-head">
                  <BaseIcon name="archetype" size="xl" color="sage" />
                  <div>
                    <strong class="arq-name">{{ analysis.archetypeDiagnosis.primary }}</strong>
                    <span class="arq-conf">{{ confidencePct }}% de confianza</span>
                  </div>
                </div>
                <p class="mid-read">{{ analysis.archetypeDiagnosis.reasoning }}</p>
                <div class="risk-row" :class="riskLevel.toLowerCase()">
                  <BaseIcon name="risk" size="sm" color="cream" />
                  <span>Riesgo: <strong>{{ riskLevel }}</strong></span>
                  <span class="risk-num">{{ analysis.riskRadar.transactionalRisk }}/100</span>
                </div>
                <div v-if="analysis.riskRadar.userPostureCorrection" class="posture">
                  <BaseIcon name="hand" size="xs" color="red" />
                  <p>{{ analysis.riskRadar.userPostureCorrection }}</p>
                </div>
              </div>
            </template>

            <!-- 4. Timing -->
            <template v-else-if="currentStep.key === 'timing'">
              <h1 class="wz-title">No respondas todavía</h1>
              <div class="reveal-card center">
                <div class="clock">
                  <span class="clock-num">{{ analysis.timing.waitMinutes }}</span>
                  <span class="clock-unit">minutos</span>
                </div>
                <p class="mid-read">{{ analysis.timing.rationale }}</p>
              </div>
            </template>

            <!-- 5. Respuestas: la interaccion que convierte -->
            <template v-else>
              <h1 class="wz-title">¿Con cuál te quedas?</h1>
              <p class="wz-sub">Toca la que vas a usar. Te la copio al portapapeles.</p>

              <div class="scripts-stack">
                <button
                  v-for="s in analysis.scripts"
                  :key="s.style"
                  class="script-card"
                  :class="{
                    locked: s.locked,
                    chosen: chosenStyle === s.style,
                    revealed: justRevealed && initiallyLocked.includes(s.style),
                  }"
                  @click="chooseScript(s)"
                >
                  <div class="sc-head">
                    <span class="sc-style">
                      <BaseIcon :name="styleIcon(s.style)" size="xs" color="cream" />
                      {{ s.style }}
                    </span>
                    <BaseIcon v-if="s.locked" name="lock" size="xs" color="red" />
                    <BaseIcon
                      v-else-if="copiedStyle === s.style"
                      name="check"
                      size="xs"
                      color="sage"
                    />
                    <BaseIcon v-else name="copy" size="xs" color="muted" />
                  </div>

                  <p v-if="!s.locked" class="sc-text">{{ s.text }}</p>
                  <template v-else>
                    <p class="sc-text blurred" aria-hidden="true">{{ fillerFor(s.style) }}</p>
                    <span class="sc-teaser">{{ s.teaser }}</span>
                  </template>

                  <span v-if="!s.locked && s.rationale" class="sc-why">{{ s.rationale }}</span>
                </button>
              </div>

              <div v-if="store.lockedCount" class="wall">
                <p>
                  Las otras <strong>{{ store.lockedCount }}</strong> están listas. Para dártelas
                  necesito conocerte: así dejan de ser genéricas y suenan a ti.
                </p>
                <button class="cta" @click="openUnlock">
                  <BaseIcon name="key" size="xs" color="cream" />
                  <span>Desbloquear las {{ store.lockedCount }}</span>
                </button>
              </div>

              <div v-if="showProfileInvite" class="wall done">
                <p>
                  Listo. Ahora puedo afinar mucho más si me dejas conocerte:
                  cada dato sube la precisión de tus respuestas.
                </p>
                <button class="cta" @click="goToOnboarding">
                  <BaseIcon name="bolt" size="xs" color="cream" />
                  <span>Empezar mi perfil</span>
                </button>
                <button v-if="store.targetId" class="ghost" @click="goToTarget">
                  Ir al expediente de {{ store.detectedName }}
                </button>
              </div>
            </template>
          </div>
        </section>
      </Transition>
    </main>

    <!-- Navegacion -->
    <footer class="wz-nav">
      <button class="nav-btn ghost" :disabled="isFirstStep" @click="goPrev">
        <BaseIcon name="back" size="xs" color="cream" />
        <span>Atrás</span>
      </button>

      <span class="nav-hint">{{ isLastStep ? 'Elige tu respuesta' : 'Desliza o usa las flechas' }}</span>

      <button v-if="!isLastStep" class="nav-btn primary" @click="goNext">
        <span>Siguiente</span>
        <BaseIcon name="arrowRight" size="xs" color="cream" />
      </button>
      <span v-else class="nav-btn spacer"></span>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
// Mobile-first. Flex exclusivamente, cero grid.
.wizard {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
  background-color: $alfii-navy;
  color: $alfii-cream;
}

.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  z-index: 0;
}

.glow-a {
  top: -160px;
  left: 50%;
  transform: translateX(-50%);
  width: 460px;
  height: 320px;
  background: radial-gradient(circle, rgba($alfii-red, 0.26) 0%, rgba($alfii-navy, 0) 70%);
}

.glow-b {
  bottom: -180px;
  right: -90px;
  width: 380px;
  height: 300px;
  background: radial-gradient(circle, rgba($alfii-sage, 0.15) 0%, rgba($alfii-navy, 0) 70%);
}

// --- cabecera ---
.wz-head {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  @include row(12px, center, space-between);
  padding: 12px clamp(14px, 4vw, 28px);
  border-bottom: 1px solid rgba($alfii-cream, 0.07);
}

.icon-btn {
  @include center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background-color: rgba($alfii-cream, 0.06);
}

.steps-nav {
  @include row(7px, center, center);
  flex: 1;
}

.step-dot {
  @include center;
  width: 26px;
  height: 20px;

  .dot-fill {
    display: block;
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background-color: rgba($alfii-cream, 0.16);
    transition: background-color $dur-base $ease-out, box-shadow $dur-base $ease-out;
  }

  &.done .dot-fill { background-color: rgba($alfii-red, 0.5); }

  &.active .dot-fill {
    background-color: $alfii-red;
    box-shadow: 0 0 10px rgba($alfii-red, 0.7);
  }
}

// --- escenario ---
// min-height: 0 no es opcional. Un hijo flex por defecto se niega a encogerse
// por debajo de su contenido, asi que sin esto el panel empuja el pie fuera de
// la pantalla en vez de hacer scroll dentro de si mismo.
.wz-stage {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.wz-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  @include scroll-y;
}

// Los pasos cortos (el reloj del timing) quedan centrados verticalmente; los
// largos (el hilo) crecen y hacen scroll solo dentro del panel.
.panel-inner {
  @include stack(14px);
  justify-content: center;
  width: 100%;
  max-width: 620px;
  min-height: min-content;
  margin: auto;
  padding: 18px clamp(16px, 5vw, 28px) 24px;
}

.step-tag {
  @include row(7px, center);
  align-self: flex-start;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: $fs-2xs;
  font-weight: $fw-bold;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba($alfii-cream, 0.8);
  background-color: rgba($alfii-red, 0.12);
  border: 1px solid rgba($alfii-red, 0.32);

  em {
    font-style: normal;
    color: rgba($alfii-cream, 0.45);
  }
}

.wz-title {
  font-size: clamp(1.7rem, 7vw, 2.6rem);
  font-weight: $fw-extrabold;
  line-height: 1.1;
  letter-spacing: -0.03em;

  .hl { color: $alfii-red; }
}

.wz-sub {
  font-size: $fs-sm;
  color: rgba($alfii-cream, 0.72);
}

.wz-foot-note {
  font-size: $fs-xs;
  color: rgba($alfii-cream, 0.5);
  text-align: center;
}

// --- hilo ---
.thread-box {
  border-radius: 18px;
  overflow: hidden;
  background-color: #0b141a;
  border: 1px solid rgba($alfii-cream, 0.14);

  .thread-head {
    @include row(10px, center);
    padding: 11px 14px;
    background-color: #202c33;
  }

  .th-avatar {
    @include center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00a884 0%, #008069 100%);
    color: #fff;
    font-weight: $fw-bold;
  }

  .th-meta {
    @include stack(2px);
    strong { font-size: $fs-sm; color: #e9edef; }
    span {
      @include row(5px, center);
      font-size: $fs-2xs;
      color: #8696a0;
    }
  }

  .thread-body {
    @include stack(8px);
    padding: 14px 12px;
    // Tope en dvh para que el hilo largo nunca empuje al resto del paso: la
    // conversacion scrollea dentro de su propia caja.
    max-height: 38dvh;
    @include scroll-y;
  }

  .bubble {
    max-width: 84%;
    padding: 9px 12px;
    border-radius: 10px;
    font-size: 13px;
    line-height: 1.45;
    color: #e9edef;

    &.her { align-self: flex-start; background-color: #202c33; border-top-left-radius: 0; }
    &.him { align-self: flex-end; background-color: #005c4b; border-top-right-radius: 0; }
  }
}

// --- tarjetas de revelacion ---
.reveal-card {
  @include card-surface;
  @include stack(14px);

  &.center { align-items: center; text-align: center; }
}

.big-read {
  font-size: $fs-md;
  line-height: $lh-relaxed;
  color: $alfii-cream;
}

.mid-read {
  font-size: $fs-sm;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.85);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  .tag {
    @include row(6px, center);
    padding: 7px 11px;
    border-radius: 10px;
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.85);
    background-color: rgba($alfii-navy, 0.6);
    border: 1px solid rgba($alfii-cream, 0.1);

    &.warn { border-color: rgba($alfii-red, 0.45); }
  }
}

.arq-head {
  @include row(14px, center);

  .arq-name {
    display: block;
    font-size: $fs-xl;
    font-weight: $fw-extrabold;
  }

  .arq-conf {
    font-size: $fs-xs;
    color: $alfii-sage;
    font-weight: $fw-semibold;
  }
}

.risk-row {
  @include row(9px, center);
  padding: 11px 14px;
  border-radius: 12px;
  font-size: $fs-xs;
  background-color: rgba($alfii-navy, 0.6);
  border: 1px solid rgba($alfii-sage, 0.3);

  &.alto, &.abortar { border-color: rgba($alfii-red, 0.5); }

  .risk-num { margin-left: auto; color: rgba($alfii-cream, 0.55); }
}

.posture {
  @include row(9px, flex-start);
  padding: 11px 13px;
  border-radius: 12px;
  background-color: rgba($alfii-red, 0.1);
  border: 1px solid rgba($alfii-red, 0.32);

  p { font-size: $fs-xs; line-height: $lh-relaxed; }
}

.clock {
  @include stack(0, center);

  .clock-num {
    font-size: clamp(3.4rem, 16vw, 5rem);
    font-weight: $fw-extrabold;
    line-height: 1;
    color: $alfii-red;
    text-shadow: 0 0 30px rgba($alfii-red, 0.4);
  }

  .clock-unit {
    font-size: $fs-sm;
    font-weight: $fw-bold;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.6);
  }
}

// --- scripts ---
.scripts-stack {
  @include stack(11px);
}

.script-card {
  @include stack(9px);
  width: 100%;
  text-align: left;
  padding: 15px;
  border-radius: 16px;
  background-color: rgba($alfii-plum, 0.8);
  border: 1px solid rgba($alfii-cream, 0.12);
  transition: border-color $dur-fast $ease-out, transform $dur-fast $ease-out;

  &:hover { border-color: rgba($alfii-red, 0.45); }
  &.chosen { border-color: $alfii-red; transform: scale(0.995); }

  &.locked { cursor: pointer; }

  // Al revelarse tras el registro: el desenfoque se va con la transicion.
  &.revealed .sc-text { animation: fadeInUp $dur-reveal $ease-out both; }

  .sc-head {
    @include row(8px, center, space-between);
  }

  .sc-style {
    @include row(6px, center);
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.08em;
    color: rgba($alfii-cream, 0.8);
  }

  .sc-text {
    font-size: $fs-sm;
    line-height: $lh-relaxed;
    color: $alfii-cream;

    &.blurred {
      filter: blur(5px);
      user-select: none;
      pointer-events: none;
      opacity: 0.75;
    }
  }

  .sc-teaser {
    @include row(6px, center);
    font-size: $fs-2xs;
    font-weight: $fw-semibold;
    color: $alfii-sage;
  }

  .sc-why {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.55);
    line-height: $lh-relaxed;
  }
}

// --- muro y cierre ---
.wall {
  @include stack(12px, center);
  text-align: center;
  padding: 18px 16px;
  border-radius: 16px;
  background: linear-gradient(140deg, rgba($alfii-plum, 0.92) 0%, rgba($alfii-red, 0.2) 100%);
  border: 1px solid rgba($alfii-red, 0.4);

  p { font-size: $fs-sm; line-height: $lh-relaxed; }

  &.done {
    background: linear-gradient(140deg, rgba($alfii-plum, 0.92) 0%, rgba($alfii-sage, 0.2) 100%);
    border-color: rgba($alfii-sage, 0.45);
  }
}

.cta {
  @include row(9px, center, center);
  width: 100%;
  max-width: 320px;
  padding: 14px 22px;
  border-radius: 13px;
  font-size: $fs-sm;
  font-weight: $fw-bold;
  background-color: $alfii-red;
  color: $alfii-cream;
  box-shadow: 0 8px 22px rgba($alfii-red, 0.45);
}

.ghost {
  font-size: $fs-xs;
  font-weight: $fw-semibold;
  color: rgba($alfii-cream, 0.65);
}

// --- navegacion inferior ---
.wz-nav {
  position: relative;
  z-index: 2;
  flex: 0 0 auto;
  @include row(10px, center, space-between);
  padding: 12px clamp(14px, 4vw, 28px);
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid rgba($alfii-cream, 0.07);
  background-color: rgba($alfii-navy, 0.85);
  backdrop-filter: blur(14px);
}

.nav-btn {
  @include row(7px, center);
  padding: 11px 16px;
  border-radius: 12px;
  font-size: $fs-xs;
  font-weight: $fw-bold;

  &.ghost {
    color: rgba($alfii-cream, 0.75);
    background-color: rgba($alfii-cream, 0.06);

    &:disabled { opacity: 0.3; }
  }

  &.primary {
    background-color: $alfii-red;
    color: $alfii-cream;
    box-shadow: 0 4px 16px rgba($alfii-red, 0.4);
  }

  &.spacer { width: 92px; }
}

.nav-hint {
  font-size: $fs-2xs;
  color: rgba($alfii-cream, 0.4);
  text-align: center;
}

// --- transiciones entre pasos ---
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition: transform 0.34s $ease-out, opacity 0.34s $ease-out;
}

.slide-next-enter-from { transform: translateX(38px); opacity: 0; }
.slide-next-leave-to   { transform: translateX(-38px); opacity: 0; }
.slide-prev-enter-from { transform: translateX(-38px); opacity: 0; }
.slide-prev-leave-to   { transform: translateX(38px); opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .slide-next-enter-from,
  .slide-next-leave-to,
  .slide-prev-enter-from,
  .slide-prev-leave-to {
    transform: none;
  }
}

// Pantallas bajas (movil apaisado, ventanas pequenas): se recorta el aire y el
// titulo antes que dejar que aparezca scroll en un paso corto.
@media (max-height: 700px) {
  .wz-title { font-size: clamp(1.4rem, 5.5vw, 1.9rem); }
  .panel-inner { gap: 11px; padding-top: 12px; padding-bottom: 16px; }
  .thread-box .thread-body { max-height: 30dvh; }
  .clock .clock-num { font-size: clamp(2.6rem, 11vw, 3.6rem); }
  .reveal-card { padding: 14px; }
}

@media (min-width: 768px) {
  .panel-inner { padding: 30px 28px 34px; gap: 18px; }
  .nav-hint { font-size: $fs-xs; }
}
</style>
