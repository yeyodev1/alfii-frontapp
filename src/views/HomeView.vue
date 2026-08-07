<script setup lang="ts">
import AlfiiLogo from '@/components/shared/AlfiiLogo.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import AnalysisCard from '@/components/shared/AnalysisCard.vue';
import WingmanIntroSheet from '@/components/modals/WingmanIntroSheet.vue';
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useModal } from '@/composables/useModal';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useScrollReveal } from '@/composables/useScrollReveal';
import { useFirstAnalysisStore, type FirstAnalysisResponse } from '@/stores/firstAnalysis';
import api from '@/services/http';

const router = useRouter();
const { open } = useModal();
const authStore = useAuthStore();
const toastStore = useToastStore();
const firstAnalysisStore = useFirstAnalysisStore();

useScrollReveal();

const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const showSticky = ref(false);
const isDragOver = ref(false);
const activeCaseIndex = ref(0);
const showFullAnalysis = ref(false);

// ---------------------------------------------------------------------------
// Casos vivos: cada uno trae su hilo de chat y su analisis completo de 6 bloques.
// Es la demostracion del producto real, no un mockup decorativo.
// ---------------------------------------------------------------------------
const liveCases = [
  {
    tag: 'Mensaje de madrugada',
    hook: '"y tú qué haces despierto a esta hora 👀"',
    contact: 'Sofi',
    thread: [
      { from: 'him', text: 'entonces sí te gustó el lugar', time: '23:45' },
      { from: 'her', text: 'sí estuvo lindo, aunque la música media rara jaja', time: '23:46' },
      { from: 'him', text: 'la próxima elijo yo la playlist entonces', time: '23:46' },
      { from: 'her', text: 'uy no sé si confiarte eso', time: '23:47', flag: true },
      { from: 'her', text: 'y tú qué haces despierto a esta hora 👀', time: '23:47', flag: true, live: true },
    ],
    verdict: {
      subtext: 'No es curiosidad inocente. Es un anzuelo: mide si estás disponible o si tienes una vida que la obliga a competir por tu atención.',
      archetype: 'KOAKUMA',
      confidence: 85,
      timing: '15 min',
      scriptStyle: 'PODER',
      script: 'Resolviendo un par de problemas. Y evaluando si te doy una segunda oportunidad con la música. Deberías dormir.',
    },
    analysis: {
      lead: 'La partida va a tu favor. Está enganchada y te está midiendo de madrugada.',
      subtext: {
        reading: 'Ella hace dos movimientos. Primero un shit test suave ("uy no sé si confiarte eso") para ver si te justificas sobre tu gusto musical. Después lanza un anzuelo nocturno ("y tú qué haces despierto 👀"). Ese emoji delata interés en prolongar la interacción, no curiosidad neutra.',
        frameDetected: 'Tensión juguetona: ella sondea tu disponibilidad y tu firmeza.',
        shitTestDetected: true,
        shitTestType: 'Reto juguetón / Cualificación',
      },
      archetypeDiagnosis: {
        primary: 'KOAKUMA',
        hybrid: ['DEREDERE'],
        confidence: 0.85,
        reasoning: 'Combina la provocación y el testeo ligero de la Koakuma con el interés receptivo de la Deredere al buscar alargar la charla a deshoras.',
      },
      riskRadar: {
        level: 'LIMPIO',
        transactionalRisk: 5,
        flags: [],
        userPostureCorrection: null,
      },
      timing: {
        waitMinutes: 15,
        recommendedReadAt: null,
        rationale: 'Responder al instante de madrugada te quita misterio y te muestra demasiado disponible. Un margen de 15 a 20 minutos sostiene el marco sin enfriar el momento.',
      },
      scripts: [
        {
          style: 'PODER',
          text: 'Resolviendo un par de problemas. Y evaluando si te doy una segunda oportunidad con la música. Deberías dormir.',
          rationale: 'Marco de hombre ocupado, invierte los papeles (tú la evalúas a ella) y cierra en el pico de interés.',
        },
        {
          style: 'CABALLERO',
          text: 'Revisando unos datos del trabajo. El silencio de esta hora es perfecto para pensar. ¿Tú qué excusa tienes para no dormir?',
          rationale: 'Comunica tus activos reales sin alardear y le devuelve la pelota con calidez.',
        },
        {
          style: 'PICARO',
          text: 'Armando la tesis de por qué mi playlist es superior. Requiere concentración. 👀',
          rationale: 'Usa su propio emoji y conecta con el shit test anterior. Misterio sin intimidarte.',
        },
      ],
      meters: { kiss: 25, firstDate: 35, firstNight: 15 },
    },
  },
  {
    tag: 'Shit test de disponibilidad',
    hook: '"yo te aviso / yo te confirmo"',
    contact: 'Andrea',
    thread: [
      { from: 'him', text: 'oye, el viernes hay un bar nuevo cerca del malecón. vamos?', time: '18:12' },
      { from: 'her', text: 'mmm suena bien', time: '18:40' },
      { from: 'her', text: 'yo te aviso, esta semana ando full', time: '18:40', flag: true, live: true },
    ],
    verdict: {
      subtext: 'Clásico test de estatus o evasiva suave. Mide si te descolocas, si insistes o si te quedas en reserva esperando su confirmación.',
      archetype: 'HIMEDERE',
      confidence: 78,
      timing: '45 min',
      scriptStyle: 'PODER',
      script: 'Dale. Si no me organizo con otro plan te aviso yo.',
    },
    analysis: {
      lead: 'Te dejó en lista de espera. No confirmes tu disponibilidad indefinida: recupera el marco.',
      subtext: {
        reading: 'El "yo te aviso" no es un no, es una prueba de estatus. Te coloca en reserva mientras ella conserva la opción abierta. Si insistes o pides fecha exacta, confirmas que tu agenda gira alrededor de la suya.',
        frameDetected: 'Ella controla el calendario y tú esperas. Marco invertido.',
        shitTestDetected: true,
        shitTestType: 'Test de disponibilidad / Estatus',
      },
      archetypeDiagnosis: {
        primary: 'HIMEDERE',
        hybrid: ['TSUN_KUUDERE'],
        confidence: 0.78,
        reasoning: 'Espera que el otro se acomode a su agenda y ofrece reciprocidad difusa. Rasgo central de la Himedere: recibe atención sin comprometer nada.',
      },
      riskRadar: {
        level: 'VIGILAR',
        transactionalRisk: 35,
        flags: [
          { code: 'BAJA_RECIPROCIDAD', description: 'Acepta la propuesta pero no aporta fecha ni alternativa.' },
        ],
        userPostureCorrection: 'No vuelvas a proponer plan hasta que ella mueva ficha. Insistir aquí te cuesta valor.',
      },
      timing: {
        waitMinutes: 45,
        recommendedReadAt: null,
        rationale: 'Responder rápido delata que estabas pendiente del teléfono. 45 minutos comunica que tienes tu propia semana ocupada.',
      },
      scripts: [
        {
          style: 'PODER',
          text: 'Dale. Si no me organizo con otro plan te aviso yo.',
          rationale: 'Retira la propuesta con serenidad y devuelve el control de la agenda a tu lado.',
        },
        {
          style: 'CABALLERO',
          text: 'Tranquila, yo también ando con la semana cargada. Cuando se te despeje me dices.',
          rationale: 'Cierra sin presión, valida su agenda y deja la pelota de su lado sin drama.',
        },
        {
          style: 'PICARO',
          text: 'Perfecto, el bar tampoco se va a mover. Yo sí, capaz. 😉',
          rationale: 'Humor con subtexto de escasez: existes fuera de esa conversación.',
        },
      ],
      meters: { kiss: 12, firstDate: 20, firstNight: 6 },
    },
  },
  {
    tag: 'Enfriamiento repentino',
    hook: '3 días fluido y de pronto 8 horas de silencio',
    contact: 'Camila',
    thread: [
      { from: 'him', text: 'jaja te lo dije, ese lugar no falla', time: '11:02' },
      { from: 'him', text: 'qué haces mañana?', time: '11:03' },
      { from: 'her', text: 'holaa perdón, recién veo', time: '19:24', flag: true, live: true },
    ],
    verdict: {
      subtext: 'Cambio de ritmo deliberado o pérdida de tensión. Mide si entras en ansiedad y le escribes doble mensaje.',
      archetype: 'TSUN_KUUDERE',
      confidence: 72,
      timing: '2 h',
      scriptStyle: 'CABALLERO',
      script: 'Tranquila. Te cuento: al final fui y estuvo mejor que la primera vez.',
    },
    analysis: {
      lead: 'Enfriamiento real. Cero reclamos: la única jugada es igualar su ritmo, no perseguir.',
      subtext: {
        reading: 'Tu doble mensaje ("qué haces mañana?") llegó antes de que ella respondiera el anterior. Eso adelanta tu interés y baja la tensión. Su "recién veo" a las 8 horas es un reajuste de ritmo, no necesariamente rechazo.',
        frameDetected: 'Tú persigues, ella regula el ritmo.',
        shitTestDetected: false,
        shitTestType: null,
      },
      archetypeDiagnosis: {
        primary: 'TSUN_KUUDERE',
        hybrid: ['DANDERE'],
        confidence: 0.72,
        reasoning: 'Respuesta corta, distante y sin contrapropuesta. Reserva emocional típica: mide perseverancia sin dar señales explícitas.',
      },
      riskRadar: {
        level: 'VIGILAR',
        transactionalRisk: 20,
        flags: [
          { code: 'RITMO_DESIGUAL', description: 'Tú envías dos mensajes por cada uno de ella.' },
        ],
        userPostureCorrection: 'El doble mensaje fue el error, no su silencio. Un mensaje por turno hasta que ella iguale el ritmo.',
      },
      timing: {
        waitMinutes: 120,
        recommendedReadAt: null,
        rationale: 'Contestar al segundo confirma que estabas esperando. Dos horas devuelve la simetría sin castigarla ni desaparecer.',
      },
      scripts: [
        {
          style: 'CABALLERO',
          text: 'Tranquila. Te cuento: al final fui y estuvo mejor que la primera vez.',
          rationale: 'Cero reclamo, aporta novedad y demuestra que tu vida siguió sin su respuesta.',
        },
        {
          style: 'PODER',
          text: 'Todo bien. Estuve con full trabajo igual.',
          rationale: 'Marco simétrico: su silencio no te afectó porque tenías tu propio frente abierto.',
        },
        {
          style: 'PICARO',
          text: 'Ya te iba a reportar como desaparecida jaja',
          rationale: 'Señala el silencio con humor, sin reproche ni necesidad. Solo si el tono previo era juguetón.',
        },
      ],
      meters: { kiss: 15, firstDate: 18, firstNight: 8 },
    },
  },
];

