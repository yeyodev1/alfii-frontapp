<script setup lang="ts">
import BaseIcon from '@/components/shared/BaseIcon.vue';
import type { IconName } from '@/config/icons';
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { gsap } from '@/composables/useGsap';

/**
 * El bloque de la Auditoria presentado como una mision.
 *
 * PORQUE existe: las opciones vivian en el pie del chat. Ahi compiten por
 * espacio con la conversacion, asi que o se ven diminutas o entierran el hilo, y
 * en ninguno de los dos casos el usuario lee que implica cada una. Sacarlas a un
 * panel propio resuelve las dos cosas a la vez: la conversacion queda intacta
 * detras, y cada opcion tiene sitio para explicarse.
 *
 * Se cierra al elegir. No es una pantalla mas del flujo: es la pregunta actual,
 * y en cuanto se contesta desaparece y devuelve al usuario al chat.
 */
const props = defineProps<{
  step: number;
  totalSteps: number;
  title: string;
  ask: string;
  statCode: string;
  statName: string;
  /** Lo que Alfii recuerda de este usuario y ata con esta pregunta. Vacio en el
   *  primer bloque, cuando todavia no hay nada que citar. */
  contextNote: string;
  icon: IconName;
  options: { label: string; hint: string }[];
  sending: boolean;
  sensitive: boolean;
}>();

const emit = defineEmits<{
  (e: 'pick', label: string): void;
  (e: 'write'): void;
  (e: 'skip'): void;
}>();

/** La elegida se queda encendida mientras el panel sale: el tap tiene que acusar recibo. */
const picked = ref<string | null>(null);

const pips = computed(() =>
  Array.from({ length: props.totalSteps }, (_, i) => {
    if (i < props.step) return 'done';
    if (i === props.step) return 'current';
    return 'todo';
  })
);

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !picked.value) emit('write');
}

const panel = ref<HTMLElement | null>(null);
const backdrop = ref<HTMLElement | null>(null);

/** Con movimiento reducido no hay coreografia: el panel esta y ya. */
const motionOk =
  typeof window !== 'undefined' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let ctx: gsap.Context | null = null;

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  if (!motionOk) return;

  // nextTick para que las opciones ya esten en el DOM: sin el, el stagger
  // apunta a una lista vacia y las tarjetas entran de golpe.
  void nextTick(() => {
    ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from(backdrop.value, { opacity: 0, duration: 0.25 }, 0)
        .from(
          panel.value,
          { yPercent: -100, duration: 0.55, ease: 'back.out(1.05)' },
          0.02
        )
        // Los segmentos se llenan uno a uno: se lee como progreso ganado, no
        // como una barra que ya estaba ahi.
        // clearProps en cada .from: el tween posicionado pone opacity 0 en el
        // instante en que se crea el timeline. Si algo lo interrumpe (remount
        // por `sending`, revert a destiempo), los nodos se quedaban invisibles
        // ocupando su espacio: un panel alto y "vacio" con las opciones dentro.
        // Al terminar cada tween se limpia el estilo inline y el nodo queda
        // gobernado solo por el CSS, que siempre es visible.
        .from('.pip.done', { scaleX: 0, transformOrigin: '0 50%', duration: 0.3, stagger: 0.05 }, 0.3)
        .from('.mission-recall', { opacity: 0, x: -14, duration: 0.4, clearProps: 'opacity,transform' }, 0.35)
        .from('.mission-title', { opacity: 0, y: 18, duration: 0.45, clearProps: 'opacity,transform' }, 0.4)
        .from('.mission-ask', { opacity: 0, y: 14, duration: 0.4, clearProps: 'opacity,transform' }, 0.46)
        .from(
          '.mission-option',
          { opacity: 0, x: 26, duration: 0.45, stagger: 0.06, clearProps: 'opacity,transform' },
          0.5
        )
        .from('.mission-foot', { opacity: 0, y: 14, duration: 0.4, clearProps: 'opacity,transform' }, 0.62);
    }, panel.value ?? undefined);
  });
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  ctx?.revert();
});

function choose(label: string) {
  if (props.sending || picked.value) return;
  picked.value = label;

  if (!motionOk) {
    emit('pick', label);
    return;
  }

  // La confirmacion es una secuencia, no un retardo a ciegas: la elegida da un
  // golpe, las demas se apagan, y solo entonces sale el panel. El turno se
  // emite en onComplete para que el evento y la animacion no se desincronicen.
  const chosen = panel.value?.querySelector<HTMLElement>('.mission-option.picked');
  const others = panel.value
    ? Array.from(panel.value.querySelectorAll<HTMLElement>('.mission-option')).filter(
        (el) => el !== chosen
      )
    : [];

  void nextTick(() => {
    const tl = gsap.timeline({ onComplete: () => emit('pick', label) });

    if (chosen) {
      tl.to(chosen, { scale: 1.04, duration: 0.12, ease: 'power2.out' }, 0)
        .to(chosen, { scale: 1, duration: 0.16, ease: 'power2.inOut' }, 0.12);
    }
    if (others.length) {
      tl.to(others, { opacity: 0.18, scale: 0.97, duration: 0.2 }, 0);
    }

    tl.to(panel.value, { yPercent: -100, duration: 0.32, ease: 'power2.in' }, 0.22).to(
      backdrop.value,
      { opacity: 0, duration: 0.25 },
      0.24
    );
  });
}
</script>

