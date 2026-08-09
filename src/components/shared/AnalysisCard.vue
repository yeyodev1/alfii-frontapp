<script setup lang="ts">
import BaseIcon from '@/components/shared/BaseIcon.vue';
import MeterBar from '@/components/shared/MeterBar.vue';
import RiskBadge from '@/components/shared/RiskBadge.vue';
import { ref, computed } from 'vue';

const props = withDefaults(
  defineProps<{
    analysis: any; // AnalysisPayload
    interactive?: boolean;
    /**
     * En el hilo del chat la tarjeta completa son seis bloques seguidos: ocupa
     * pantallas enteras y entierra la conversacion. Con esto entra plegada como
     * un resumen de una mirada y el usuario decide cuando abrirla.
     */
    collapsible?: boolean;
  }>(),
  { interactive: false, collapsible: false }
);

const copiedIndex = ref<number | null>(null);
const expanded = ref(false);

/** Plegada solo si se pidio plegable y el usuario no la ha abierto. */
const showFull = computed(() => !props.collapsible || expanded.value);

/** El primer script es el que el usuario copia el 90% de las veces. */
const topScript = computed(() => props.analysis?.scripts?.[0] ?? null);

const flagCount = computed(() => props.analysis?.riskRadar?.flags?.length ?? 0);

const meterList = computed(() => [
  { label: 'Beso', value: Number(props.analysis?.meters?.kiss ?? 0) },
  { label: 'Cita', value: Number(props.analysis?.meters?.firstDate ?? 0) },
  { label: 'Noche', value: Number(props.analysis?.meters?.firstNight ?? 0) },
]);

function copyScript(text: string, index: number) {
  navigator.clipboard.writeText(text);
  copiedIndex.value = index;
  setTimeout(() => {
    copiedIndex.value = null;
  }, 2000);
}
</script>