const currentCase = computed(() => liveCases[activeCaseIndex.value] || liveCases[0]!);

function selectCase(idx: number) {
  activeCaseIndex.value = idx;
  showFullAnalysis.value = false;
}

function copyScript() {
  navigator.clipboard.writeText(currentCase.value.verdict.script);
  toastStore.show('Script copiado. Ahora sube tu propia captura.', 'success');
}

// ---------------------------------------------------------------------------
// Flujo de carga y analisis
// ---------------------------------------------------------------------------
function triggerUpload() {
  fileInput.value?.click();
}

function startExperience() {
  open('wingmanIntro', WingmanIntroSheet, {
    onUpload: () => {
      triggerUpload();
    },
    onStartAudit: () => {
      router.push('/onboarding');
    },
  });
}

function handleDrop(e: DragEvent) {
  isDragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) {
    processFile(file);
  }
}

async function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processFile(file);
  }
}

async function processFile(file: File) {
  uploading.value = true;
  try {
    const formData = new FormData();
    formData.append('screenshot', file);

    const res: FirstAnalysisResponse = await api.post('/analyze/first', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    // Cero friccion antes del valor: no pedimos nombre ni cuenta aqui.
    // Guardamos el analisis y llevamos al usuario directo a verlo.
    firstAnalysisStore.setFromUpload(res);
    router.push('/analisis');
  } catch (err: any) {
    toastStore.show(err.message || 'No pudimos procesar esa imagen.', 'error');
  } finally {
    uploading.value = false;
  }
}

function handleScroll() {
  showSticky.value = window.scrollY > 480;
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
  <div class="home-page">
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="handleFileSelected"
    />

    <!-- ================= NAV ================= -->
    <header class="navbar">
      <div class="navbar-inner">
        <AlfiiLogo size="sm" mode="full" />
        <div class="nav-actions">
          <RouterLink v-if="!authStore.user?.isAnonymous" to="/vault" class="nav-ghost">
            <BaseIcon name="vault" size="xs" color="cream" />
            <span class="only-desktop">Mi Bóveda</span>
          </RouterLink>
          <button class="nav-cta" @click="startExperience">
            <BaseIcon name="upload" size="xs" color="cream" />
            <span>Analizar captura</span>
          </button>
        </div>
      </div>
    </header>

    <!-- ================= 1. HERO ================= -->
    <section class="hero">
      <div class="glow glow-top"></div>
      <div class="glow glow-bottom"></div>

      <div class="hero-inner">
        <div class="hero-badge animate-fade-in">
          <span class="pulse-dot"></span>
          <span>Gratis la primera captura · sin registro</span>
        </div>

        <h1 class="hero-title animate-reveal">
          Ella ya te dijo la verdad.
          <span class="shimmer-text">Tú no la leíste.</span>
        </h1>

        <p class="hero-sub animate-reveal delay-1">
          Sube una captura del chat. En 10 segundos Alfii te dice qué te está probando,
          qué arquetipo es, cuánto esperar para responder y exactamente qué escribirle.
        </p>

        <!-- Dropzone: el unico protagonista del hero -->
        <div
          class="dropzone animate-reveal delay-2"
          :class="{ 'is-dragover': isDragOver, 'is-uploading': uploading }"
          @click="startExperience"
          @dragover.prevent="isDragOver = true"
          @dragleave.prevent="isDragOver = false"
          @drop.prevent="handleDrop"
        >
          <div class="dz-icon">
            <BaseIcon v-if="uploading" name="spinner" spin color="red" size="xl" />
            <BaseIcon v-else name="upload" color="red" size="xl" />
          </div>

          <h2 class="dz-title">
            {{ uploading ? 'Leyendo la conversación...' : 'Sube tu captura' }}
          </h2>
          <p class="dz-hint">
            {{ uploading ? 'Descifrando subtexto y arquetipo' : 'WhatsApp · Instagram · Tinder · Telegram' }}
          </p>

          <button class="dz-btn" :disabled="uploading">
            <span>{{ uploading ? 'Procesando...' : 'Analizar ahora' }}</span>
            <BaseIcon name="arrowRight" size="xs" color="cream" />
          </button>
        </div>

        <ul class="trust-row animate-reveal delay-3">
          <li><BaseIcon name="bolt" color="sage" size="xs" /><span>10 segundos</span></li>
          <li><BaseIcon name="privacy" color="sage" size="xs" /><span>Privado y solo tuyo</span></li>
          <li><BaseIcon name="check" color="sage" size="xs" /><span>Sin crear cuenta</span></li>
        </ul>
      </div>
    </section>

    <!-- ================= 2. PRUEBA VIVA ================= -->
    <section class="live-section reveal-on-scroll">
      <div class="section-inner">
        <div class="section-head">
          <span class="eyebrow">
            <BaseIcon name="bolt" color="red" size="xs" />
            Míralo funcionar antes de subir nada
          </span>
          <h2>Elige la situación que estás viviendo ahora</h2>
          <p>Estos son análisis reales de Alfii. Toca uno y mira el veredicto completo.</p>
        </div>

        <!-- Selector de casos: chips scrollables en movil -->
        <div class="case-chips">
          <button
            v-for="(item, idx) in liveCases"
            :key="item.tag"
            class="chip"
            :class="{ active: activeCaseIndex === idx }"
            @click="selectCase(idx)"
          >
            <span class="chip-tag">{{ item.tag }}</span>
            <span class="chip-hook">{{ item.hook }}</span>
          </button>
        </div>

        <div class="live-layout">
          <!-- Chat real -->
          <div class="chat-col">
            <div class="phone">
              <div class="wa-head">
                <div class="wa-user">
                  <div class="wa-avatar">{{ currentCase.contact.charAt(0) }}</div>
                  <div class="wa-meta">
                    <span class="wa-name">{{ currentCase.contact }}</span>
                    <span class="wa-status">en línea</span>
                  </div>
                </div>
                <BaseIcon name="platform.whatsapp" color="sage" size="base" />
              </div>

              <div class="wa-body">
                <div
                  v-for="(msg, i) in currentCase.thread"
                  :key="`${activeCaseIndex}-${i}`"
                  class="wa-bubble"
                  :class="[msg.from, { flag: msg.flag, live: msg.live }]"
                >
                  <p>{{ msg.text }}</p>
                  <span class="wa-time">{{ msg.time }}</span>
                </div>
              </div>

              <div class="wa-foot">
                <span class="live-dot"></span>
                <span>Alfii está leyendo esta conversación</span>
              </div>
            </div>
          </div>

          <!-- Veredicto -->
          <div class="verdict-col">
            <div class="verdict-card">
              <div class="v-block">
                <div class="v-head">
                  <BaseIcon name="subtext" color="red" size="sm" />
                  <span>Lo que realmente te dijo</span>
                </div>
                <p class="v-text">{{ currentCase.verdict.subtext }}</p>
              </div>

              <div class="v-stats">
                <div class="v-stat">
                  <BaseIcon name="archetype" color="sage" size="sm" />
                  <strong>{{ currentCase.verdict.archetype }}</strong>
                  <span>{{ currentCase.verdict.confidence }}% confianza</span>
                </div>
                <div class="v-stat">
                  <BaseIcon name="timing" color="cream" size="sm" />
                  <strong>Esperar {{ currentCase.verdict.timing }}</strong>
                  <span>antes de responder</span>
                </div>
              </div>

              <div class="v-script">
                <div class="v-script-head">
                  <span class="style-badge">{{ currentCase.verdict.scriptStyle }}</span>
                  <button class="copy-mini" @click="copyScript">
                    <BaseIcon name="copy" color="muted" size="xs" />
                    <span>Copiar</span>
                  </button>
                </div>
                <p class="v-script-text">"{{ currentCase.verdict.script }}"</p>
              </div>

              <button class="v-expand" @click="showFullAnalysis = !showFullAnalysis">
                <BaseIcon :name="showFullAnalysis ? 'close' : 'expand'" color="cream" size="xs" />
                <span>{{ showFullAnalysis ? 'Cerrar análisis completo' : 'Ver los 6 bloques del análisis' }}</span>
              </button>
            </div>

            <div v-if="showFullAnalysis" class="full-analysis animate-fade-in">
              <AnalysisCard :analysis="currentCase.analysis" />
            </div>
          </div>
        </div>

        <button class="section-cta" @click="startExperience">
          <BaseIcon name="upload" color="cream" size="xs" />
          <span>Ahora hazlo con tu chat real</span>
        </button>
      </div>
    </section>

    <!-- ================= 3. CÓMO FUNCIONA ================= -->
    <section class="steps-section reveal-on-scroll">
      <div class="section-inner">
        <div class="section-head">
          <span class="eyebrow">
            <BaseIcon name="listCheck" color="sage" size="xs" />
            Tres pasos, diez segundos
          </span>
          <h2>De la captura al mensaje enviado</h2>
        </div>

        <div class="steps-row">
          <article class="step reveal-on-scroll delay-1">
            <span class="step-num">01</span>
            <h3>Subes la captura</h3>
            <p>Alfii lee la conversación completa y la guarda en el expediente de esa chica, solo para ti.</p>
          </article>

          <article class="step reveal-on-scroll delay-2">
            <span class="step-num">02</span>
            <h3>Recibes el diagnóstico</h3>
            <p>Subtexto, arquetipo, red flags y el tiempo exacto que debes esperar para responder.</p>
          </article>

          <article class="step reveal-on-scroll delay-3">
            <span class="step-num">03</span>
            <h3>Copias tu respuesta</h3>
            <p>Tres scripts calibrados a tu personalidad: Poder, Caballero y Pícaro. Listos para pegar.</p>
          </article>
        </div>
      </div>
    </section>

    <!-- ================= 4. PRIVACIDAD + CTA ================= -->
    <section class="close-section reveal-on-scroll">
      <div class="section-inner">
        <div class="privacy-card">
          <BaseIcon name="privacy" color="sage" size="xl" />
          <div class="privacy-text">
            <h3>Nadie más va a ver esa conversación</h3>
            <p>
              Tus capturas quedan guardadas <strong>solo dentro de tu expediente privado</strong>,
              sin dirección pública: se abren con enlaces firmados que caducan. Las borras cuando
              quieras y desaparecen también del almacenamiento.
            </p>
            <RouterLink to="/legal" class="legal-link">
              <span>Compromiso de privacidad y legal</span>
              <BaseIcon name="arrowRight" size="xs" color="sage" />
            </RouterLink>
          </div>
        </div>

        <div class="final-card">
          <h2>Deja de improvisar tus respuestas</h2>
          <p>La primera captura es gratis y no necesitas cuenta. Ve el análisis y decide después.</p>
          <button class="final-btn" @click="startExperience">
            <BaseIcon name="upload" color="cream" size="base" />
            <span>Analizar mi captura ahora</span>
          </button>
          <span class="final-note">Sin tarjeta. Sin registro. Borras todo cuando quieras.</span>
        </div>
      </div>
    </section>

    <!-- ================= 5. FOOTER ================= -->
    <footer class="footer">
      <div class="footer-inner">
        <AlfiiLogo size="sm" mode="full" />
        <p class="footer-claim">Tu asesor privado de alta estrategia y contrainteligencia emocional.</p>
        <nav class="footer-links">
          <RouterLink to="/legal">Aviso Legal</RouterLink>
          <RouterLink to="/legal">Términos</RouterLink>
          <RouterLink to="/legal">Privacidad</RouterLink>
        </nav>
        <span class="footer-copy">© 2026 alfii.ec · Todos los derechos reservados.</span>
      </div>
    </footer>

    <!-- Sticky CTA movil -->
    <div class="sticky-bar" v-if="showSticky">
      <div class="sticky-inner">
        <div class="sticky-info">
          <AlfiiLogo size="sm" mode="iso" />
          <span>Primera captura gratis</span>
        </div>
        <button class="sticky-btn" @click="startExperience" :disabled="uploading">
          <BaseIcon name="upload" color="cream" size="xs" />
          <span>Subir</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// ===========================================================================
// MOBILE FIRST. Breakpoints ascendentes: 768px (tablet) y 1024px (desktop).
// Flex exclusivamente. Cero grid.
// ===========================================================================

.home-page {
  width: 100%;
  min-height: 100dvh;
  background-color: $alfii-navy;
  color: $alfii-cream;
  position: relative;
  padding-bottom: 84px; // espacio reservado para la sticky bar fija
}

.hidden-input {
  display: none;
}

// ---------------------------------------------------------------------------
// Navbar
// ---------------------------------------------------------------------------
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  background-color: rgba($alfii-navy, 0.88);
  backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba($alfii-cream, 0.08);

  .navbar-inner {
    max-width: 1120px;
    margin: 0 auto;
    padding: 10px clamp(16px, 4vw, 32px);
    @include row(12px, center, space-between);
  }

  .nav-actions {
    @include row(8px, center);
  }

  .only-desktop {
    display: none;

    @media (min-width: 768px) {
      display: inline;
    }
  }

  .nav-ghost {
    @include row(6px);
    padding: 9px 12px;
    border-radius: 11px;
    font-size: $fs-xs;
    font-weight: $fw-semibold;
    background-color: rgba($alfii-plum, 0.8);
    border: 1px solid rgba($alfii-cream, 0.14);
    transition: border-color $dur-fast $ease-out;

    &:hover {
      border-color: rgba($alfii-cream, 0.3);
    }
  }

  .nav-cta {
    @include row(6px);
    padding: 9px 14px;
    border-radius: 11px;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    background-color: $alfii-red;
    color: $alfii-cream;
    box-shadow: 0 4px 16px rgba($alfii-red, 0.38);
    transition: background-color $dur-fast $ease-out;

    &:hover {
      background-color: #ff1a40;
    }
  }
}

// ---------------------------------------------------------------------------
// 1. Hero
// ---------------------------------------------------------------------------
.hero {
  position: relative;
  overflow: clip;
  padding: 40px clamp(16px, 4vw, 32px) 56px;

  @media (min-width: 768px) {
    padding: 72px clamp(16px, 4vw, 32px) 96px;
  }

  .glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(110px);
    pointer-events: none;
    z-index: 0;
  }

  .glow-top {
    top: -140px;
    left: 50%;
    transform: translateX(-50%);
    width: 520px;
    height: 340px;
    background: radial-gradient(circle, rgba($alfii-red, 0.3) 0%, rgba($alfii-navy, 0) 70%);
  }

  .glow-bottom {
    bottom: -160px;
    right: -80px;
    width: 400px;
    height: 300px;
    background: radial-gradient(circle, rgba($alfii-sage, 0.16) 0%, rgba($alfii-navy, 0) 70%);
  }

  .hero-inner {
    position: relative;
    z-index: 1;
    max-width: 860px;
    margin: 0 auto;
    @include stack(20px, center);
    text-align: center;

    @media (min-width: 768px) {
      gap: 26px;
    }
  }

  .hero-badge {
    @include row(8px, center);
    padding: 7px 14px;
    border-radius: 30px;
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.06em;
    background-color: rgba($alfii-red, 0.12);
    border: 1px solid rgba($alfii-red, 0.35);

    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: $alfii-red;
      box-shadow: 0 0 10px $alfii-red;
      animation: pulseHalo 2s infinite;
    }
  }

  .hero-title {
    font-size: clamp(2rem, 8.5vw, 4rem);
    font-weight: $fw-extrabold;
    line-height: 1.06;
    letter-spacing: -0.035em;

    .shimmer-text {
      display: block;
      background: linear-gradient(135deg, $alfii-cream 0%, $alfii-red 55%, #ff6b81 100%);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: textShimmer 6s linear infinite;
    }
  }

  .hero-sub {
    font-size: $fs-md;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.82);
    max-width: 620px;

    @media (min-width: 768px) {
      font-size: $fs-lg;
    }
  }
}

