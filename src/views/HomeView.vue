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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import AlfiiLogo from '@/components/shared/AlfiiLogo.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import WingmanIntroSheet from '@/components/modals/WingmanIntroSheet.vue';
import AuthSheet from '@/components/modals/AuthSheet.vue';
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

/** Import del chat completo: vive en su propia pantalla guiada (/nueva). */
function openImport() {
  router.push('/nueva');
}

// ---------------------------------------------------------------------------
// Sesion desde el header
// ---------------------------------------------------------------------------
const isLoggedIn = computed(() => !!authStore.user && !authStore.user.isAnonymous);
const userInitial = computed(() => {
  const u = authStore.user;
  const base = u?.preferredName || u?.email || '';
  return base.charAt(0).toUpperCase() || 'A';
});
const userLabel = computed(() => {
  const u = authStore.user;
  return u?.preferredName || u?.email?.split('@')[0] || 'Tu cuenta';
});

async function openLogin() {
  let legalVersion = '';
  try {
    const legalMeta: any = await api.get('/legal/meta');
    legalVersion = legalMeta.version;
  } catch {
    // Sin version legal solo se bloquea el registro; el login sigue.
  }
  open('auth', AuthSheet, {
    legalVersion,
    startMode: 'login',
    onSuccess: () => toastStore.show('Sesión iniciada. Tus partidas te esperan.', 'success'),
  });
}

async function handleLogout() {
  authStore.logout();
  await authStore.initAnonymous();
  toastStore.show('Sesión cerrada.', 'success');
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

  // Header: visible en el tope de la pagina (ahi vive el acceso a la sesion,
  // tiene que encontrarse sin buscar). Dentro del film del hero se retira para
  // dejar mandar al HUD propio (Jugador 1 + medidores) y vuelve con cualquier
  // gesto de scroll hacia ARRIBA pasado el film.
  const navEl = document.querySelector('.navbar');
  const filmEnd = () => {
    const film = document.querySelector<HTMLElement>('.film');
    return film ? film.offsetTop + film.offsetHeight - window.innerHeight : 600;
  };
  navEl?.classList.add('is-on');
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      const atTop = y < 80;
      navEl?.classList.toggle('is-on', atTop || (y > filmEnd() && self.direction === -1));
    },
  });
}, pageRef);
</script>

<template>
  <div ref="pageRef" class="home-page">
    <div class="hud-track">
      <div ref="hudBar" class="hud-bar"></div>
    </div>

    <input ref="fileInput" type="file" accept="image/*" class="hidden-input" @change="handleFileSelected" />

    <!-- Header HUD: sin barra que cruce la pantalla. El logo y las acciones
         flotan como piezas de interfaz de juego sobre el film; al bajar se
         retiran para dejar la escena limpia y vuelven con cualquier scroll
         hacia arriba. -->
    <header class="navbar">
      <div class="navbar-inner">
        <div class="brand-chip">
          <span class="brand-word">alfii</span>
        </div>
        <div class="nav-dock">
          <template v-if="isLoggedIn">
            <RouterLink to="/vault" class="nav-ghost">
              <BaseIcon name="vault" size="xs" color="cream" />
              <span class="only-desktop">Mis partidas</span>
            </RouterLink>
            <RouterLink to="/settings" class="nav-user" :title="userLabel">
              <span class="nav-avatar">{{ userInitial }}</span>
              <span class="only-desktop nav-user-name">{{ userLabel }}</span>
            </RouterLink>
            <button class="nav-ghost" title="Cerrar sesión" @click="handleLogout">
              <BaseIcon name="logout" size="xs" color="cream" />
            </button>
          </template>
          <button v-else class="nav-ghost" @click="openLogin">
            <BaseIcon name="key" size="xs" color="cream" />
            <span>Entrar</span>
          </button>
          <button class="nav-cta" data-cuelume-press data-cuelume-release @click="startExperience">
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

// Header HUD: dos piezas flotantes (marca y dock de acciones) en vez de una
// barra. El fondo de la pagina respira entre ellas; el contenedor no captura
// clicks — solo las piezas.
.navbar {
  position: fixed;
  top: 12px;
  left: 0;
  right: 0;
  z-index: 50;
  pointer-events: none;
  // Estado de reposo: retirado. Solo baja cuando el usuario scrollea hacia
  // arriba dentro de la pagina (clase .is-on desde ScrollTrigger).
  transform: translateY(-130%);
  opacity: 0;
  transition: transform 0.45s $ease-out, opacity 0.35s $ease-out;

  &.is-on {
    transform: translateY(0);
    opacity: 1;
  }

  .navbar-inner {
    max-width: 1220px;
    margin: 0 auto;
    padding: 0 clamp(12px, 3vw, 28px);
    @include row(12px, center, space-between);
  }

  .brand-chip,
  .nav-dock {
    pointer-events: auto;
    @include row(8px, center);
    border-radius: 999px;
    background-color: rgba($alfii-navy, 0.85);
    backdrop-filter: blur(16px);
    border: 1px solid rgba($alfii-cream, 0.16);
    box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
  }

  .brand-chip {
    padding: 8px 18px;

    .brand-word {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 19px;
      letter-spacing: -0.03em;
      line-height: 1;
      color: $alfii-cream;
    }
  }

  .nav-dock { padding: 5px; }

  .only-desktop {
    display: none;
    @media (min-width: 768px) { display: inline; }
  }

  .nav-ghost {
    @include row(6px);
    padding: 8px 13px;
    border-radius: 999px;
    font-size: $fs-xs;
    font-weight: $fw-semibold;
    color: rgba($alfii-cream, 0.85);
    transition: background-color $dur-fast $ease-out, color $dur-fast $ease-out;

    &:hover {
      background-color: rgba($alfii-cream, 0.08);
      color: $alfii-cream;
    }
  }

  .nav-user {
    @include row(8px);
    padding: 4px 10px 4px 4px;
    border-radius: 999px;
    max-width: 180px;
    color: rgba($alfii-cream, 0.9);
    transition: background-color $dur-fast $ease-out;

    &:hover { background-color: rgba($alfii-cream, 0.08); }

    .nav-avatar {
      @include center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, $alfii-red, #ff3b5c);
      font-family: var(--font-display);
      font-weight: 800;
      font-size: $fs-2xs;
      color: $alfii-cream;
      flex-shrink: 0;
    }

    .nav-user-name {
      font-size: $fs-2xs;
      font-weight: $fw-semibold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .nav-cta {
    @include row(6px);
    padding: 8px 16px;
    border-radius: 999px;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    background-color: $alfii-red;
    color: $alfii-cream;
    box-shadow: 0 4px 18px rgba($alfii-red, 0.45);
    transition: background-color $dur-fast $ease-out, transform $dur-fast $ease-out;

    &:hover {
      background-color: #ff1a40;
      transform: translateY(-1px);
    }
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