<template>
  <div class="analysis-card" :class="{ 'is-digest': collapsible && !expanded }">
    <div class="lead-banner" v-if="analysis.lead">
      <p>{{ analysis.lead }}</p>
    </div>

    <!--
      Resumen plegado: lo minimo para decidir el siguiente movimiento sin abrir
      nada. Arquetipo, riesgo, cuanto esperar y el script que se va a copiar.
    -->
    <div v-if="collapsible && !expanded" class="digest">
      <div class="digest-pills">
        <span class="pill pill-arq">
          <BaseIcon name="archetype" color="cream" size="xs" />
          {{ analysis.archetypeDiagnosis.primary }}
        </span>
        <RiskBadge :level="analysis.riskRadar.level" />
        <span class="pill pill-wait">
          <BaseIcon name="timing" color="sage" size="xs" />
          {{ analysis.timing.waitMinutes }} min
        </span>
        <span v-if="flagCount" class="pill pill-flag">
          <BaseIcon name="risk" color="red" size="xs" />
          {{ flagCount }} red flag{{ flagCount > 1 ? 's' : '' }}
        </span>
      </div>

      <div v-if="topScript" class="digest-script">
        <div class="digest-script-head">
          <span class="style-badge" :class="`style-${topScript.style.toLowerCase()}`">
            {{ topScript.style }}
          </span>
          <button class="copy-btn" @click="copyScript(topScript.text, 0)">
            <BaseIcon
              :name="copiedIndex === 0 ? 'check' : 'copy'"
              size="xs"
              :color="copiedIndex === 0 ? 'sage' : 'muted'"
            />
            <span>{{ copiedIndex === 0 ? 'Copiado' : 'Copiar' }}</span>
          </button>
        </div>
        <p class="script-text">"{{ topScript.text }}"</p>
      </div>

      <div class="digest-meters">
        <div v-for="m in meterList" :key="m.label" class="mini-meter">
          <span class="mini-label">{{ m.label }}</span>
          <div class="mini-track">
            <div class="mini-fill" :style="{ width: `${m.value}%` }"></div>
          </div>
          <span class="mini-val">{{ m.value }}</span>
        </div>
      </div>
    </div>

    <template v-if="showFull">
    <!-- Bloque 1: Subtexto -->
    <section class="block-section">
      <div class="block-header">
        <BaseIcon name="subtext" color="cream" size="sm" />
        <h4>1. Análisis del Subtexto</h4>
      </div>
      <p class="subtext-reading">{{ analysis.subtext.reading }}</p>
      <div class="meta-row">
        <span class="meta-tag">
          <strong>Marco:</strong> {{ analysis.subtext.frameDetected }}
        </span>
        <span v-if="analysis.subtext.shitTestDetected" class="meta-tag tag-warning">
          <strong>Shit test:</strong> {{ analysis.subtext.shitTestType || 'Detectado' }}
        </span>
      </div>
    </section>

    <!-- Bloque 2: Arquetipo -->
    <section class="block-section">
      <div class="block-header">
        <BaseIcon name="archetype" color="cream" size="sm" />
        <h4>2. Diagnóstico de Arquetipo</h4>
      </div>
      <div class="archetype-box">
        <div class="archetype-title">
          <span class="main-arq">{{ analysis.archetypeDiagnosis.primary }}</span>
          <span class="confidence">{{ Math.round(Number(analysis.archetypeDiagnosis?.confidence ?? 0) * 100) }}% confianza</span>
        </div>
        <p class="reasoning">{{ analysis.archetypeDiagnosis.reasoning }}</p>
      </div>
    </section>

    <!-- Bloque 3: Radar de Riesgo -->
    <section class="block-section">
      <div class="block-header">
        <BaseIcon name="risk" color="red" size="sm" />
        <h4>3. Radar de Red Flags</h4>
        <RiskBadge :level="analysis.riskRadar.level" />
      </div>

      <div v-if="analysis.riskRadar.userPostureCorrection" class="posture-warning">
        <BaseIcon name="hand" color="red" size="xs" />
        <p><strong>Corrección de marco:</strong> {{ analysis.riskRadar.userPostureCorrection }}</p>
      </div>

      <div v-if="analysis.riskRadar.flags?.length" class="flags-list">
        <div v-for="flag in analysis.riskRadar.flags" :key="flag.code" class="flag-item">
          <span class="code">{{ flag.code }}</span>
          <span class="desc">{{ flag.description }}</span>
        </div>
      </div>
    </section>

    <!-- Bloque 4: Timing -->
    <section class="block-section">
      <div class="block-header">
        <BaseIcon name="timing" color="sage" size="sm" />
        <h4>4. Estrategia de Tiempo</h4>
      </div>
      <div class="timing-box">
        <div class="wait-time">
          <span>Esperar</span>
          <strong class="time">{{ analysis.timing.waitMinutes }} min</strong>
        </div>
        <p class="rationale">{{ analysis.timing.rationale }}</p>
      </div>
    </section>

    <!-- Bloque 5: Scripts -->
    <section class="block-section">
      <div class="block-header">
        <BaseIcon name="scripts" color="cream" size="sm" />
        <h4>5. Scripts de Alto Valor</h4>
      </div>
      <div class="scripts-list">
        <div
          v-for="(script, idx) in analysis.scripts"
          :key="script.style"
          class="script-card"
        >
          <div class="script-header">
            <span class="style-badge" :class="`style-${script.style.toLowerCase()}`">
              {{ script.style }}
            </span>
            <button
              class="copy-btn"
              @click="copyScript(script.text, Number(idx))"
            >
              <BaseIcon :name="copiedIndex === Number(idx) ? 'check' : 'copy'" size="xs" :color="copiedIndex === Number(idx) ? 'sage' : 'muted'" />
              <span>{{ copiedIndex === Number(idx) ? 'Copiado' : 'Copiar' }}</span>
            </button>
          </div>
          <p class="script-text">"{{ script.text }}"</p>
          <p class="script-why">{{ script.rationale }}</p>
        </div>
      </div>
    </section>

    <!-- Bloque 6: Medidores -->
    <section class="block-section">
      <div class="block-header">
        <BaseIcon name="meters" color="sage" size="sm" />
        <h4>6. Medidor de Progreso</h4>
      </div>
      <div class="meters-flex">
        <MeterBar label="Primer beso" :value="analysis.meters.kiss" icon="kiss" />
        <MeterBar label="Primera cita" :value="analysis.meters.firstDate" icon="firstDate" />
        <MeterBar label="Primera noche" :value="analysis.meters.firstNight" icon="firstNight" />
      </div>
    </section>
    </template>

    <button v-if="collapsible" class="toggle-full" @click="expanded = !expanded">
      <span>{{ expanded ? 'Ver menos' : 'Ver análisis completo' }}</span>
      <BaseIcon :name="expanded ? 'back' : 'expand'" size="xs" color="cream" />
    </button>
  </div>
