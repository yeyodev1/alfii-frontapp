<script setup lang="ts">
/**
 * Sidebar de escritorio del chat: la Boveda en columna, para saltar entre
 * expedientes sin volver a /vault. Solo se monta a partir de 1024px; en movil
 * el flujo sigue siendo Boveda -> expediente con el boton de volver.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import { useTargetStore } from '@/stores/target';
import { useAuthStore } from '@/stores/auth';
import { useModal } from '@/composables/useModal';
import { useToastStore } from '@/stores/toast';
import AuthSheet from '@/components/modals/AuthSheet.vue';
import api from '@/services/http';

const props = defineProps<{ activeId: string }>();

const router = useRouter();
const targetStore = useTargetStore();
const authStore = useAuthStore();
const { open } = useModal();
const toastStore = useToastStore();

// ---------------------------------------------------------------------------
// Cuenta (abajo a la izquierda): menu que sube desde el pie del sidebar.
// ---------------------------------------------------------------------------
const menuOpen = ref(false);
const footRef = ref<HTMLElement | null>(null);
const isLoggedIn = computed(() => !!authStore.user && !authStore.user.isAnonymous);
const accountName = computed(() => {
  const u = authStore.user;
  if (!u || u.isAnonymous) return 'Invitado';
  return u.preferredName || u.email?.split('@')[0] || 'Tu cuenta';
});
const accountInitial = computed(() => accountName.value.charAt(0).toUpperCase());
const planLabel = computed(() => {
  const u = authStore.user;
  if (!u || u.isAnonymous) return 'Sin cuenta';
  if (u.isVip) return 'VIP';
  return u.plan === 'pro' ? 'Pro' : 'Gratis';
});

function onDocClick(e: MouseEvent) {
  if (menuOpen.value && footRef.value && !footRef.value.contains(e.target as Node)) menuOpen.value = false;
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') menuOpen.value = false;
}

function go(path: string) {
  menuOpen.value = false;
  router.push(path);
}

async function openAuth() {
  menuOpen.value = false;
  let legalVersion = '';
  try { legalVersion = ((await api.get('/legal/meta')) as any).version; } catch { /* solo bloquea registro */ }
  open('auth', AuthSheet, {
    legalVersion,
    startMode: 'login',
    onSuccess: () => toastStore.show('Sesión iniciada.', 'success'),
  });
}

async function logout() {
  menuOpen.value = false;
  authStore.logout();
  await authStore.initAnonymous();
  toastStore.show('Sesión cerrada.', 'success');
  router.push('/');
}

const STAGE_LABELS: Record<string, string> = {
  APERTURA: 'Apertura',
  CALIBRACION: 'Calibrando',
  ESCALADA: 'Escalando',
  CITA_AGENDADA: 'Cita agendada',
  POST_CITA: 'Después de la cita',
  ENFRIADO: 'Enfriado',
  CERRADO: 'Cerrado',
};

const sorted = computed(() =>
  [...targetStore.targets].sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return tb - ta;
  })
);

function relative(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function riskClass(level?: string): string {
  if (level === 'ALTO' || level === 'ABORTAR') return 'risk-red';
  if (level === 'VIGILAR') return 'risk-cream';
  return 'risk-sage';
}

onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
  if (!targetStore.targets.length) void targetStore.fetchTargets();
});
onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKey);
});
</script>