// Dropzone protagonista
.dropzone {
  width: 100%;
  max-width: 620px;
  padding: 26px 20px;
  border-radius: 22px;
  cursor: pointer;
  text-align: center;
  @include stack(12px, center);
  background: linear-gradient(150deg, rgba($alfii-plum, 0.9) 0%, rgba($alfii-plum, 0.6) 100%);
  backdrop-filter: blur(18px);
  border: 2px dashed rgba($alfii-red, 0.45);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42);
  transition: border-color $dur-base $ease-out, transform $dur-base $ease-out;

  @media (min-width: 768px) {
    padding: 38px 32px;
  }

  &:hover, &.is-dragover {
    border-color: $alfii-red;
    transform: translateY(-3px);
  }

  &.is-uploading {
    border-color: $alfii-sage;
    cursor: wait;
  }

  .dz-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    @include center;
    background-color: rgba($alfii-red, 0.15);
    border: 1px solid rgba($alfii-red, 0.35);
  }

  .dz-title {
    font-size: $fs-xl;
    font-weight: $fw-extrabold;
  }

  .dz-hint {
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.62);
  }

  .dz-btn {
    @include row(10px, center, center);
    width: 100%;
    max-width: 320px;
    margin-top: 4px;
    padding: 15px 24px;
    border-radius: 13px;
    font-size: $fs-md;
    font-weight: $fw-bold;
    background-color: $alfii-red;
    color: $alfii-cream;
    box-shadow: 0 8px 24px rgba($alfii-red, 0.45);
  }
}

