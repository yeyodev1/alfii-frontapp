<script setup lang="ts">
/**
 * Home.
 *
 * Esta vista ya no pinta nada: orquesta. Cada seccion es un componente que trae
 * su propio movimiento y sus propios estilos (ninguno pasa de 400 lineas), y
 * aqui solo queda lo que es de la pagina entera: el flujo de subida, la barra
 * HUD de progreso, el navbar y la sticky de movil.
 *
 * PORQUE se partio: HomeView tenia 2400 lineas donde el copy, la coreografia y
 * el flujo de negocio se estorbaban. Tocar una animacion obligaba a leerlo todo.
 */
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import AlfiiLogo from '@/components/shared/AlfiiLogo.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import WingmanIntroSheet from '@/components/modals/WingmanIntroSheet.vue';
import ImportSheet from '@/components/modals/ImportSheet.vue';
import AnalysisDossier from '@/components/modals/AnalysisDossier.vue';
import HeroSection from '@/components/home/HeroSection.vue';
import PainSection from '@/components/home/PainSection.vue';
import LiveCasesSection from '@/components/home/LiveCasesSection.vue';
import ArchetypeSelect from '@/components/home/ArchetypeSelect.vue';
import ValueSection from '@/components/home/ValueSection.vue';
import StepsSection from '@/components/home/StepsSection.vue';
import CompareSection from '@/components/home/CompareSection.vue';
import FaqSection from '@/components/home/FaqSection.vue';
import CloseSection from '@/components/home/CloseSection.vue';
import SiteFooter from '@/components/home/SiteFooter.vue';
import { liveCases } from '@/config/homeContent';
import { useModal } from '@/composables/useModal';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { useGsapContext, gsap, ScrollTrigger } from '@/composables/useGsap';
import { useFirstAnalysisStore, type FirstAnalysisResponse } from '@/stores/firstAnalysis';
import api from '@/services/http';

const router = useRouter();
const { open } = useModal();
const authStore = useAuthStore();
const toastStore = useToastStore();
const firstAnalysisStore = useFirstAnalysisStore();

const pageRef = ref<HTMLElement | null>(null);
const hudBar = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const uploading = ref(false);
const isDragOver = ref(false);
const showSticky = ref(false);

// ---------------------------------------------------------------------------
// Flujo de subida y analisis
// ---------------------------------------------------------------------------
function triggerUpload() {
  fileInput.value?.click();
}

function startExperience() {
  open('wingmanIntro', WingmanIntroSheet, {
    onUpload: triggerUpload,
    onImport: openImport,
    onStartAudit: () => router.push('/onboarding'),
  });
}

/** Import del chat completo: mismo destino que la captura, mas contexto. */
function openImport() {
  open('importChat', ImportSheet, {
    onAnalyzed: (res: FirstAnalysisResponse) => {
      firstAnalysisStore.setFromUpload(res);
      router.push('/analisis');
    },
  });
}

function handleDrop(e: DragEvent) {
  isDragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) processFile(file);
}

function handleFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) processFile(file);
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
    firstAnalysisStore.setFromUpload(res);
    router.push('/analisis');
  } catch (err: any) {
    toastStore.show(err.message || 'No pudimos procesar esa imagen.', 'error');
  } finally {
    uploading.value = false;
  }
}

// ---------------------------------------------------------------------------
// Prueba viva -> expediente
// ---------------------------------------------------------------------------
function copyScript(script: string) {
  navigator.clipboard.writeText(script);
  toastStore.show('Script copiado. Ahora sube tu propia captura.', 'success');
}

/** El expediente crece desde la tarjeta que el usuario acaba de leer. */
function openDossier({ index, origin }: { index: number; origin: HTMLElement | null }) {
  const item = liveCases[index] || liveCases[0]!;
  open('home-full-analysis', AnalysisDossier, {
    analysis: item.analysis,
    contact: item.contact,
    origin,
  });
}

function handleScroll() {
  showSticky.value = window.scrollY > 480;
}

onMounted(() => window.addEventListener('scroll', handleScroll, { passive: true }));
onUnmounted(() => window.removeEventListener('scroll', handleScroll));

useGsapContext(() => {
  // La HUD vive fuera de matchMedia: es informacion (cuanto llevas de pagina),
  // no adorno. Con movimiento reducido sigue siendo util.
  if (hudBar.value) {
    gsap.to(hudBar.value, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
    });
  }

  // Al salir del hero el navbar deja de ser cabecera y se condensa.
  ScrollTrigger.create({
    start: 80,
    end: 'max',
    toggleClass: { targets: '.navbar', className: 'is-scrolled' },
  });
}, pageRef);
</script>

