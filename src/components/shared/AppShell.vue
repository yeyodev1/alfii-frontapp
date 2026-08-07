<script setup lang="ts">
import BaseIcon from '@/components/shared/BaseIcon.vue';

// `immersive` va aparte de `showNav`: hay vistas sin barra inferior que aun
// necesitan scroll propio (/legal es un documento largo). Atarlas al mismo flag
// dejaba esas vistas con overflow: hidden y sin forma de bajar.
withDefaults(
  defineProps<{
    showNav?: boolean;
    fullWidth?: boolean;
    immersive?: boolean;
  }>(),
  {
    showNav: true,
    fullWidth: false,
    immersive: false,
  }
);
</script>

<template>
  <div class="app-shell" :class="{ 'is-full-width': fullWidth, 'is-immersive': immersive }">
    <main class="shell-main">
      <slot />
    </main>

    <footer v-if="showNav" class="shell-nav">
      <div class="nav-container">
        <RouterLink to="/vault" class="nav-item" active-class="active">
          <BaseIcon name="vault" size="lg" />
          <span>Bóveda</span>
        </RouterLink>
        <!-- Apunta al heroe y no al onboarding: el usuario quiere ver su
             progreso, y desde ahi decide si completa lo que le falta. -->
        <RouterLink to="/heroe" class="nav-item" active-class="active">
          <BaseIcon name="step.PERSONALITY" size="lg" />
          <span>Mi carta</span>
        </RouterLink>
        <RouterLink to="/settings" class="nav-item" active-class="active">
          <BaseIcon name="settings" size="lg" />
          <span>Ajustes</span>
        </RouterLink>
      </div>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.app-shell {
  min-height: 100dvh;
  @include stack(0);
  background-color: $alfii-navy;
  position: relative;
  width: 100%;
}

.shell-main {
  flex: 1;
  min-height: 0;
  @include stack(0);
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  transition: max-width $dur-base $ease-out;
}

.is-full-width {
  .shell-main {
    max-width: 100%;
  }
}

// Sin barra inferior la vista gestiona su propio alto: se fija la ventana para
// que no quede ni un pixel de scroll de mas por redondeos o margenes.
.is-immersive {
  height: 100dvh;
  min-height: 100dvh;
  overflow: hidden;
}

.shell-nav {
  position: sticky;
  bottom: 0;
  width: 100%;
  z-index: 40;
  background-color: rgba($alfii-navy, 0.9);
  backdrop-filter: blur(16px);
  border-top: 1px solid rgba($alfii-cream, 0.08);
  padding: 8px 16px;
  padding-bottom: max(10px, env(safe-area-inset-bottom));

  .nav-container {
    max-width: 520px;
    margin: 0 auto;
    @include row(0, center, space-around);
    background-color: rgba($alfii-plum, 0.95);
    border: 1px solid rgba($alfii-cream, 0.1);
    border-radius: 20px;
    padding: 6px 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  }

  .nav-item {
    @include stack(3px, center);
    color: rgba($alfii-cream, 0.55);
    font-size: $fs-2xs;
    font-weight: $fw-medium;
    padding: 6px 20px;
    border-radius: 12px;
    transition: all $dur-fast $ease-out;

    &.active {
      color: $alfii-red;
      background-color: rgba($alfii-red, 0.1);

      :deep(i) {
        color: $alfii-red;
      }
    }
  }
}
</style>