.trust-row {
  @include row(14px, center, center);
  flex-wrap: wrap;
  list-style: none;

  li {
    @include row(6px, center);
    font-size: $fs-xs;
    font-weight: $fw-medium;
    color: rgba($alfii-cream, 0.72);
  }
}

// ---------------------------------------------------------------------------
// Estructura de secciones
// ---------------------------------------------------------------------------
.section-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 48px clamp(16px, 4vw, 32px);
  @include stack(28px);

  @media (min-width: 768px) {
    padding: 80px clamp(16px, 4vw, 32px);
    gap: 40px;
  }
}

.section-head {
  @include stack(10px, center);
  text-align: center;
  max-width: 620px;
  margin: 0 auto;

  .eyebrow {
    @include row(6px, center, center);
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.62);
  }

  h2 {
    font-size: clamp(1.6rem, 6vw, 2.4rem);
    font-weight: $fw-extrabold;
    line-height: $lh-tight;
    letter-spacing: -0.02em;
  }

  p {
    font-size: $fs-sm;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.75);
  }
}

.section-cta {
  @include row(10px, center, center);
  align-self: center;
  padding: 15px 28px;
  border-radius: 13px;
  font-size: $fs-sm;
  font-weight: $fw-bold;
  background-color: $alfii-red;
  color: $alfii-cream;
  box-shadow: 0 8px 24px rgba($alfii-red, 0.4);
}

