<script setup lang="ts">
/**
 * /correos?u=<id>&t=<token>: gestion de correos desde el enlace del pie del
 * correo. No exige sesion: el token HMAC del enlace autoriza SOLO cambiar las
 * preferencias de correo de esa cuenta, nada mas.
 */
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import AlfiiLogo from '@/components/shared/AlfiiLogo.vue';
import api from '@/services/http';

const route = useRoute();
const u = computed(() => String(route.query.u ?? ''));
const t = computed(() => String(route.query.t ?? ''));

const loading = ref(true);
const error = ref('');
const email = ref('');
const prefs = ref({ reengagement: true, achievements: true });
const saving = ref<string | null>(null);
const savedFlash = ref(false);

const allOff = computed(() => !prefs.value.reengagement && !prefs.value.achievements);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res: any = await api.get(`/email/prefs?u=${encodeURIComponent(u.value)}&t=${encodeURIComponent(t.value)}`);
    email.value = res.email;
    prefs.value = res.emailPrefs;
  } catch (err: any) {
    error.value = err.message || 'Enlace inválido o caducado.';
  } finally {
    loading.value = false;
  }
}

async function save(patch: { reengagement?: boolean; achievements?: boolean; all?: boolean }, key: string) {
  saving.value = key;
  try {
    const res: any = await api.post('/email/prefs', { u: u.value, t: t.value, ...patch });
    prefs.value = res.emailPrefs;
    savedFlash.value = true;
    setTimeout(() => (savedFlash.value = false), 1600);
  } catch (err: any) {
    error.value = err.message || 'No pude guardar.';
  } finally {
    saving.value = null;
  }
}

onMounted(load);
</script>

<template>
  <div class="prefs-page">
    <div class="card">
      <AlfiiLogo size="sm" mode="full" />

      <div v-if="loading" class="state"><BaseIcon name="spinner" spin size="lg" color="muted" /></div>

      <div v-else-if="error" class="state">
        <BaseIcon name="risk" size="lg" color="red" />
        <h1>Ese enlace no sirve</h1>
        <p>{{ error }}</p>
        <RouterLink to="/settings" class="btn-ghost">Gestionar desde Ajustes</RouterLink>
      </div>

      <template v-else>
        <span class="eyebrow">Correos de alfii</span>
        <h1>{{ allOff ? 'Listo, no te escribimos más' : 'Elige qué correos recibir' }}</h1>
        <p class="sub">Cuenta <strong>{{ email }}</strong>. Cambia lo que quieras; se guarda al instante.</p>

        <label class="row" :class="{ on: prefs.reengagement }">
          <span class="row-text">
            <strong>Recordatorios cuando llevas días sin entrar</strong>
            <small>Máximo 3 en toda la secuencia, espaciados. Nunca mencionan a nadie.</small>
          </span>
          <input type="checkbox" :checked="prefs.reengagement" :disabled="!!saving" @change="save({ reengagement: ($event.target as HTMLInputElement).checked }, 're')" />
          <span class="switch"><BaseIcon v-if="saving === 're'" name="spinner" spin size="xs" color="cream" /></span>
        </label>

        <label class="row" :class="{ on: prefs.achievements }">
          <span class="row-text">
            <strong>Logros y subidas de categoría</strong>
            <small>Cuando tu carta sube de nivel o completas tu perfil.</small>
          </span>
          <input type="checkbox" :checked="prefs.achievements" :disabled="!!saving" @change="save({ achievements: ($event.target as HTMLInputElement).checked }, 'ach')" />
          <span class="switch"><BaseIcon v-if="saving === 'ach'" name="spinner" spin size="xs" color="cream" /></span>
        </label>

        <p class="always">
          <BaseIcon name="privacy" size="xs" color="sage" />
          Los correos de seguridad (recuperar o cambiar contraseña) siguen llegando siempre.
        </p>

        <div class="actions">
          <button v-if="!allOff" type="button" class="btn-danger" :disabled="!!saving" @click="save({ all: false }, 'all')">
            <BaseIcon name="logout" size="xs" color="red" /> Darme de baja de todo
          </button>
          <button v-else type="button" class="btn-primary" :disabled="!!saving" @click="save({ all: true }, 'all')">
            <BaseIcon name="rotate" size="xs" color="cream" /> Volver a activar todo
          </button>
          <span v-if="savedFlash" class="saved"><BaseIcon name="check" size="xs" color="sage" /> Guardado</span>
        </div>

        <div class="wa">
          <span class="wa-icon"><BaseIcon name="platform.whatsapp" size="sm" color="cream" /></span>
          <span><strong>Pronto: Alfii en WhatsApp.</strong> Mismo contexto, mismos expedientes. Apúntate desde <RouterLink to="/settings">Ajustes</RouterLink>.</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.prefs-page {
  min-height: 100dvh;
  @include center;
  padding: 24px 16px;
  background: radial-gradient(70% 50% at 50% 0%, rgba($alfii-red, 0.18), transparent 70%), $alfii-navy;
}
.card {
  @include stack(14px);
  width: min(560px, 100%);
  padding: clamp(20px, 4vw, 32px);
  border-radius: 22px;
  background-color: rgba($alfii-plum, 0.7);
  border: 1px solid rgba($alfii-cream, 0.12);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}
