<script setup lang="ts">
import AppShell from '@/components/shared/AppShell.vue';
import ModalHost from '@/components/modals/ModalHost.vue';
import ToastHost from '@/components/modals/ToastHost.vue';
import { onMounted, computed, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRoute, useRouter } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

// Las vistas inmersivas (wizard, auditoria, expediente) miden 100dvh y traen su
// propia navegacion: la barra inferior del shell les sumaria alto y provocaria
// scroll vertical en toda la app.
const isImmersive = computed(() => route.meta?.immersive === true);

const isFullWidthView = computed(() => {
  return (
    isImmersive.value ||
    route.meta?.fullWidth === true ||
    route.path === '/' ||
    route.path === '/legal'
  );
});

const showNav = computed(() => !isImmersive.value && route.path !== '/legal');

/**
 * Transicion entre vistas con sentido de direccion.
 *
 * Se calcula comparando la profundidad de las rutas: entrar a un expediente
 * avanza, volver a la Boveda retrocede. Una animacion siempre igual en ambos
 * sentidos desorienta, porque el movimiento contradice lo que el usuario cree
 * que esta haciendo.
 *
 * `mode: out-in` no es opcional aqui: varias vistas miden 100dvh y solapar la
 * saliente con la entrante dispararia un scroll fantasma a mitad de animacion.
 */
const transitionName = ref('nav-forward');

router.afterEach((to, from) => {
  const toDepth = Number(to.meta?.depth ?? 0);
  const fromDepth = Number(from.meta?.depth ?? 0);
  transitionName.value = toDepth < fromDepth ? 'nav-back' : 'nav-forward';
});

onMounted(() => {
  authStore.initAnonymous();
});
</script>

<template>
  <AppShell :show-nav="showNav" :full-width="isFullWidthView" :immersive="isImmersive">
    <RouterView v-slot="{ Component, route: current }">
      <Transition :name="transitionName" mode="out-in">
        <component :is="Component" :key="current.path" />
      </Transition>
    </RouterView>
    <ModalHost />
    <ToastHost />
  </AppShell>
</template>
