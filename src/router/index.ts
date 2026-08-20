import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import HomeView from '../views/HomeView.vue';

/**
 * `depth` define la jerarquia de navegacion para animar la transicion.
 *
 * Ir a mas profundo entra desde la derecha; volver, desde la izquierda. Sin este
 * dato la animacion seria siempre igual y el usuario perderia la nocion de si
 * esta avanzando o retrocediendo, que es justo lo que hace que una transicion
 * ayude en vez de estorbar.
 */
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { title: 'alfii — Asesor privado', depth: 0 },
  },
  // `immersive`: la vista ocupa la pantalla completa y trae su propia
  // navegacion. AppShell oculta la barra inferior y suelta el ancho maximo.
  // Sin esto, una vista de 100dvh mas la barra suman mas que la pantalla y
  // aparece un scroll vertical que no deberia existir.
  {
    path: '/analisis',
    name: 'FirstAnalysis',
    component: () => import('../views/FirstAnalysisView.vue'),
    meta: { title: 'Tu primer análisis — alfii', immersive: true, depth: 1 },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('../views/OnboardingView.vue'),
    meta: { title: 'La Auditoría — alfii', immersive: true, depth: 1 },
  },
  // `fullWidth`: la vista gestiona su propio ancho maximo. Sin esto AppShell la
  // encierra en 600px y la rejilla de escritorio queda en una sola columna.
  {
    path: '/vault',
    name: 'Vault',
    component: () => import('../views/VaultView.vue'),
    meta: { title: 'Bóveda — alfii', fullWidth: true, depth: 1 },
  },
  {
    path: '/heroe',
    name: 'Hero',
    component: () => import('../views/HeroView.vue'),
    meta: { title: 'Tu progreso — alfii', fullWidth: true, depth: 1 },
  },
  {
    path: '/chat/:id',
    name: 'TargetChat',
    component: () => import('../views/TargetChatView.vue'),
    meta: { title: 'Expediente — alfii', immersive: true, depth: 2 },
  },
  {
    path: '/chat/:id/ficha',
    name: 'HerCard',
    component: () => import('../views/HerCardView.vue'),
    meta: { title: 'Ficha de ella — alfii', immersive: true, depth: 3 },
  },
  {
    path: '/legal',
    name: 'Legal',
    component: () => import('../views/LegalView.vue'),
    meta: { title: 'Aviso Legal, Términos y Privacidad — alfii', depth: 1 },
  },
  // El backend es quien decide el acceso (ADMIN_EMAILS): la ruta existe para
  // todos pero sin permiso solo muestra el aviso de "solo administradores".
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/AdminView.vue'),
    // immersive: el portal trae su propio sidebar y scroll; la barra inferior
    // de la app no pinta nada aqui.
    meta: { title: 'Administración — alfii', fullWidth: true, immersive: true, depth: 1 },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { title: 'Ajustes — alfii', depth: 1 },
  },
  {
    path: '/recuperar',
    name: 'ForgotPassword',
    component: () => import('../views/ForgotPasswordView.vue'),
    meta: { title: 'Recuperar contraseña — alfii', depth: 1 },
  },
  {
    // Destino de los enlaces del correo de recuperacion: {APP_URL}/nueva-contrasena?token=...
    path: '/nueva-contrasena',
    name: 'ResetPassword',
    component: () => import('../views/ResetPasswordView.vue'),
    meta: { title: 'Nueva contraseña — alfii', depth: 1 },
  },
  {
    // Se muestra una 404 real en vez de redirigir al inicio: un redirect
    // silencioso hace creer al usuario que el enlace funciono y esconde que
    // algo esta roto, ademas de perder la URL que intento abrir.
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFoundView.vue'),
    meta: { title: 'Pista perdida — alfii', immersive: true, depth: 1 },
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