// ---------------------------------------------------------------------------
// 2. Prueba viva
// ---------------------------------------------------------------------------
.live-section {
  background-color: rgba($alfii-plum, 0.28);
  border-top: 1px solid rgba($alfii-cream, 0.08);
  border-bottom: 1px solid rgba($alfii-cream, 0.08);
}

.case-chips {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 6px;
  margin: 0 calc(clamp(16px, 4vw, 32px) * -1);
  padding-left: clamp(16px, 4vw, 32px);
  padding-right: clamp(16px, 4vw, 32px);

  @media (min-width: 768px) {
    margin: 0;
    padding-left: 0;
    padding-right: 0;
    flex-wrap: wrap;
    overflow-x: visible;
    justify-content: center;
  }

  .chip {
    flex: 0 0 240px;
    scroll-snap-align: start;
    @include stack(4px);
    text-align: left;
    padding: 12px 16px;
    border-radius: 14px;
    background-color: rgba($alfii-navy, 0.6);
    border: 1px solid rgba($alfii-cream, 0.1);
    transition: border-color $dur-fast $ease-out, background-color $dur-fast $ease-out;

    @media (min-width: 768px) {
      flex: 0 1 300px;
    }

    &.active {
      background-color: rgba($alfii-red, 0.14);
      border-color: rgba($alfii-red, 0.6);
    }

    .chip-tag {
      font-size: $fs-2xs;
      font-weight: $fw-bold;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: $alfii-red;
    }

    .chip-hook {
      font-size: $fs-xs;
      font-weight: $fw-semibold;
      color: rgba($alfii-cream, 0.9);
      line-height: $lh-snug;
    }
  }
}