<template>
  <div ref="pageRef" class="home-page">
    <div class="hud-track">
      <div ref="hudBar" class="hud-bar"></div>
    </div>

    <input ref="fileInput" type="file" accept="image/*" class="hidden-input" @change="handleFileSelected" />

    <header class="navbar">
      <div class="navbar-inner">
        <AlfiiLogo size="sm" mode="full" />
        <div class="nav-actions">
          <RouterLink v-if="!authStore.user?.isAnonymous" to="/vault" class="nav-ghost">
            <BaseIcon name="vault" size="xs" color="cream" />
            <span class="only-desktop">Mis partidas</span>
          </RouterLink>
          <button class="nav-cta" @click="startExperience">
            <BaseIcon name="upload" size="xs" color="cream" />
            <span>Nueva partida</span>
          </button>
        </div>
      </div>
    </header>

    <HeroSection
      :uploading="uploading"
      :is-drag-over="isDragOver"
      @upload="startExperience"
      @drop="handleDrop"
      @dragstate="isDragOver = $event"
    />

    <PainSection />

    <ArchetypeSelect @cta="startExperience" />

    <LiveCasesSection @copy="copyScript" @expand="openDossier" @cta="startExperience" />

    <ValueSection />

    <StepsSection />

    <CompareSection />

    <FaqSection />

    <CloseSection @cta="startExperience" />

    <SiteFooter />

    <div class="sticky-bar" v-if="showSticky">
      <div class="sticky-inner">
        <div class="sticky-info">
          <AlfiiLogo size="sm" mode="iso" />
          <span>Primera partida gratis</span>
        </div>
        <button class="sticky-btn" @click="startExperience" :disabled="uploading">
          <BaseIcon name="upload" size="xs" color="cream" />
          <span>{{ uploading ? 'Analizando...' : 'Jugar' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.home-page {
  width: 100%;
  min-height: 100dvh;
  background-color: $alfii-navy;
  color: $alfii-cream;
  position: relative;
  padding-bottom: 84px; // espacio reservado para la sticky bar fija

  // En escritorio no hay sticky que reservar: el aire sobrante solo alejaba
  // el footer.
  @media (min-width: 1024px) {
    padding-bottom: 0;
  }
}

.hidden-input {
  display: none;
}

// Barra fija por encima del navbar: scaleX de 0 a 1 con el scroll de la pagina.
.hud-track {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 60;
  background-color: rgba($alfii-cream, 0.06);
  pointer-events: none;
}

.hud-bar {
  height: 100%;
  width: 100%;
  transform: scaleX(0);
  transform-origin: 0 50%;
  background: linear-gradient(90deg, $alfii-red 0%, #ff3b5c 60%, $alfii-sage 100%);
  box-shadow: 0 0 12px rgba($alfii-red, 0.8);
}

.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  background-color: rgba($alfii-navy, 0.72);
  backdrop-filter: blur(22px);
  border-bottom: none;
  transition: background-color $dur-base $ease-out, border-color $dur-base $ease-out,
    box-shadow $dur-base $ease-out;

  &.is-scrolled {
    background-color: rgba($alfii-navy, 0.96);
    border-bottom-color: rgba($alfii-cream, 0.14);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.32);

    .navbar-inner {
      padding-top: 6px;
      padding-bottom: 6px;
    }
  }

  .navbar-inner {
    max-width: 1180px;
    margin: 0 auto;
    padding: 8px clamp(16px, 4vw, 32px);
    @include row(12px, center, space-between);
    transition: padding $dur-base $ease-out;
  }

  // Firma de partida: la costura inferior lleva el gradiente del cabezal.
  &::after {
    content: '';
    position: absolute;
    left: 0; right: 0; bottom: -1px;
    height: 1px;
    background: linear-gradient(90deg, rgba($alfii-red, 0.7), rgba($alfii-cream, 0.1) 45%, rgba($alfii-sage, 0.5));
    pointer-events: none;
  }

  .nav-actions { @include row(8px, center); }

  .only-desktop {
    display: none;
    @media (min-width: 768px) { display: inline; }
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

    &:hover { border-color: rgba($alfii-cream, 0.3); }
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

    &:hover { background-color: #ff1a40; }
  }
}

// Barra de pulgar: solo movil. En escritorio el navbar ya lleva el mismo boton
// fijo arriba, y abajo solo tapaba el final de las secciones clavadas.
.sticky-bar {
  @media (min-width: 1024px) {
    display: none;
  }

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
