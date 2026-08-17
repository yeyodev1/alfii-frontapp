<script setup lang="ts">
/**
 * Selector de partida — rehecho de 0 con las rivales al frente.
 *
 * Cada caso es una carta con el RETRATO de su arquetipo (el mismo plantel de
 * la Seleccion de Rival), la situacion y su frase gancho. La carta activa se
 * enciende en carmesi; las demas esperan en penumbra.
 */
import { ref } from 'vue';
import type { LiveCase } from '@/config/homeContent';
import { archetypeByCode } from '@/config/homeArchetypes';

const props = defineProps<{ cases: LiveCase[]; active: number }>();
defineEmits<{ (e: 'select', index: number): void }>();

const failed = ref<Set<string>>(new Set());

function rival(c: LiveCase) {
  return archetypeByCode(c.verdict.archetype);
}

function portrait(c: LiveCase): string | null {
  const r = rival(c);
  if (!r || failed.value.has(r.key)) return null;
  return `/home/arch-${r.key}.jpg`;
}

function markFailed(c: LiveCase) {
  const r = rival(c);
  if (r) failed.value = new Set([...failed.value, r.key]);
}

// props se usa en template via cases/active; referencia explicita para TS.
void props;
</script>

<template>
  <div class="case-select" role="tablist" aria-label="Casos de ejemplo">
    <button
      v-for="(c, i) in cases"
      :key="c.tag"
      type="button"
      role="tab"
      class="case-card"
      :class="{ on: i === active }"
      :aria-selected="i === active"
      @click="$emit('select', i)"
    >
      <span class="cc-portrait" aria-hidden="true">
        <img v-if="portrait(c)" :src="portrait(c)!" alt="" loading="lazy" @error="markFailed(c)" />
        <span v-else class="cc-fallback">{{ c.contact.charAt(0) }}</span>
      </span>

      <span class="cc-body">
        <span class="cc-tag">{{ c.tag }}</span>
        <span class="cc-hook">{{ c.hook }}</span>
        <span class="cc-rival">
          Rival: <strong>{{ rival(c)?.name ?? c.verdict.archetype }}</strong>
          <i v-for="n in rival(c)?.stars ?? 0" :key="n">◆</i>
        </span>
      </span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.case-select {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(10px, 1.6vw, 16px);
  width: 100%;
  max-width: 1020px;
  margin: 0 auto;

  @media (min-width: 700px) { grid-template-columns: repeat(3, 1fr); }
}

.case-card {
  @include row(12px, center);
  padding: 10px;
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  background-color: rgba($alfii-navy, 0.6);
  border: 1px solid rgba($alfii-cream, 0.1);
  transition: transform $dur-fast $ease-out, border-color $dur-fast $ease-out,
    box-shadow $dur-fast $ease-out, background-color $dur-fast $ease-out;

  &:hover { border-color: rgba($alfii-red, 0.5); transform: translateY(-2px); }

  // La partida elegida se enciende: borde carmesi, retrato a color, glow.
  &.on {
    background-color: rgba($alfii-red, 0.1);
    border-color: $alfii-red;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45), 0 0 24px rgba($alfii-red, 0.22);

    .cc-portrait img { filter: none; }
    .cc-rival strong { color: $alfii-cream; }
  }
}

.cc-portrait {
  position: relative;
  flex: 0 0 64px;
  width: 64px; height: 76px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(160deg, rgba($alfii-red, 0.25), rgba($alfii-navy, 0.9));

  img {
    width: 100%; height: 100%;
    object-fit: cover; object-position: center 18%;
    // En espera, la rival esta en penumbra; elegirla la revela.
    filter: grayscale(0.5) brightness(0.85);
    transition: filter $dur-base $ease-out;
  }

  .cc-fallback {
    position: absolute; inset: 0;
    @include center;
    font-family: var(--font-display);
    font-size: 1.6rem; font-weight: 800;
    color: rgba($alfii-cream, 0.5);
  }
}

.cc-body {
  @include stack(3px);
  flex: 1 1 auto;
  min-width: 0;
}

.cc-tag {
  font-family: var(--font-editorial);
  font-size: 12px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: rgba($alfii-red, 0.9);
}

.cc-hook {
  font-family: var(--font-editorial);
  font-size: clamp(0.9375rem, 1.3vw, 1rem);
  line-height: 1.4;
  color: rgba($alfii-cream, 0.88);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cc-rival {
  @include row(4px, center);
  font-family: var(--font-editorial);
  font-size: 12px;
  letter-spacing: 0.06em;
  color: rgba($alfii-cream, 0.5);

  strong { color: rgba($alfii-cream, 0.75); font-weight: 700; }

  i {
    font-style: normal; font-size: 8px;
    color: rgba($alfii-red, 0.8);
  }
}
</style>