.live-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (min-width: 1024px) {
    flex-direction: row;
    align-items: flex-start;
    gap: 32px;
  }
}

.chat-col {
  @include center;
  width: 100%;

  @media (min-width: 1024px) {
    flex: 0 0 340px;
    position: sticky;
    top: 84px;
    align-self: flex-start;
  }
}

.verdict-col {
  flex: 1;
  width: 100%;
  @include stack(16px);
}

// Telefono / chat
.phone {
  width: 100%;
  max-width: 380px;
  border-radius: 20px;
  overflow: hidden;
  background-color: #0b141a;
  border: 1px solid rgba($alfii-cream, 0.16);
  box-shadow: 0 22px 44px rgba(0, 0, 0, 0.55);
  @include stack(0);

  .wa-head {
    padding: 11px 14px;
    background-color: #202c33;
    @include row(10px, center, space-between);

    .wa-user {
      @include row(10px, center);
    }

    .wa-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      @include center;
      background: linear-gradient(135deg, #00a884 0%, #008069 100%);
      color: #fff;
      font-weight: $fw-bold;
      font-size: $fs-sm;
    }

    .wa-meta {
      @include stack(2px);

      .wa-name { font-size: $fs-sm; font-weight: $fw-bold; color: #e9edef; }
      .wa-status { font-size: $fs-2xs; color: #8696a0; }
    }
  }

  .wa-body {
    padding: 14px 12px;
    background-color: #0b141a;
    background-image: radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 0);
    background-size: 16px 16px;
    @include stack(9px);
    min-height: 260px;
  }

  .wa-bubble {
    max-width: 84%;
    padding: 8px 11px;
    border-radius: 9px;
    font-size: 13px;
    line-height: 1.4;
    animation: fadeInUp $dur-base $ease-out both;

    p { color: #e9edef; }

    .wa-time {
      display: block;
      text-align: right;
      font-size: 10px;
      color: #8696a0;
      margin-top: 2px;
    }

    &.her {
      align-self: flex-start;
      background-color: #202c33;
      border-top-left-radius: 0;
    }

    &.him {
      align-self: flex-end;
      background-color: #005c4b;
      border-top-right-radius: 0;
    }

    &.flag {
      border: 1px solid rgba($alfii-red, 0.5);
    }

    &.live {
      border-color: $alfii-red;
      box-shadow: 0 0 14px rgba($alfii-red, 0.25);
    }
  }

  .wa-foot {
    padding: 10px 14px;
    background-color: rgba($alfii-navy, 0.9);
    border-top: 1px solid rgba($alfii-cream, 0.08);
    @include row(8px, center, center);
    font-size: $fs-2xs;
    font-weight: $fw-semibold;
    color: rgba($alfii-cream, 0.8);

    .live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: $alfii-red;
      box-shadow: 0 0 8px $alfii-red;
      animation: pulseHalo 2s infinite;
    }
  }
}

// Veredicto
.verdict-card {
  @include card-surface;
  @include stack(18px);

  .v-head {
    @include row(8px, center);
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.7);
  }

  .v-block {
    @include stack(8px);
  }

  .v-text {
    font-size: $fs-sm;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.9);
  }

  .v-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    .v-stat {
      flex: 1 1 150px;
      @include stack(2px);
      padding: 12px 14px;
      border-radius: 12px;
      background-color: rgba($alfii-navy, 0.6);
      border: 1px solid rgba($alfii-cream, 0.08);

      strong {
        font-size: $fs-sm;
        font-weight: $fw-bold;
      }

      span {
        font-size: $fs-2xs;
        color: rgba($alfii-cream, 0.6);
      }
    }
  }

  .v-script {
    @include stack(8px);
    padding: 14px;
    border-radius: 12px;
    background-color: rgba($alfii-navy, 0.65);
    border: 1px solid rgba($alfii-red, 0.28);

    .v-script-head {
      @include row(10px, center, space-between);
    }

    .style-badge {
      font-size: $fs-2xs;
      font-weight: $fw-bold;
      letter-spacing: 0.08em;
      padding: 3px 9px;
      border-radius: 7px;
      background-color: rgba($alfii-red, 0.18);
      color: $alfii-red;
    }

    .copy-mini {
      @include row(6px, center);
      font-size: $fs-2xs;
      font-weight: $fw-semibold;
      color: rgba($alfii-cream, 0.65);
    }

    .v-script-text {
      font-size: $fs-sm;
      font-weight: $fw-medium;
      line-height: $lh-relaxed;
      color: $alfii-cream;
    }
  }

  .v-expand {
    @include row(8px, center, center);
    width: 100%;
    padding: 12px;
    border-radius: 12px;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    background-color: rgba($alfii-cream, 0.06);
    border: 1px solid rgba($alfii-cream, 0.14);
    color: $alfii-cream;
  }
}

