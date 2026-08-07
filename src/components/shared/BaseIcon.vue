<script setup lang="ts">
import { computed } from 'vue';
import { ICON_MAP, type IconName } from '@/config/icons';

const props = withDefaults(
  defineProps<{
    name: IconName;
    size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
    color?: 'cream' | 'red' | 'sage' | 'plum' | 'muted';
    spin?: boolean;
    fade?: boolean;
    beat?: boolean;
    shake?: boolean;
    label?: string;
  }>(),
  {
    size: 'base',
    color: 'cream',
    spin: false,
    fade: false,
    beat: false,
    shake: false,
    label: undefined,
  }
);

const iconClass = computed(() => {
  const base = ICON_MAP[props.name] || 'fa-solid fa-circle-question';
  const anims = [
    props.spin ? 'fa-spin' : '',
    props.fade ? 'fa-fade' : '',
    props.beat ? 'fa-beat' : '',
    props.shake ? 'fa-shake' : '',
  ].filter(Boolean).join(' ');

  return `${base} ${anims}`.trim();
});

const sizeClass = computed(() => `size-${props.size}`);
const colorClass = computed(() => `color-${props.color}`);
</script>

<template>
  <i
    :class="[iconClass, sizeClass, colorClass]"
    :aria-hidden="!label"
    :aria-label="label"
  ></i>
</template>

<style lang="scss" scoped>
i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: color $dur-fast $ease-out, transform $dur-fast $ease-out;
}

.size-xs  { font-size: 11px; }
.size-sm  { font-size: 13px; }
.size-base{ font-size: 16px; }
.size-lg  { font-size: 20px; }
.size-xl  { font-size: 26px; }
.size-2xl { font-size: 34px; }

.color-cream { color: $alfii-cream; }
.color-red   { color: $alfii-red; }
.color-sage  { color: $alfii-sage; }
.color-plum  { color: $alfii-plum; }
.color-muted { color: rgba($alfii-cream, 0.55); }
</style>
