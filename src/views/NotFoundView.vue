<script setup lang="ts">
import BaseIcon from '@/components/shared/BaseIcon.vue';
import AlfiiLogo from '@/components/shared/AlfiiLogo.vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

/**
 * 404 con la voz del producto.
 *
 * "Pagina no encontrada" es lo que dice un servidor. Alfii es un asesor que lee
 * situaciones, asi que aqui lee esta: el usuario siguio una pista que no lleva a
 * ningun sitio. El tono es el mismo del resto de la app y la pantalla es util,
 * no solo bonita: ofrece las salidas reales segun si tiene cuenta o no.
 */

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isRegistered = computed(() => !!authStore.user && !authStore.user.isAnonymous);

/** La ruta que se intento abrir, recortada: puede ser larguisima. */
const attempted = computed(() => {
  const path = route.fullPath || '/';
  return path.length > 46 ? `${path.slice(0, 46)}...` : path;
});

// El cursor mueve el resplandor de fondo. Es el unico adorno con movimiento y
// se apaga bajo prefers-reduced-motion y en tactil, donde no hay puntero.
const glowX = ref(50);
const glowY = ref(35);

function onPointerMove(e: PointerEvent) {
  if (e.pointerType !== 'mouse') return;
  glowX.value = (e.clientX / window.innerWidth) * 100;
  glowY.value = (e.clientY / window.innerHeight) * 100;
}

onMounted(() => window.addEventListener('pointermove', onPointerMove, { passive: true }));
onUnmounted(() => window.removeEventListener('pointermove', onPointerMove));

function goHome() {
  router.push('/');
}
</script>

<template>
  <div
    class="nf"
    :style="{ '--gx': `${glowX}%`, '--gy': `${glowY}%` }"
  >
    <div class="nf-glow"></div>
    <div class="nf-grid"></div>

    <div class="nf-inner">
      <AlfiiLogo size="sm" mode="iso" />

      <!-- El 404 como pieza grafica: cifra enorme y una senal de perdida -->
      <div class="code-wrap">
        <span class="code">404</span>
        <span class="code-echo" aria-hidden="true">404</span>
      </div>

      <span class="tag">
        <span class="pulse"></span>
        Señal perdida
      </span>

      <h1>Esta pista no lleva a ningún lado.</h1>
      <p class="sub">
        Seguiste un enlace que no existe, o que ya no existe. Pasa.
        Lo importante es no quedarse aquí parado.
      </p>

      <code class="path">{{ attempted }}</code>

      <div class="actions">
        <button v-if="isRegistered" class="btn primary" @click="router.push('/vault')">
          <BaseIcon name="vault" size="xs" color="cream" />
          <span>Ir a mi bóveda</span>
        </button>
        <button v-else class="btn primary" @click="goHome">
          <BaseIcon name="upload" size="xs" color="cream" />
          <span>Analizar una captura</span>
        </button>

        <button class="btn ghost" @click="router.back()">
          <BaseIcon name="back" size="xs" color="cream" />
          <span>Volver atrás</span>
        </button>
      </div>

      <div class="links">
        <RouterLink v-if="isRegistered" to="/heroe">Mi carta</RouterLink>
        <RouterLink to="/">Inicio</RouterLink>
        <RouterLink to="/legal">Legal</RouterLink>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// Mobile-first. Flex exclusivamente, cero grid.
.nf {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  overflow: hidden;
  padding: 32px clamp(16px, 5vw, 32px);
  background-color: $alfii-navy;
  color: $alfii-cream;
}

// Resplandor que sigue al puntero. Da sensacion de profundidad sin cargar la
// pantalla de elementos.
.nf-glow {
  position: absolute;
  inset: -30%;
  pointer-events: none;
  background: radial-gradient(
    circle at var(--gx, 50%) var(--gy, 35%),
    rgba($alfii-red, 0.22) 0%,
    rgba($alfii-red, 0.06) 28%,
    rgba($alfii-navy, 0) 60%
  );
  transition: background 0.4s $ease-out;
}

.nf-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(to right, rgba($alfii-cream, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba($alfii-cream, 0.04) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(circle at 50% 40%, black 0%, transparent 72%);
}

.nf-inner {
  position: relative;
  z-index: 1;
  @include stack(14px, center);
  text-align: center;
  max-width: 540px;
  width: 100%;
}

.code-wrap {
  position: relative;
  @include center;
  margin-top: 6px;
}

.code {
  position: relative;
  z-index: 1;
  font-size: clamp(5.5rem, 26vw, 10rem);
  font-weight: $fw-extrabold;
  line-height: 0.9;
  letter-spacing: -0.06em;
  background: linear-gradient(150deg, $alfii-cream 0%, rgba($alfii-cream, 0.5) 45%, $alfii-red 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

// Eco desenfocado detras de la cifra: la despega del fondo sin anadir un borde.
.code-echo {
  position: absolute;
  inset: 0;
  @include center;
  font-size: clamp(5.5rem, 26vw, 10rem);
  font-weight: $fw-extrabold;
  line-height: 0.9;
  letter-spacing: -0.06em;
  color: rgba($alfii-red, 0.32);
  filter: blur(26px);
  animation: pulseHalo 4s ease-in-out infinite;
}

.tag {
  @include row(8px, center);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: $fs-2xs;
  font-weight: $fw-bold;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba($alfii-cream, 0.8);
  background-color: rgba($alfii-red, 0.12);
  border: 1px solid rgba($alfii-red, 0.34);

  .pulse {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: $alfii-red;
    box-shadow: 0 0 10px $alfii-red;
    animation: pulseHalo 2s infinite;
  }
}

h1 {
  font-size: clamp(1.5rem, 6vw, 2.1rem);
  font-weight: $fw-extrabold;
  line-height: 1.15;
  letter-spacing: -0.025em;
}

.sub {
  font-size: $fs-sm;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.7);
  max-width: 420px;
}

.path {
  display: inline-block;
  max-width: 100%;
  padding: 7px 12px;
  border-radius: 9px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: $fs-2xs;
  color: rgba($alfii-cream, 0.5);
  background-color: rgba($alfii-navy, 0.7);
  border: 1px solid rgba($alfii-cream, 0.1);
  overflow-wrap: anywhere;
}

.actions {
  @include stack(9px);
  width: 100%;
  max-width: 320px;
  margin-top: 6px;
}

.btn {
  @include row(9px, center, center);
  width: 100%;
  padding: 14px 22px;
  border-radius: 13px;
  font-size: $fs-sm;
  font-weight: $fw-bold;

  &.primary {
    background-color: $alfii-red;
    color: $alfii-cream;
    box-shadow: 0 8px 24px rgba($alfii-red, 0.42);
  }

  &.ghost {
    color: rgba($alfii-cream, 0.8);
    background-color: rgba($alfii-cream, 0.06);
    border: 1px solid rgba($alfii-cream, 0.14);
  }
}

.links {
  @include row(18px, center, center);
  flex-wrap: wrap;
  margin-top: 4px;
  font-size: $fs-xs;
  color: rgba($alfii-cream, 0.5);

  a:hover { color: $alfii-cream; }
}

@media (prefers-reduced-motion: reduce) {
  .nf-glow { transition: none; }
  .code-echo { animation: none; }
}

@media (min-width: 768px) {
  .actions {
    flex-direction: row;
    max-width: 460px;
  }
}
</style>