<template>
  <aside class="expediente-sidebar">
    <div class="sb-head">
      <RouterLink to="/vault" class="brand">
        <span class="mark">a</span>
        <span class="brand-text">
          <strong>Bóveda</strong>
          <small>{{ sorted.length }} {{ sorted.length === 1 ? 'expediente' : 'expedientes' }}</small>
        </span>
      </RouterLink>
      <button class="new-btn" type="button" title="Nuevo expediente" @click="router.push('/nueva')">
        <BaseIcon name="plus" size="sm" color="cream" />
      </button>
    </div>

    <nav class="sb-list">
      <RouterLink
        v-for="t in sorted"
        :key="t.id"
        :to="`/chat/${t.id}`"
        class="item"
        :class="{ active: t.id === props.activeId }"
      >
        <span class="avatar" :class="`accent-${t.accentColor}`">{{ t.avatarInitial }}</span>
        <span class="item-body">
          <span class="item-top">
            <span class="name">{{ t.displayName }}</span>
            <span class="time">{{ relative(t.lastMessageAt) }}</span>
          </span>
          <span class="item-sub">
            <span class="dot" :class="riskClass(t.risk?.level)"></span>
            <span v-if="t.archetype?.label" class="arq">{{ t.archetype.label }}</span>
            <span class="stage">{{ t.archetype?.label ? '· ' : '' }}{{ STAGE_LABELS[t.stage] || 'Apertura' }}</span>
          </span>
        </span>
      </RouterLink>

      <p v-if="!targetStore.loading && !sorted.length" class="empty">Aún no tienes expedientes.</p>
    </nav>

    <div ref="footRef" class="sb-foot" :class="{ open: menuOpen }">
      <!-- Menu de cuenta: sube desde el pie -->
      <Transition name="acct">
        <div v-if="menuOpen" class="acct-menu" role="menu">
          <div class="acct-id">
            <span class="acct-avatar big">{{ accountInitial }}</span>
            <span class="acct-text">
              <strong>{{ accountName }}</strong>
              <small v-if="isLoggedIn">{{ authStore.user?.email }}</small>
              <small v-else>Guarda tus expedientes con una cuenta</small>
            </span>
            <span class="plan" :class="planLabel.toLowerCase()">{{ planLabel }}</span>
          </div>

          <template v-if="isLoggedIn">
            <button type="button" role="menuitem" @click="go('/settings')">
              <BaseIcon name="settings" size="sm" color="muted" /><span>Ajustes de la cuenta</span>
            </button>
            <button type="button" role="menuitem" @click="go('/heroe')">
              <BaseIcon name="meters" size="sm" color="muted" /><span>Mi progreso</span>
            </button>
            <button type="button" role="menuitem" @click="go('/vault')">
              <BaseIcon name="vault" size="sm" color="muted" /><span>Bóveda</span>
            </button>
            <button type="button" role="menuitem" @click="go('/legal')">
              <BaseIcon name="privacy" size="sm" color="muted" /><span>Privacidad y términos</span>
            </button>
            <div class="acct-sep"></div>
            <button type="button" role="menuitem" class="danger" @click="logout">
              <BaseIcon name="logout" size="sm" color="red" /><span>Cerrar sesión</span>
            </button>
          </template>
          <template v-else>
            <button type="button" role="menuitem" class="primary" @click="openAuth">
              <BaseIcon name="key" size="sm" color="cream" /><span>Entrar o crear cuenta</span>
            </button>
            <button type="button" role="menuitem" @click="go('/legal')">
              <BaseIcon name="privacy" size="sm" color="muted" /><span>Privacidad y términos</span>
            </button>
          </template>
        </div>
      </Transition>

      <button type="button" class="acct-trigger" :aria-expanded="menuOpen" @click.stop="menuOpen = !menuOpen">
        <span class="acct-avatar">{{ accountInitial }}</span>
        <span class="acct-text">
          <strong>{{ accountName }}</strong>
          <small>{{ isLoggedIn ? planLabel : 'Toca para entrar' }}</small>
        </span>
        <BaseIcon :name="menuOpen ? 'arrowUp' : 'settings'" size="sm" color="muted" />
      </button>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.expediente-sidebar {
  @include stack(0);
  width: 296px;
  flex: 0 0 296px;
  height: 100%;
  background-color: rgba($alfii-plum, 0.55);
  border-right: 1px solid rgba($alfii-cream, 0.08);
}

.sb-head {
  @include row(12px, center, space-between);
  padding: 20px 20px 12px;

  .brand {
    @include row(10px, center);
    text-decoration: none;
    color: $alfii-cream;

    .mark {
      @include center;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background-color: $alfii-red;
      font-weight: $fw-extrabold;
      font-size: $fs-md;
    }

    .brand-text {
      @include stack(1px);
      strong { font-size: $fs-sm; font-weight: $fw-bold; line-height: $lh-tight; }
      small { font-size: $fs-2xs; color: rgba($alfii-cream, 0.55); line-height: $lh-tight; }
    }
  }

  .new-btn {
    @include center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background-color: rgba($alfii-red, 0.18);
    border: 1px solid rgba($alfii-red, 0.45);
    cursor: pointer;
    transition: background-color $dur-fast $ease-out;
    &:hover { background-color: rgba($alfii-red, 0.3); }
  }
}

