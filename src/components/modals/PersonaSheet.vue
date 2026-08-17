<script lang="ts">
/**
 * Selector de la voz de Alfii.
 *
 * Las claves espejan PERSONA_KEYS del backend. La foto de cada tarjeta se
 * carga de /personas/<clave>.jpg (carpeta public/): si el asset no existe,
 * cae al avatar estilizado con iniciales. Asi el arte se cambia copiando un
 * archivo, sin tocar codigo.
 */
export type PersonaKey = 'HARVEY' | 'HITCH' | 'BOND' | 'BARNEY' | 'STARK';

export interface PersonaOption {
  key: PersonaKey;
  label: string;
  initials: string;
  tagline: string;
  hint: string;
  quote: string;
  accent: string;
  /** "¿Por que elegirlo?": se despliega con el icono de info de la tarjeta. */
  why: string;
}

export const PERSONA_OPTIONS: PersonaOption[] = [
  {
    key: 'HARVEY',
    label: 'Harvey',
    initials: 'HS',
    tagline: 'Confianza absoluta y dominante',
    hint: 'Frases cortas, directas, cero rodeos. Para sonar poderoso y seguro.',
    quote: '"No juegas para no perder. Juegas para ganar."',
    accent: '#8a1f2d',
    why:
      'Escógelo si tiendes a sobre-explicarte o a rogar: te entrena en mensajes que ' +
      'imponen respeto, cortos y sin ansiedad. El marco dominante hecho voz.',
  },
  {
    key: 'HITCH',
    label: 'Hitch',
    initials: 'AH',
    tagline: 'El mentor cálido',
    hint: 'Encantador pero estratégico: entiende antes de actuar.',
    quote: '"Los principios básicos: no hay principios básicos."',
    accent: '#1f6e5c',
    why:
      'Escógelo si vas en serio o estás empezando en esto: lee primero qué siente ella ' +
      'y te da jugadas suaves y certeras. El mentor que quiere verte ganar.',
  },
  {
    key: 'BOND',
    label: 'Bond',
    initials: 'JB',
    tagline: 'Elegancia clásica y misterio',
    hint: 'Habla poco, insinúa mucho, siempre con clase.',
    quote: 'El caballero seductor que nunca pasa de moda.',
    accent: '#22344d',
    why:
      'Escógelo si prefieres insinuar antes que declarar: pocas palabras, mucha ' +
      'intención y cero desesperación. Elegancia que genera intriga.',
  },
  {
    key: 'BARNEY',
    label: 'Barney',
    initials: 'BS',
    tagline: 'Descarado, teatral y divertido',
    hint: 'Jugadas con nombre propio y confianza desmedida.',
    quote: 'Todo plan suena legendario. Literalmente.',
    accent: '#6d4a12',
    why:
      'Escógelo si quieres divertirte y atreverte más: jugadas teatrales con nombre ' +
      'propio y humor descarado. Perfecto para chats casuales con chispa.',
  },
  {
    key: 'STARK',
    label: 'Stark',
    initials: 'TS',
    tagline: 'Ingenio rápido y arrogancia encantadora',
    hint: 'Sarcasmo brillante: siempre tiene la última palabra.',
    quote: 'El más listo de la sala, de tu lado.',
    accent: '#7a2410',
    why:
      'Escógelo si tu arma es el ingenio: sarcasmo brillante, respuestas con vuelta de ' +
      'tuerca y siempre la última palabra. Para el ping-pong verbal.',
  },
];

export const PERSONA_LABELS: Record<string, string> = Object.fromEntries(
  PERSONA_OPTIONS.map((p) => [p.key, p.label])
);
</script>

<script setup lang="ts">
import { ref } from 'vue';
import BaseSheet from '@/components/modals/BaseSheet.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import api from '@/services/http';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  current?: string | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'picked', key: PersonaKey): void;
}>();

const toastStore = useToastStore();
const saving = ref<PersonaKey | null>(null);

/**
 * Cadena de arte por tarjeta: foto propia (.jpg en public/personas/) si el
 * cliente la puso -> ilustracion .svg incluida en el repo -> iniciales.
 * Cambiar el arte es copiar un archivo, nunca tocar codigo.
 */
const imageStage = ref<Record<string, 'jpg' | 'svg' | 'none'>>({});

function imageSrc(key: PersonaKey): string {
  const stage = imageStage.value[key] ?? 'jpg';
  return `/personas/${key.toLowerCase()}.${stage === 'jpg' ? 'jpg' : 'svg'}`;
}

function imageFailed(key: PersonaKey): boolean {
  return (imageStage.value[key] ?? 'jpg') === 'none';
}

function markFailed(key: PersonaKey) {
  const stage = imageStage.value[key] ?? 'jpg';
  imageStage.value = {
    ...imageStage.value,
    [key]: stage === 'jpg' ? 'svg' : 'none',
  };
}

/** Que tarjetas tienen abierto el "¿por que elegirlo?". */
const openWhy = ref<Set<string>>(new Set());