.state { @include stack(10px, center); padding: 30px 0; text-align: center; p { color: rgba($alfii-cream, 0.65); font-size: $fs-xs; } }
.eyebrow { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: $fw-bold; color: $alfii-red; }
h1 { font-family: var(--font-display); font-weight: 800; font-size: clamp(22px, 4vw, 30px); letter-spacing: -0.02em; line-height: $lh-tight; }
.sub { font-size: $fs-xs; color: rgba($alfii-cream, 0.7); strong { color: $alfii-cream; } }

.row {
  @include row(12px, center);
  position: relative;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba($alfii-cream, 0.12);
  background-color: rgba($alfii-navy, 0.4);
  cursor: pointer;
  transition: border-color $dur-fast $ease-out;
  &.on { border-color: rgba($alfii-sage, 0.6); }
  input { position: absolute; opacity: 0; pointer-events: none; }
  .row-text { @include stack(3px); flex: 1; strong { font-size: $fs-sm; } small { font-size: $fs-2xs; color: rgba($alfii-cream, 0.55); line-height: $lh-relaxed; } }
  .switch {
    @include center; flex-shrink: 0; width: 46px; height: 26px; border-radius: 999px;
    background-color: rgba($alfii-cream, 0.15); transition: background-color $dur-fast $ease-out; position: relative;
    &::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background-color: $alfii-cream; transition: transform $dur-base $ease-spring; }
  }
  &.on .switch { background-color: $alfii-sage; &::after { transform: translateX(20px); } }
}
.always { @include row(8px, flex-start); font-size: $fs-2xs; color: rgba($alfii-cream, 0.55); line-height: $lh-relaxed; }
.actions { @include row(12px, center); flex-wrap: wrap; .saved { @include row(5px); font-size: $fs-2xs; color: $alfii-sage; font-weight: $fw-semibold; } }
.btn-danger { @include row(6px); padding: 10px 14px; border-radius: 12px; font-size: $fs-xs; font-weight: $fw-semibold; color: #ff8095; border: 1px solid rgba($alfii-red, 0.45); background-color: rgba($alfii-red, 0.1); }
.btn-primary { @include row(6px); padding: 10px 16px; border-radius: 12px; font-size: $fs-xs; font-weight: $fw-bold; color: $alfii-cream; background-color: $alfii-red; }
.btn-ghost { padding: 10px 16px; border-radius: 12px; font-size: $fs-xs; font-weight: $fw-semibold; border: 1px solid rgba($alfii-cream, 0.2); }
.wa { @include row(10px, flex-start); margin-top: 6px; padding: 12px 14px; border-radius: 14px; background-color: rgba(#25d366, 0.1); border: 1px solid rgba(#25d366, 0.35); font-size: $fs-2xs; line-height: $lh-relaxed; color: rgba($alfii-cream, 0.8); a { color: $alfii-cream; text-decoration: underline; } .wa-icon { @include center; flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; background-color: rgba(#25d366, 0.35); } }
</style>
