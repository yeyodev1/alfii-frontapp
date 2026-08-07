<script setup lang="ts">
import logoFull from '@/assets/logo-full.png';
import logoIso from '@/assets/iso.png';

withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
    mode?: 'full' | 'iso';
    showSubtitle?: boolean;
  }>(),
  {
    size: 'md',
    mode: 'full',
    showSubtitle: false,
  }
);
</script>

<template>
  <div class="alfii-logo-wrap" :class="[`size-${size}`, `mode-${mode}`]">
    <img
      v-if="mode === 'iso'"
      :src="logoIso"
      alt="alfii iso"
      class="logo-img iso-img"
    />
    <div v-else class="full-logo-container">
      <img
        :src="logoFull"
        alt="alfii logo"
        class="logo-img full-img"
      />
      <span v-if="showSubtitle" class="brand-subtitle">asesor privado</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.alfii-logo-wrap {
  @include center;
  user-select: none;
  display: inline-flex;
  flex-direction: column;
}

.full-logo-container {
  @include stack(4px, center);
}

.logo-img {
  object-fit: contain;
  display: block;
  height: auto;
  filter: brightness(0) invert(1) drop-shadow(0 4px 12px rgba(0, 0, 0, 0.4));
}

.brand-subtitle {
  font-size: $fs-2xs;
  font-weight: $fw-bold;
  color: rgba($alfii-cream, 0.65);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: -8px;
}

// Tamanos
.size-sm {
  .iso-img { width: 28px; height: 28px; }
  .full-img { width: 90px; }
}

.size-md {
  .iso-img { width: 36px; height: 36px; }
  .full-img { width: 130px; }
}

.size-lg {
  .iso-img { width: 52px; height: 52px; }
  .full-img { width: 180px; }
}

.size-xl {
  .iso-img { width: 72px; height: 72px; }
  .full-img { width: 240px; }
}

.size-hero {
  .iso-img { width: 96px; height: 96px; }
  .full-img { width: 280px; max-width: 85vw; }
}
</style>