<template>
  <Teleport to="body">
    <!--
      Tocar fuera equivale a "escribirlo yo": el panel se aparta y el foco cae en
      el campo de texto. Un panel del que no se puede salir tocando fuera se
      siente como un bloqueo, no como una pregunta.
    -->
    <div ref="backdrop" class="mission-backdrop" @click.self="emit('write')">
      <div ref="panel" class="mission-panel">
        <!-- Cabecera de mision: donde estas y cuanto falta -->
        <header class="mission-head">
          <div class="head-line">
            <BaseIcon :name="icon" size="sm" color="red" />
            <span class="block-tag">Bloque {{ step + 1 }} / {{ totalSteps }}</span>
            <span class="stat-tag">{{ statName }}</span>
          </div>

          <div class="pips">
            <span v-for="(state, i) in pips" :key="i" class="pip" :class="state"></span>
          </div>
        </header>

        <div class="mission-body">
          <!--
            Va ARRIBA de la pregunta, no debajo: primero el usuario ve que Alfii
            se acuerda de lo suyo, y desde ahi lee la pregunta. Al reves seria un
            pie de pagina que nadie mira.
          -->
          <p v-if="contextNote" class="mission-recall">
            <BaseIcon name="thinking" size="xs" color="sage" />
            <span>{{ contextNote }}</span>
          </p>

          <h2 class="mission-title">{{ title }}</h2>
          <p class="mission-ask">{{ ask }}</p>

          <div class="mission-options">
            <button
              v-for="opt in options"
              :key="opt.label"
              class="mission-option"
              :class="{ picked: picked === opt.label }"
              :disabled="sending || !!picked"
              @click="choose(opt.label)"
            >
              <span class="opt-body">
                <strong>{{ opt.label }}</strong>
                <em v-if="opt.hint">{{ opt.hint }}</em>
              </span>
              <BaseIcon
                v-if="picked === opt.label"
                name="check"
                size="sm"
                color="cream"
              />
            </button>
          </div>
        </div>

        <footer class="mission-foot">
          <div class="foot-actions">
            <button class="ghost-btn" :disabled="!!picked" @click="emit('write')">
              <BaseIcon name="scripts" size="xs" color="cream" />
              <span>Escribirlo yo</span>
            </button>
            <button class="ghost-btn" :disabled="sending || !!picked" @click="emit('skip')">
              <BaseIcon name="forward" size="xs" color="muted" />
              <span>{{ sensitive ? 'Prefiero no decirlo' : 'Saltar' }}</span>
            </button>
          </div>

          <div class="reward">
            <BaseIcon name="bolt" size="xs" color="sage" />
            <span>Sube <strong>{{ statCode }}</strong> · {{ statName }}</span>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
// Cae desde ARRIBA, como una notificacion, y compacto: el chat es el
// protagonista y el panel solo viene a indicar algo. Anclado abajo se leia
// como una pantalla nueva que enterraba la conversacion.
.mission-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0;
  // Se ve el chat detras a proposito: el panel es la pregunta actual, no una
  // pantalla nueva. El usuario no pierde de vista donde esta.
  background: radial-gradient(
    120% 80% at 50% 0%,
    rgba($alfii-navy, 0.92) 0%,
    rgba($alfii-navy, 0.72) 60%,
    rgba($alfii-navy, 0.55) 100%
  );
  backdrop-filter: blur(7px);
}

.mission-panel {
  position: relative;
  width: 100%;
  max-width: 520px;
  max-height: 76dvh;
  @include stack(0);
  overflow: hidden;
  border-radius: 0 0 26px 26px;
  border: 1px solid rgba($alfii-cream, 0.14);
  border-top: none;
  background:
    radial-gradient(90% 60% at 50% 0%, rgba($alfii-red, 0.16) 0%, transparent 70%),
    linear-gradient(180deg, rgba($alfii-plum, 0.99) 0%, rgba($alfii-navy, 0.99) 100%);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55), 0 0 40px rgba($alfii-red, 0.14);
  // La entrada y la salida las lleva GSAP desde el script. En CSS quedaba una
  // animacion de entrada y otra de confirmacion peleandose por el transform del
  // mismo nodo, que es la receta para que una de las dos se pierda a medias.
}

// --- cabecera ---
.mission-head {
  flex: 0 0 auto;
  @include stack(9px);
  // Respeta el notch: ahora el panel cuelga del borde superior del viewport.
  padding: max(16px, env(safe-area-inset-top)) 20px 12px;
  border-bottom: 1px solid rgba($alfii-cream, 0.07);

  .head-line {
    @include row(8px, center);
  }

  .block-tag {
    flex: 1;
    font-size: $fs-2xs;
    font-weight: $fw-extrabold;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.65);
  }

  .stat-tag {
    font-size: $fs-2xs;
    font-weight: $fw-extrabold;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: $alfii-sage;
  }
}