</template>

<style lang="scss" scoped>
.analysis-card {
  @include stack(16px);
  width: 100%;

  // Plegada respira menos: es una tarjeta del hilo, no una pantalla.
  &.is-digest {
    @include stack(10px);
  }
}

// --- resumen plegado ---
.digest {
  @include stack(10px);
  @include card-surface;
  padding: 13px 14px;
  animation: fadeInUp $dur-base $ease-out both;
}

.digest-pills {
  @include row(6px, center, flex-start);
  flex-wrap: wrap;

  .pill {
    @include row(5px, center);
    padding: 5px 9px;
    border-radius: 20px;
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    color: $alfii-cream;
    background-color: rgba($alfii-navy, 0.55);
    border: 1px solid rgba($alfii-cream, 0.1);

    &.pill-wait { color: $alfii-sage; }
    &.pill-flag {
      background-color: rgba($alfii-red, 0.16);
      border-color: rgba($alfii-red, 0.35);
    }
  }
}

.digest-script {
  @include stack(7px);
  padding: 11px 12px;
  border-radius: 12px;
  background-color: rgba($alfii-navy, 0.5);
  border: 1px solid rgba($alfii-cream, 0.07);
  border-left: 2px solid rgba($alfii-red, 0.55);

  .digest-script-head {
    @include row(8px, center, space-between);
  }

  .style-badge {
    font-size: $fs-2xs;
    font-weight: $fw-extrabold;
    padding: 2px 8px;
    border-radius: 4px;
    text-transform: uppercase;

    &.style-poder { background-color: rgba($alfii-red, 0.2); color: $alfii-cream; }
    &.style-caballero { background-color: rgba($alfii-cream, 0.15); color: $alfii-cream; }
    &.style-picaro { background-color: rgba($alfii-sage, 0.2); color: $alfii-sage; }
  }

  .copy-btn {
    @include row(4px, center);
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.6);
    padding: 4px 8px;
    border-radius: 6px;
    transition: background-color $dur-fast $ease-out;

    &:hover { background-color: rgba($alfii-cream, 0.08); }
  }

  .script-text {
    font-size: $fs-sm;
    font-weight: $fw-semibold;
    line-height: $lh-snug;
    color: $alfii-cream;
  }
}

// Tres barras finas en fila: el progreso de un vistazo sin tres bloques.
.digest-meters {
  @include row(10px, center);

  .mini-meter {
    @include row(6px, center);
    flex: 1;
    min-width: 0;
  }

  .mini-label {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.5);
    white-space: nowrap;
  }

  .mini-track {
    flex: 1;
    min-width: 18px;
    height: 4px;
    border-radius: 2px;
    background-color: rgba($alfii-cream, 0.1);
    overflow: hidden;
  }

  .mini-fill {
    height: 100%;
    border-radius: 2px;
    background-color: $alfii-sage;
    transition: width $dur-slow $ease-out;
  }

  .mini-val {
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    color: rgba($alfii-cream, 0.75);
  }
}

.toggle-full {
  @include row(7px, center, center);
  align-self: center;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: $fs-2xs;
  font-weight: $fw-bold;
  color: $alfii-cream;
  background-color: rgba($alfii-plum, 0.85);
  border: 1px solid rgba($alfii-cream, 0.14);
  transition: border-color $dur-fast $ease-out, background-color $dur-fast $ease-out;

  &:hover {
    border-color: rgba($alfii-red, 0.5);
    background-color: rgba($alfii-plum, 1);
  }
}

.lead-banner {
  padding: 14px 16px;
  background-color: rgba($alfii-plum, 0.9);
  border-left: 3px solid $alfii-red;
  border-radius: 12px;
  font-size: $fs-sm;
  font-weight: $fw-semibold;
  color: $alfii-cream;
  line-height: $lh-relaxed;
}

