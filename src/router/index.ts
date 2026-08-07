import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import HomeView from '../views/HomeView.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { title: 'alfii — Asesor privado' },
  },
  // `immersive`: la vista ocupa la pantalla completa y trae su propia
  // navegacion. AppShell oculta la barra inferior y suelta el ancho maximo.
  // Sin esto, una vista de 100dvh mas la barra suman mas que la pantalla y
  // aparece un scroll vertical que no deberia existir.
  {
    path: '/analisis',
    name: 'FirstAnalysis',
    component: () => import('../views/FirstAnalysisView.vue'),
    meta: { title: 'Tu primer análisis — alfii', immersive: true },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('../views/OnboardingView.vue'),
    meta: { title: 'La Auditoría — alfii', immersive: true },
  },
  {
    path: '/vault',
    name: 'Vault',
    component: () => import('../views/VaultView.vue'),
    meta: { title: 'Bóveda — alfii' },
  },
  {
    path: '/chat/:id',
    name: 'TargetChat',
    component: () => import('../views/TargetChatView.vue'),
    meta: { title: 'Expediente — alfii', immersive: true },
  },
  {
    path: '/legal',
    name: 'Legal',
    component: () => import('../views/LegalView.vue'),
    meta: { title: 'Aviso Legal, Términos y Privacidad — alfii' },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: 'Ajustes — alfii' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { left: 0, top: 0, behavior: 'smooth' };
  },
});

router.beforeEach((to, _from, next) => {
  if (to.meta?.title) {
    document.title = to.meta.title as string;
  }
  next();
});

export default router;
