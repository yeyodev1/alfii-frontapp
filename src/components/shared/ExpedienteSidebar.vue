<script setup lang="ts">
/**
 * Sidebar de escritorio del chat: la Boveda en columna, para saltar entre
 * expedientes sin volver a /vault. Solo se monta a partir de 1024px; en movil
 * el flujo sigue siendo Boveda -> expediente con el boton de volver.
 */
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import { useTargetStore } from '@/stores/target';
import { useUserStore } from '@/stores/user';

const props = defineProps<{ activeId: string }>();

const router = useRouter();
const targetStore = useTargetStore();
const userStore = useUserStore();

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
  if (!targetStore.targets.length) void targetStore.fetchTargets();
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
      <button class="new-btn" type="button" title="Nuevo expediente" @click="router.push('/')">
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

    <div class="sb-foot">
      <span class="user">
        <span class="user-avatar">{{ (userStore.name || 'A').charAt(0).toUpperCase() }}</span>
        <span class="user-name">{{ userStore.name || 'Tu cuenta' }}</span>
      </span>
      <RouterLink to="/settings" class="settings" title="Ajustes">
        <BaseIcon name="settings" size="sm" color="muted" />
      </RouterLink>
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
  @include row(12px, center, space-between);
  padding: 14px 20px;
  border-top: 1px solid rgba($alfii-cream, 0.08);

  .user {
    @include row(10px, center);
    min-width: 0;
    .user-avatar {
      @include center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: rgba($alfii-cream, 0.12);
      font-weight: $fw-bold;
      font-size: $fs-2xs;
    }
    .user-name {
      font-size: $fs-xs;
      font-weight: $fw-semibold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .settings {
    @include center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    &:hover { background-color: rgba($alfii-cream, 0.06); }
  }
}
</style>