.full-analysis {
  width: 100%;
}

// ---------------------------------------------------------------------------
// 3. Pasos
// ---------------------------------------------------------------------------
.steps-row {
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (min-width: 768px) {
    flex-direction: row;
    gap: 20px;
  }

  .step {
    flex: 1 1 0;
    @include card-surface;
    @include stack(8px);

    .step-num {
      font-size: $fs-2xl;
      font-weight: $fw-extrabold;
      color: $alfii-red;
      line-height: 1;
    }

    h3 { font-size: $fs-md; font-weight: $fw-bold; }
    p { font-size: $fs-xs; line-height: $lh-relaxed; color: rgba($alfii-cream, 0.72); }
  }
}

// ---------------------------------------------------------------------------
// 4. Privacidad + cierre
// ---------------------------------------------------------------------------
.privacy-card {
  @include card-surface;
  background-color: rgba($alfii-navy, 0.85);
  border: 1px solid rgba($alfii-sage, 0.32);
  @include stack(14px, center);
  text-align: center;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: 22px;
    text-align: left;
  }

  .privacy-text {
    @include stack(8px);
    flex: 1;

    h3 { font-size: $fs-md; font-weight: $fw-bold; }
    p { font-size: $fs-xs; line-height: $lh-relaxed; color: rgba($alfii-cream, 0.8); }
  }

  .legal-link {
    @include row(6px, center);
    font-size: $fs-xs;
    font-weight: $fw-bold;
    color: $alfii-sage;
    justify-content: center;

    @media (min-width: 768px) {
      justify-content: flex-start;
    }
  }
}