// Un segmento por bloque. Contar cuadritos se lee mas rapido que interpretar un
// porcentaje, y deja ver de un vistazo cuantos faltan.
.pips {
  @include row(4px, center);

  .pip {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background-color: rgba($alfii-cream, 0.12);
    transition: background-color $dur-base $ease-out, box-shadow $dur-base $ease-out;

    &.done {
      background-color: rgba($alfii-red, 0.75);
    }

    &.current {
      background-color: $alfii-red;
      box-shadow: 0 0 10px rgba($alfii-red, 0.75);
      animation: pipPulse 1.8s $ease-in-out infinite;
    }
  }
}

@keyframes pipPulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}

// --- cuerpo ---
.mission-body {
  flex: 1;
  min-height: 0;
  @include scroll-y;
  @include stack(6px);
  padding: 18px 20px 14px;
}

// Verde salvia, el color con el que ya se marca lo que el sistema sabe. Se lee
// como una anotacion de Alfii, no como otra frase mas de la interfaz.
.mission-recall {
  @include row(7px, flex-start);
  margin-bottom: 4px;
  padding: 8px 11px;
  border-radius: 11px;
  font-size: $fs-xs;
  line-height: $lh-snug;
  color: rgba($alfii-sage, 0.95);
  background-color: rgba($alfii-sage, 0.1);
  border-left: 2px solid rgba($alfii-sage, 0.55);
  // Entrada a cargo de GSAP (timeline de mision).
}

.mission-title {
  font-size: $fs-xl;
  font-weight: $fw-extrabold;
  line-height: $lh-tight;
  color: $alfii-cream;
  // Entrada a cargo de GSAP.
}

.mission-ask {
  font-size: $fs-sm;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.68);
  // Entrada a cargo de GSAP.
}

.mission-options {
  @include stack(9px);
  padding-top: 10px;
}

.mission-option {
  @include row(12px, center);
  width: 100%;
  text-align: left;
  padding: 14px 16px;
  border-radius: 16px;
  background-color: rgba($alfii-navy, 0.7);
  border: 1px solid rgba($alfii-cream, 0.13);
  // Entrada a cargo de GSAP.
  transition: border-color $dur-fast $ease-out, background-color $dur-fast $ease-out,
    transform $dur-fast $ease-spring, box-shadow $dur-fast $ease-out, opacity $dur-fast $ease-out;

  .opt-body {
    @include stack(3px, flex-start);
    flex: 1;
    min-width: 0;
  }

  strong {
    font-size: $fs-md;
    font-weight: $fw-bold;
    color: $alfii-cream;
  }

  em {
    font-style: normal;
    font-size: $fs-xs;
    line-height: $lh-snug;
    color: rgba($alfii-cream, 0.55);
  }

  &:hover:not(:disabled),
  &:active:not(:disabled) {
    border-color: rgba($alfii-red, 0.6);
    background-color: rgba($alfii-red, 0.1);
    transform: translateX(3px);
  }

  // La elegida se enciende; las demas se apagan. Sin el contraste la
  // confirmacion se pierde entre cinco tarjetas iguales.
  &.picked {
    border-color: $alfii-red;
    background-color: rgba($alfii-red, 0.22);
    box-shadow: 0 0 26px rgba($alfii-red, 0.45);
    transform: scale(1.015);
  }

  // El apagado de las no elegidas lo hace GSAP en la secuencia de confirmacion.
  &:disabled:not(.picked) { opacity: 0.5; }
}

// --- pie ---
.mission-foot {
  flex: 0 0 auto;
  @include stack(10px);
  padding: 12px 20px 14px;
  border-top: 1px solid rgba($alfii-cream, 0.07);
  background-color: rgba($alfii-navy, 0.45);
}

.foot-actions {
  @include row(8px, center, space-between);
}

.ghost-btn {
  @include row(6px, center, center);
  flex: 1;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: $fs-xs;
  font-weight: $fw-semibold;
  color: rgba($alfii-cream, 0.8);
  border: 1px solid rgba($alfii-cream, 0.12);
  transition: border-color $dur-fast $ease-out, color $dur-fast $ease-out;

  &:hover:not(:disabled) {
    border-color: rgba($alfii-cream, 0.3);
    color: $alfii-cream;
  }

  &:disabled { opacity: 0.4; }
}

// Lo que se gana por contestar. Es la razon por la que el usuario sigue: sin
// esto el bloque es un formulario mas.
.reward {
  @include row(6px, center, center);
  font-size: $fs-2xs;
  font-weight: $fw-semibold;
  color: rgba($alfii-cream, 0.5);

  strong {
    font-weight: $fw-extrabold;
    color: $alfii-sage;
  }
}
</style>
