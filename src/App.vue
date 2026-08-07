<script setup lang="ts">
import AppShell from '@/components/shared/AppShell.vue';
import ModalHost from '@/components/modals/ModalHost.vue';
import ToastHost from '@/components/modals/ToastHost.vue';
import { onMounted, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRoute } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();

// Las vistas inmersivas (wizard, auditoria, expediente) miden 100dvh y traen su
// propia navegacion: la barra inferior del shell les sumaria alto y provocaria
// scroll vertical en toda la app.
const isImmersive = computed(() => route.meta?.immersive === true);

const isFullWidthView = computed(() => {
  return isImmersive.value || route.path === '/' || route.path === '/legal';
});

const showNav = computed(() => !isImmersive.value && route.path !== '/legal');

onMounted(() => {
  authStore.initAnonymous();
});
</script>

<template>
  <AppShell :show-nav="showNav" :full-width="isFullWidthView">
    <RouterView />
    <ModalHost />
    <ToastHost />
  </AppShell>
</template>