function toggleWhy(key: PersonaKey) {
  const next = new Set(openWhy.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  openWhy.value = next;
}

async function pick(key: PersonaKey) {
  if (saving.value) return;
  saving.value = key;
  try {
    await api.patch('/me/persona', { persona: key });
    emit('picked', key);
    toastStore.show('Listo. Alfii ya habla con esa voz.', 'success');
    emit('close');
  } catch {
    // El interceptor ya aviso; la hoja queda abierta para reintentar
  } finally {
    saving.value = null;
  }
}
</script>

<template>
  <BaseSheet title="¿Cómo quieres que te hable?" @close="emit('close')">
    <div class="persona-sheet">
      <p class="lead">
        Elige la voz de Alfii. Mismo cerebro, distinta actitud — y puedes cambiarla cuando
        quieras.
      </p>

      <div class="persona-list">
        <button
          v-for="p in PERSONA_OPTIONS"
          :key="p.key"
          type="button"
          class="persona-card"
          :class="{ on: current === p.key, saving: saving === p.key }"
          :style="{ '--accent': p.accent }"
          :disabled="!!saving"
          @click="pick(p.key)"
        >
          <span class="p-main">
            <span class="p-photo">
              <img
                v-if="!imageFailed(p.key)"
                :src="imageSrc(p.key)"
                :alt="p.label"
                loading="lazy"
                @error="markFailed(p.key)"
              />
              <span v-else class="p-fallback">{{ p.initials }}</span>
            </span>

            <span class="p-body">
              <strong>{{ p.label }}</strong>
              <span class="p-tagline">{{ p.tagline }}</span>
              <em>{{ p.hint }}</em>
              <span class="p-quote">{{ p.quote }}</span>
            </span>

            <!-- Info: abre el "por que elegirlo" SIN elegir la tarjeta -->
            <span
              class="p-info"
              role="button"
              :aria-expanded="openWhy.has(p.key)"
              aria-label="¿Por qué elegirlo?"
              @click.stop="toggleWhy(p.key)"
            >
              <BaseIcon name="info" size="xs" :color="openWhy.has(p.key) ? 'sage' : 'muted'" />
            </span>

            <BaseIcon v-if="saving === p.key" name="spinner" spin size="sm" color="cream" />
            <BaseIcon v-else-if="current === p.key" name="check" size="sm" color="sage" />
          </span>

          <span v-if="openWhy.has(p.key)" class="p-why">
            <BaseIcon name="lightbulb" size="xs" color="sage" />
            <span>{{ p.why }}</span>
          </span>
        </button>
      </div>
    </div>
  </BaseSheet>
</template>

<style lang="scss" scoped>
.persona-sheet {
  @include stack(14px);
}

.lead {
  font-size: $fs-sm;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.8);
}

.persona-list {
  @include stack(10px);
}

.persona-card {
  @include stack(10px);
  width: 100%;
  padding: 12px 14px;
  border-radius: 16px;
  text-align: left;
  background:
    linear-gradient(120deg, color-mix(in srgb, var(--accent) 26%, transparent) 0%, rgba($alfii-navy, 0.7) 55%);
  border: 1px solid rgba($alfii-cream, 0.13);
  cursor: pointer;
  transition: border-color $dur-fast $ease-out, transform $dur-fast $ease-out;

  &:hover:not(:disabled) {
    border-color: var(--accent);
    transform: translateX(3px);
  }

  &.on {
    border-color: $alfii-sage;
  }

  &:disabled:not(.saving) {
    opacity: 0.6;
  }

  &.saving {
    cursor: wait;
  }
}

.p-main {
  @include row(14px, center);
  width: 100%;
}

.p-info {
  flex: 0 0 auto;
  padding: 8px;
  border-radius: 50%;
  cursor: pointer;

  &:hover {
    background-color: rgba($alfii-cream, 0.08);
  }
}

.p-why {
  @include row(8px, flex-start);
  padding: 9px 12px;
  border-radius: 10px;
  background-color: rgba($alfii-sage, 0.09);
  border-left: 2px solid rgba($alfii-sage, 0.55);
  font-size: $fs-xs;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.85);
  text-align: left;
  animation: fadeInUp $dur-fast $ease-out both;
}

.p-photo {
  flex: 0 0 auto;
  width: 58px;
  height: 58px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba($alfii-cream, 0.2);
  background: linear-gradient(140deg, var(--accent) 0%, rgba($alfii-navy, 0.9) 100%);
  @include center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .p-fallback {
    font-size: $fs-md;
    font-weight: $fw-extrabold;
    letter-spacing: 0.04em;
    color: rgba($alfii-cream, 0.9);
  }
}

.p-body {
  @include stack(2px);
  flex: 1 1 auto;
  min-width: 0;

  strong {
    font-size: $fs-md;
    font-weight: $fw-extrabold;
    color: $alfii-cream;
  }

  .p-tagline {
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba($alfii-cream, 0.6);
  }

  em {
    font-style: normal;
    font-size: $fs-xs;
    line-height: $lh-snug;
    color: rgba($alfii-cream, 0.7);
  }

  .p-quote {
    font-size: $fs-2xs;
    font-style: italic;
    color: rgba($alfii-cream, 0.5);
  }
}
</style>