.sb-list {
  @include stack(4px);
  @include scroll-y;
  flex: 1;
  min-height: 0;
  padding: 4px 12px;

  .item {
    @include row(12px, center);
    padding: 12px;
    border-radius: 14px;
    border: 1px solid transparent;
    text-decoration: none;
    color: $alfii-cream;
    transition: background-color $dur-fast $ease-out, border-color $dur-fast $ease-out;

    &:hover { background-color: rgba($alfii-cream, 0.05); }

    &.active {
      background-color: rgba($alfii-red, 0.14);
      border-color: rgba($alfii-red, 0.4);
      .name { font-weight: $fw-bold; }
    }
  }

  .avatar {
    @include center;
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    font-weight: $fw-bold;
    font-size: $fs-sm;

    &.accent-red { background-color: rgba($alfii-red, 0.3); border: 1px solid $alfii-red; }
    &.accent-sage { background-color: rgba($alfii-sage, 0.3); border: 1px solid $alfii-sage; }
    &.accent-cream { background-color: rgba($alfii-cream, 0.2); border: 1px solid $alfii-cream; }
    &.accent-plum { background-color: rgba($alfii-plum, 0.9); border: 1px solid rgba($alfii-cream, 0.2); }
    &.accent-navy { background-color: rgba($alfii-navy, 0.8); border: 1px solid rgba($alfii-cream, 0.2); }
  }

  .item-body {
    @include stack(3px);
    flex: 1;
    min-width: 0;
  }

  .item-top {
    @include row(8px, center, space-between);
    .name {
      font-size: 15px;
      font-weight: $fw-semibold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .time { font-size: 12px; color: rgba($alfii-cream, 0.5); flex-shrink: 0; }
  }

  .item-sub {
    @include row(6px, center);
    font-size: $fs-2xs;
    white-space: nowrap;
    overflow: hidden;

    .dot {
      flex: 0 0 7px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      &.risk-red { background-color: $alfii-red; }
      &.risk-cream { background-color: $alfii-cream; }
      &.risk-sage { background-color: $alfii-sage; }
    }
    .arq { color: $alfii-sage; font-weight: $fw-semibold; }
    .stage { color: rgba($alfii-cream, 0.5); overflow: hidden; text-overflow: ellipsis; }
  }

  .empty {
    padding: 16px 12px;
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.5);
  }
}

.sb-foot {
  position: relative;
  padding: 10px 12px 12px;
  border-top: 1px solid rgba($alfii-cream, 0.08);

  .acct-trigger {
    @include row(10px, center);
    width: 100%;
    padding: 8px 10px;
    border-radius: 12px;
    text-align: left;
    transition: background-color $dur-fast $ease-out;
    &:hover { background-color: rgba($alfii-cream, 0.06); }
  }
  &.open .acct-trigger { background-color: rgba($alfii-cream, 0.08); }

  .acct-avatar {
    @include center;
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: linear-gradient(135deg, $alfii-red, #ff3b5c);
    color: $alfii-cream;
    font-family: var(--font-display);
    font-weight: 800;
    font-size: $fs-xs;
    &.big { width: 42px; height: 42px; font-size: $fs-md; }
  }

  .acct-text {
    @include stack(1px);
    flex: 1;
    min-width: 0;
    strong { font-size: $fs-xs; font-weight: $fw-semibold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    small { font-size: 11px; color: rgba($alfii-cream, 0.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  }

  .acct-menu {
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: calc(100% - 2px);
    @include stack(2px);
    padding: 8px;
    border-radius: 16px;
    background-color: rgba(#141b2d, 0.98);
    border: 1px solid rgba($alfii-cream, 0.14);
    box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(18px);
    z-index: 20;

    .acct-id {
      @include row(10px, center);
      padding: 8px 8px 10px;
      margin-bottom: 4px;
      border-bottom: 1px solid rgba($alfii-cream, 0.08);
    }

    .plan {
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: $fw-bold;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background-color: rgba($alfii-cream, 0.1);
      color: rgba($alfii-cream, 0.8);
      &.pro, &.vip { background-color: rgba(#c99a10, 0.3); color: #f2c14e; }
    }

    button {
      @include row(10px, center);
      width: 100%;
      padding: 9px 10px;
      border-radius: 10px;
      font-size: $fs-xs;
      font-weight: $fw-medium;
      color: rgba($alfii-cream, 0.88);
      text-align: left;
      transition: background-color $dur-fast $ease-out;
      &:hover { background-color: rgba($alfii-cream, 0.07); color: $alfii-cream; }
      &.danger { color: #ff8095; }
      &.primary { background-color: $alfii-red; color: $alfii-cream; font-weight: $fw-bold; justify-content: center; &:hover { background-color: #ff1a40; } }
    }

    .acct-sep { height: 1px; margin: 4px 6px; background-color: rgba($alfii-cream, 0.08); }
  }
}

.acct-enter-active, .acct-leave-active { transition: opacity $dur-fast $ease-out, transform $dur-base $ease-spring; }
.acct-enter-from, .acct-leave-to { opacity: 0; transform: translateY(8px) scale(0.98); }
</style>