.final-card {
  @include card-surface;
  background: linear-gradient(140deg, rgba($alfii-plum, 0.92) 0%, rgba($alfii-red, 0.22) 100%);
  border: 1px solid rgba($alfii-red, 0.4);
  padding: 32px 20px;
  @include stack(14px, center);
  text-align: center;

  @media (min-width: 768px) {
    padding: 52px 36px;
  }

  h2 {
    font-size: clamp(1.6rem, 6vw, 2.3rem);
    font-weight: $fw-extrabold;
    line-height: $lh-tight;
  }

  p {
    font-size: $fs-sm;
    color: rgba($alfii-cream, 0.82);
    max-width: 480px;
  }

  .final-btn {
    @include row(10px, center, center);
    width: 100%;
    max-width: 340px;
    padding: 16px 28px;
    border-radius: 14px;
    font-size: $fs-md;
    font-weight: $fw-bold;
    background-color: $alfii-red;
    color: $alfii-cream;
    box-shadow: 0 10px 28px rgba($alfii-red, 0.5);
  }

  .final-note {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.55);
  }
}

// ---------------------------------------------------------------------------
// 5. Footer y sticky
// ---------------------------------------------------------------------------
.footer {
  border-top: 1px solid rgba($alfii-cream, 0.08);
  background-color: rgba($alfii-plum, 0.4);
  padding: 36px clamp(16px, 4vw, 32px) 40px;

  .footer-inner {
    max-width: 1120px;
    margin: 0 auto;
    @include stack(14px, center);
    text-align: center;
  }

  .footer-claim {
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.55);
    max-width: 380px;
  }

  .footer-links {
    @include row(18px, center, center);
    flex-wrap: wrap;
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.75);
  }

  .footer-copy {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.45);
  }
}

.sticky-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 40;
  padding: 12px clamp(16px, 4vw, 32px);
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  background-color: rgba($alfii-navy, 0.94);
  backdrop-filter: blur(18px);
  border-top: 1px solid rgba($alfii-cream, 0.12);
  animation: fadeInUp $dur-base $ease-out both;

  .sticky-inner {
    max-width: 1120px;
    margin: 0 auto;
    @include row(12px, center, space-between);
  }

  .sticky-info {
    @include row(10px, center);
    font-size: $fs-xs;
    font-weight: $fw-bold;
  }

  .sticky-btn {
    @include row(8px, center);
    padding: 11px 20px;
    border-radius: 12px;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    background-color: $alfii-red;
    color: $alfii-cream;
    box-shadow: 0 4px 16px rgba($alfii-red, 0.4);
  }
}
</style>