// Al desplegar entran escalonados: seis bloques apareciendo de golpe se leen
// como un salto, escalonados se leen como que algo se esta abriendo.
.block-section {
  @include card-surface;
  @include stack(12px);
  animation: fadeInUp $dur-base $ease-out both;

  @for $i from 1 through 6 {
    &:nth-of-type(#{$i}) { animation-delay: #{($i - 1) * 45}ms; }
  }
}

.block-header {
  @include row(8px);
  border-bottom: 1px solid rgba($alfii-cream, 0.06);
  padding-bottom: 8px;

  h4 {
    font-size: $fs-sm;
    font-weight: $fw-bold;
    color: $alfii-cream;
    flex: 1;
  }
}

.subtext-reading {
  font-size: $fs-sm;
  color: rgba($alfii-cream, 0.9);
  line-height: $lh-relaxed;
}

.meta-row {
  @include row(8px, center, flex-start);
  flex-wrap: wrap;

  .meta-tag {
    font-size: $fs-2xs;
    padding: 4px 8px;
    background-color: rgba($alfii-navy, 0.5);
    border-radius: 6px;
    color: rgba($alfii-cream, 0.8);

    &.tag-warning {
      background-color: rgba($alfii-red, 0.15);
      color: $alfii-cream;
    }
  }
}

.archetype-box {
  @include stack(8px);

  .archetype-title {
    @include row(10px, center, space-between);

    .main-arq {
      font-size: $fs-md;
      font-weight: $fw-extrabold;
      color: $alfii-cream;
      letter-spacing: 0.02em;
    }

    .confidence {
      font-size: $fs-2xs;
      color: $alfii-sage;
      font-weight: $fw-semibold;
    }
  }

  .reasoning {
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.75);
    line-height: $lh-relaxed;
  }
}

.posture-warning {
  @include row(8px, flex-start);
  padding: 10px 12px;
  background-color: rgba($alfii-red, 0.15);
  border-radius: 8px;
  font-size: $fs-xs;
  color: $alfii-cream;
}

.flags-list {
  @include stack(6px);

  .flag-item {
    @include row(8px);
    font-size: $fs-xs;
    padding: 6px 10px;
    background-color: rgba($alfii-navy, 0.4);
    border-radius: 6px;

    .code {
      font-weight: $fw-bold;
      color: $alfii-red;
      font-size: $fs-2xs;
    }

    .desc {
      color: rgba($alfii-cream, 0.8);
    }
  }
}

.timing-box {
  @include row(12px, center);

  .wait-time {
    @include stack(2px, center);
    padding: 10px 14px;
    background-color: rgba($alfii-sage, 0.12);
    border-radius: 10px;
    min-width: 90px;

    span {
      font-size: $fs-2xs;
      color: $alfii-sage;
      text-transform: uppercase;
      font-weight: $fw-bold;
    }

    .time {
      font-size: $fs-md;
      font-weight: $fw-extrabold;
      color: $alfii-cream;
    }
  }

  .rationale {
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.8);
    line-height: $lh-relaxed;
    flex: 1;
  }
}

.scripts-list {
  @include stack(10px);
}

.script-card {
  padding: 12px;
  background-color: rgba($alfii-navy, 0.5);
  border-radius: 10px;
  border: 1px solid rgba($alfii-cream, 0.06);
  @include stack(8px);

  .script-header {
    @include row(8px, center, space-between);

    .style-badge {
      font-size: $fs-2xs;
      font-weight: $fw-extrabold;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;

      &.style-poder { background-color: rgba($alfii-red, 0.2); color: $alfii-cream; }
      &.style-caballero { background-color: rgba($alfii-cream, 0.15); color: $alfii-cream; }
      &.style-picaro { background-color: rgba($alfii-sage, 0.2); color: $alfii-sage; }
    }

    .copy-btn {
      @include row(4px);
      font-size: $fs-2xs;
      color: rgba($alfii-cream, 0.6);
      padding: 4px 8px;
      border-radius: 6px;

      &:hover { background-color: rgba($alfii-cream, 0.08); }
    }
  }

  .script-text {
    font-size: $fs-sm;
    font-weight: $fw-semibold;
    color: $alfii-cream;
  }

  .script-why {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.6);
  }
}

.meters-flex {
  @include stack(10px);
}
</style>
