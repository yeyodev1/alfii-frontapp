<script setup lang="ts">
import BaseIcon from '@/components/shared/BaseIcon.vue';
import { ref, onMounted } from 'vue';
import api from '@/services/http';

const legalData = ref<any | null>(null);
const loading = ref(true);
const activeTab = ref<'summary' | 'disclaimer' | 'terms' | 'privacy'>('summary');
const activeRegion = ref<'latam' | 'us' | 'eu'>('latam');

onMounted(async () => {
  try {
    const res: any = await api.get('/legal/current');
    legalData.value = res;
    if (res.detectedRegion) activeRegion.value = res.detectedRegion;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="legal-view-light">
    <header class="legal-header">
      <RouterLink to="/" class="back-link">
        <BaseIcon name="back" size="sm" color="plum" />
        <span>Volver a alfii</span>
      </RouterLink>
      <h1 class="page-title">Aviso Legal, Términos y Privacidad</h1>
      <p class="operator-tag" v-if="legalData">
        Operado por {{ legalData.operator }} · Versión {{ legalData.version }}
      </p>
    </header>

    <div v-if="loading" class="loading-state">
      <BaseIcon name="spinner" spin color="plum" size="xl" />
      <p>Cargando documentos legales...</p>
    </div>

    <div v-else-if="legalData" class="legal-container">
      <!-- Navegación por pestañas -->
      <nav class="legal-tabs">
        <button
          :class="{ active: activeTab === 'summary' }"
          @click="activeTab = 'summary'"
        >
          Resumen
        </button>
        <button
          :class="{ active: activeTab === 'disclaimer' }"
          @click="activeTab = 'disclaimer'"
        >
          Descargo
        </button>
        <button
          :class="{ active: activeTab === 'terms' }"
          @click="activeTab = 'terms'"
        >
          Términos
        </button>
        <button
          :class="{ active: activeTab === 'privacy' }"
          @click="activeTab = 'privacy'"
        >
          Privacidad
        </button>
      </nav>

      <!-- Selector de región -->
      <div class="region-selector">
        <span>Anexo por región:</span>
        <button
          :class="{ active: activeRegion === 'latam' }"
          @click="activeRegion = 'latam'"
        >
          <BaseIcon name="earthAmericas" size="xs" color="plum" />
          LATAM
        </button>
        <button
          :class="{ active: activeRegion === 'us' }"
          @click="activeRegion = 'us'"
        >
          <BaseIcon name="flagUsa" size="xs" color="plum" />
          EE.UU.
        </button>
        <button
          :class="{ active: activeRegion === 'eu' }"
          @click="activeRegion = 'eu'"
        >
          <BaseIcon name="earthEurope" size="xs" color="plum" />
          Europa (RGPD)
        </button>
      </div>

      <!-- Contenido: Resumen en 30 segundos -->
      <main class="legal-body">
        <div v-if="activeTab === 'summary'" class="summary-section">
          <h2>{{ legalData.plainSummary.title }}</h2>
          <div class="summary-flex">
            <div
              v-for="(point, i) in legalData.plainSummary.points"
              :key="i"
              class="summary-card"
            >
              <BaseIcon :name="(point.icon as any)" color="red" size="base" />
              <p>{{ point.text }}</p>
            </div>
          </div>
        </div>

        <!-- Contenido: Descargo -->
        <div v-if="activeTab === 'disclaimer'" class="doc-section">
          <h2>{{ legalData.documents.disclaimer.title }}</h2>
          <div
            v-for="sec in legalData.documents.disclaimer.sections"
            :key="sec.id"
            class="section-block"
          >
            <h3>{{ sec.title }}</h3>
            <p v-for="(p, i) in sec.body" :key="i">{{ p }}</p>
          </div>
        </div>

        <!-- Contenido: Términos -->
        <div v-if="activeTab === 'terms'" class="doc-section">
          <h2>{{ legalData.documents.terms.title }}</h2>
          <div
            v-for="sec in legalData.documents.terms.sections"
            :key="sec.id"
            class="section-block"
          >
            <h3>{{ sec.title }}</h3>
            <p v-for="(p, i) in sec.body" :key="i">{{ p }}</p>
          </div>
        </div>

        <!-- Contenido: Privacidad -->
        <div v-if="activeTab === 'privacy'" class="doc-section">
          <h2>{{ legalData.documents.privacy.title }}</h2>
          <div
            v-for="sec in legalData.documents.privacy.sections"
            :key="sec.id"
            class="section-block"
          >
            <h3>{{ sec.title }}</h3>
            <p v-for="(p, i) in sec.body" :key="i">{{ p }}</p>
          </div>
        </div>

        <!-- Anexo regional activo -->
        <div class="annex-section">
          <template v-for="annex in legalData.annexes" :key="annex.id">
            <div v-if="annex.id === activeRegion" class="annex-block">
              <div class="annex-header">
                <h3>Anexo {{ annex.label }}</h3>
                <p class="intro">{{ annex.intro }}</p>
              </div>
              <div
                v-for="sec in annex.sections"
                :key="sec.id"
                class="section-block"
              >
                <h4>{{ sec.title }}</h4>
                <p v-for="(p, i) in sec.body" :key="i">{{ p }}</p>
              </div>
            </div>
          </template>
        </div>
      </main>

      <footer class="legal-footer">
        <p>Contacto de privacidad: {{ legalData.contact.privacy }}</p>
        <p>Contacto legal: {{ legalData.contact.legal }}</p>
      </footer>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// MODO CLARO EXCLUSIVO PARA LECTURA DE DERECHO
.legal-view-light {
  background-color: $alfii-cream;
  color: $alfii-navy;
  min-height: 100dvh;
  padding: 24px clamp(16px, 4vw, 32px) 60px;
  @include stack(24px);
  width: 100%;
}

.legal-header {
  @include stack(8px);
  max-width: 800px;
  margin: 0 auto;
  width: 100%;

  .back-link {
    @include row(6px);
    font-size: $fs-xs;
    font-weight: $fw-bold;
    color: $alfii-plum;
    margin-bottom: 8px;
  }

  .page-title {
    font-size: $fs-2xl;
    font-weight: $fw-extrabold;
    color: $alfii-navy;
    line-height: $lh-tight;
  }

  .operator-tag {
    font-size: $fs-xs;
    color: rgba($alfii-navy, 0.65);
  }
}

.loading-state {
  @include stack(12px, center);
  padding: 60px 0;
  color: $alfii-plum;
}

.legal-container {
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  @include stack(20px);
}

.legal-tabs {
  @include row(8px);
  border-bottom: 2px solid rgba($alfii-navy, 0.1);
  padding-bottom: 8px;

  button {
    padding: 8px 14px;
    border-radius: 8px;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    color: rgba($alfii-navy, 0.6);

    &.active {
      background-color: $alfii-plum;
      color: $alfii-cream;
    }
  }
}

.region-selector {
  @include row(8px, center);
  font-size: $fs-xs;
  color: rgba($alfii-navy, 0.7);

  button {
    @include row(4px);
    padding: 6px 10px;
    border-radius: 6px;
    font-size: $fs-2xs;
    font-weight: $fw-semibold;
    border: 1px solid rgba($alfii-navy, 0.2);

    &.active {
      background-color: rgba($alfii-red, 0.15);
      border-color: $alfii-red;
      color: $alfii-red;
    }
  }
}

.legal-body {
  @include stack(24px);

  h2 {
    font-size: $fs-xl;
    font-weight: $fw-bold;
    color: $alfii-navy;
    margin-bottom: 12px;
  }
}

.summary-flex {
  @include stack(12px);
}

.summary-card {
  @include row(12px, flex-start);
  padding: 14px 16px;
  background-color: rgba($alfii-navy, 0.04);
  border-radius: 12px;
  border: 1px solid rgba($alfii-navy, 0.08);

  p {
    font-size: $fs-sm;
    color: $alfii-navy;
    line-height: $lh-base;
  }
}

.doc-section, .annex-section {
  @include stack(20px);
}

.section-block {
  @include stack(8px);

  h3, h4 {
    font-size: $fs-md;
    font-weight: $fw-bold;
    color: $alfii-navy;
  }

  p {
    font-size: $fs-sm;
    color: rgba($alfii-navy, 0.85);
    line-height: $lh-relaxed;
  }
}

.annex-block {
  @include stack(16px);
  padding: 20px;
  background-color: rgba($alfii-navy, 0.03);
  border-radius: 16px;
  border: 1px solid rgba($alfii-navy, 0.1);

  .annex-header {
    @include stack(4px);
    .intro {
      font-size: $fs-xs;
      color: rgba($alfii-navy, 0.65);
    }
  }
}

.legal-footer {
  padding-top: 20px;
  border-top: 1px solid rgba($alfii-navy, 0.1);
  font-size: $fs-xs;
  color: rgba($alfii-navy, 0.6);
  @include stack(4px);
}
</style>
