<script setup lang="ts">
/**
 * Aviso de version nueva.
 *
 * El build deja /version.json con su sello. Cada cierto tiempo (y al volver a
 * la pestana) se compara con el sello compilado en este bundle: si difiere,
 * hay un deploy nuevo y el usuario esta corriendo codigo viejo. En vez de
 * forzar la recarga (perderia lo que este escribiendo) se le ofrece.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';

const CHECK_EVERY_MS = 3 * 60 * 1000;

const available = ref(false);
const dismissed = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;

async function check() {
  if (available.value) return;
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (data?.buildId && data.buildId !== __BUILD_ID__) {
      available.value = true;
      dismissed.value = false;
    }
  } catch {
    // Sin red o sin archivo: se reintenta en el siguiente ciclo.
  }
}

function onVisibility() {
  if (document.visibilityState === 'visible') void check();
}

function reload() {
  window.location.reload();
}

onMounted(() => {
  // El primer chequeo espera un poco: justo tras un deploy el CDN puede
  // servir index viejo con version.json nuevo y dispararia un falso aviso.
  setTimeout(check, 20_000);
  timer = setInterval(check, CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', onVisibility);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<template>
  <Transition name="update-banner">
    <div v-if="available && !dismissed" class="update-banner" role="status">
      <button type="button" class="update-banner__main" @click="reload">
        <span class="update-banner__mark"><BaseIcon name="rotate" size="sm" color="cream" /></span>
        <span class="update-banner__text">
          <strong>Alfii se actualizó</strong>
          <small>Toca aquí para cargar la versión nueva</small>
        </span>
        <BaseIcon name="arrowRight" size="xs" color="muted" />
      </button>
      <button type="button" class="update-banner__close" aria-label="Más tarde" @click="dismissed = true">
        <BaseIcon name="close" size="xs" color="muted" />
      </button>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.update-banner {
  position: fixed;
  left: 50%;
  bottom: max(88px, calc(env(safe-area-inset-bottom) + 88px));
  transform: translateX(-50%);
  z-index: 900;
  @include row(6px, center);
  max-width: min(92vw, 420px);
  padding: 6px 6px 6px 8px;
  border-radius: 16px;
  background: linear-gradient(160deg, rgba($alfii-red, 0.35) 0%, rgba($alfii-plum, 0.98) 100%);
  border: 1px solid rgba($alfii-red, 0.55);
  box-shadow: 0 18px 40px rgba($alfii-navy, 0.7), 0 0 24px rgba($alfii-red, 0.2);
  backdrop-filter: blur(16px);

  @media (min-width: 1024px) {
    bottom: 24px;
    left: auto;
    right: 24px;
    transform: none;
  }

  &__main {
    @include row(10px, center);
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
    border-radius: 12px;
    color: $alfii-cream;
    text-align: left;
    cursor: pointer;
    &:hover { background: rgba($alfii-cream, 0.06); }
  }

  &__mark {
    @include center;
    flex: 0 0 36px;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background-color: $alfii-red;
  }

  &__text {
    @include stack(1px);
    flex: 1;
    min-width: 0;
    strong { font-size: $fs-xs; font-weight: $fw-bold; }
    small { font-size: $fs-2xs; color: rgba($alfii-cream, 0.7); }
  }

  &__close {
    @include center;
    width: 32px;
    height: 32px;
    border-radius: 10px;
    cursor: pointer;
    &:hover { background: rgba($alfii-cream, 0.06); }
  }
}

.update-banner-enter-active,
.update-banner-leave-active {
  transition: opacity $dur-base $ease-out, transform $dur-base $ease-out;
}
.update-banner-enter-from,
.update-banner-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
  @media (min-width: 1024px) { transform: translateY(12px); }
}
</style>
