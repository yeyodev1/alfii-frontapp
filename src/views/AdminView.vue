<script setup lang="ts">
/**
 * Portal de administracion con sidebar propio.
 *
 * La ruta /admin es inmersiva: AppShell suelta la barra inferior y el ancho, y
 * este componente monta su propia navegacion lateral (Resumen, Usuarios,
 * Modelos, Proveedores) sin tocar el shell de la app de usuarios.
 *
 * El acceso lo decide el backend (ADMIN_EMAILS): ante 403 solo se pinta el
 * aviso. Fuente del gasto: contabilidad local por llamada (aiusages), con
 * verificacion en vivo contra las APIs de los proveedores donde existe.
 */
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import api from '@/services/http';
import { useToastStore } from '@/stores/toast';

type Section = 'resumen' | 'usuarios' | 'modelos' | 'proveedores';

interface Bucket {
  _id: string | null;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  calls: number;
}

interface AdminUserRow {
  id: string;
  email: string | null;
  preferredName: string | null;
  isAnonymous: boolean;
  plan: string;
  isVip: boolean;
  isAdmin: boolean;
  /** Admin por variable de entorno: intocable desde el portal. */
  isEnvAdmin: boolean;
  createdAt: string;
  lastActiveAt?: string;
  analysisCount: number;
  costTotal: number;
  callsTotal: number;
  lastCallAt: string | null;
  costWindow: number;
  callsWindow: number;
  tokensWindow: number;
  activeDays: number;
  callsPerActiveDay: number;
}

const router = useRouter();
const toastStore = useToastStore();

const section = ref<Section>('resumen');
const days = ref(30);
const loading = ref(true);
const forbidden = ref(false);

const overview = ref<any | null>(null);
const users = ref<AdminUserRow[]>([]);
const modelsData = ref<any | null>(null);
const providersData = ref<any | null>(null);

const selectedUser = ref<AdminUserRow | null>(null);
const detail = ref<any | null>(null);
const detailLoading = ref(false);
const vipSaving = ref<string | null>(null);
const adminSaving = ref<string | null>(null);
const modelSaving = ref<string | null>(null);

const NAV: { key: Section; label: string; icon: string }[] = [
  { key: 'resumen', label: 'Resumen', icon: 'bolt' },
  { key: 'usuarios', label: 'Usuarios', icon: 'step.PREFERRED_NAME' },
  { key: 'modelos', label: 'Modelos', icon: 'robot' },
  { key: 'proveedores', label: 'Proveedores', icon: 'earthAmericas' },
];

const TASK_LABELS: Record<string, string> = {
  analysis: 'Análisis',
  chat: 'Chat',
  vision: 'Visión (OCR)',
};

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Gemini (Google)',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
};

async function load() {
  loading.value = true;
  forbidden.value = false;
  try {
    const [ov, us, mo, pr]: any[] = await Promise.all([
      api.get(`/admin/overview?days=${days.value}`),
      api.get(`/admin/users?days=${days.value}`),
      api.get(`/admin/models?days=${days.value}`),
      api.get(`/admin/providers?days=${days.value}`),
    ]);
    overview.value = ov;
    users.value = us.users;
    modelsData.value = mo;
    providersData.value = pr;
  } catch (err: any) {
    if (err?.status === 403 || err?.details?.reason === 'admin_only') forbidden.value = true;
  } finally {
    loading.value = false;
  }
}

async function openUser(row: AdminUserRow) {
  selectedUser.value = row;
  detail.value = null;
  detailLoading.value = true;
  try {
    detail.value = await api.get(`/admin/users/${row.id}?days=${days.value}`);
  } catch {
    // Interceptor ya aviso
  } finally {
    detailLoading.value = false;
  }
}

async function toggleVip(row: AdminUserRow) {
  if (vipSaving.value) return;
  const next = !row.isVip;
  if (!confirm(next ? `¿Hacer VIP a ${userName(row)}? Tendrá acceso pro sin pagar.` : `¿Quitar VIP a ${userName(row)}?`)) {
    return;
  }
  vipSaving.value = row.id;
  try {
    await api.patch(`/admin/users/${row.id}/vip`, { isVip: next });
    row.isVip = next;
    toastStore.show(next ? 'Usuario marcado como VIP.' : 'VIP retirado.', 'success');
  } catch {
    // Interceptor ya aviso
  } finally {
    vipSaving.value = null;
  }
}

async function toggleAdmin(row: AdminUserRow) {
  if (adminSaving.value) return;
  const next = !row.isAdmin;
  if (
    !confirm(
      next
        ? `¿Dar acceso de ADMINISTRADOR a ${userName(row)}? Podrá ver todo este portal.`
        : `¿Quitar el acceso de administrador a ${userName(row)}?`
    )
  ) {
    return;
  }
  adminSaving.value = row.id;
  try {
    await api.patch(`/admin/users/${row.id}/admin`, { isAdmin: next });
    row.isAdmin = next;
    toastStore.show(next ? 'Ahora es administrador.' : 'Acceso de administrador retirado.', 'success');
  } catch {
    // Interceptor ya aviso
  } finally {
    adminSaving.value = null;
  }
}

async function pickModel(provider: string, task: string, model: string | null) {
  const key = `${provider}:${task}`;
  if (modelSaving.value) return;
  modelSaving.value = key;
  try {
    const res: any = await api.patch('/admin/models', { provider, task, model });
    if (modelsData.value) modelsData.value.active = res.active;
    toastStore.show(model ? `Modelo actualizado: ${model}` : 'Override limpiado (vuelve al env).', 'success');
  } catch {
    // Interceptor ya aviso
  } finally {
    modelSaving.value = null;
  }
}

function setDays(value: number) {
  days.value = value;
  selectedUser.value = null;
  detail.value = null;
  void load();
}

onMounted(load);

const maxDayCost = computed(() =>
  Math.max(1e-9, ...(overview.value?.byDay ?? []).map((d: Bucket) => d.costUsd))
);

function money(value: number | undefined | null): string {
  const v = value ?? 0;
  if (v === 0) return '$0';
  if (v < 0.01) return `$${v.toFixed(4)}`;
  return `$${v.toFixed(2)}`;
}

function compact(value: number | undefined | null): string {
  const v = value ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
}

function userName(row: { email: string | null; preferredName: string | null; isAnonymous: boolean }): string {
  return row.email || row.preferredName || (row.isAnonymous ? 'Anónimo' : 'Sin nombre');
}

function shortDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toISOString().slice(0, 10);
}

/** Modelos elegibles del catálogo para un proveedor+tarea. */
function eligibleModels(provider: string, task: string): any[] {
  return (modelsData.value?.catalog?.[provider] ?? []).filter((m: any) => m.tasks.includes(task));
}
</script>

<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside class="admin-sidebar">
      <button class="side-back" type="button" @click="router.push('/vault')">
        <BaseIcon name="back" size="xs" color="muted" />
        <span>Volver a la app</span>
      </button>

      <h1 class="side-title">Administración</h1>

      <nav class="side-nav">
        <button
          v-for="item in NAV"
          :key="item.key"
          type="button"
          :class="{ on: section === item.key }"
          @click="section = item.key"
        >
          <BaseIcon :name="(item.icon as any)" size="sm" :color="section === item.key ? 'red' : 'muted'" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="range-tabs">
        <button
          v-for="d in [7, 30, 90]"
          :key="d"
          type="button"
          :class="{ on: days === d }"
          @click="setDays(d)"
        >
          {{ d }}d
        </button>
      </div>
    </aside>

    <!-- Contenido -->
    <main class="admin-main">
      <div v-if="loading" class="state-block">
        <BaseIcon name="spinner" spin size="lg" color="cream" />
      </div>

      <div v-else-if="forbidden" class="state-block">
        <BaseIcon name="privacy" size="2xl" color="muted" />
        <h3>Solo administradores</h3>
        <p>
          Tu cuenta no está en la lista. Agrega tu correo a <code>ADMIN_EMAILS</code> en el
          backend e inicia sesión con esa cuenta (no anónima).
        </p>
      </div>

      <!-- ============ RESUMEN ============ -->
      <template v-else-if="section === 'resumen' && overview">
        <div class="cards-row">
          <div class="stat-card">
            <span class="stat-label">Gasto {{ days }} días</span>
            <strong class="stat-value">{{ money(overview.totals.window.costUsd) }}</strong>
            <span class="stat-sub">{{ compact(overview.totals.window.calls) }} llamadas</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Gasto histórico</span>
            <strong class="stat-value">{{ money(overview.totals.allTime.costUsd) }}</strong>
            <span class="stat-sub">{{ compact(overview.totals.allTime.calls) }} llamadas</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Tokens {{ days }}d</span>
            <strong class="stat-value">
              {{ compact(overview.totals.window.inputTokens + overview.totals.window.outputTokens) }}
            </strong>
            <span class="stat-sub">
              {{ compact(overview.totals.window.inputTokens) }} in ·
              {{ compact(overview.totals.window.outputTokens) }} out
            </span>
          </div>
          <div class="stat-card">
            <span class="stat-label">Usuarios activos</span>
            <strong class="stat-value">{{ overview.activeUsers }}</strong>
            <span class="stat-sub">de {{ overview.totalUsers }} totales</span>
          </div>
        </div>

        <section class="panel">
          <h2>Gasto por día</h2>
          <div v-if="overview.byDay.length" class="day-bars">
            <div v-for="d in overview.byDay" :key="d._id" class="day-row">
              <span class="day-label">{{ d._id.slice(5) }}</span>
              <div class="day-track">
                <div class="day-fill" :style="{ width: `${(d.costUsd / maxDayCost) * 100}%` }"></div>
              </div>
              <span class="day-cost">{{ money(d.costUsd) }}</span>
            </div>
          </div>
          <p v-else class="empty">Sin consumo registrado en este periodo.</p>
        </section>

        <div class="split">
          <section class="panel">
            <h2>Por proveedor</h2>
            <table class="data-table">
              <thead><tr><th>Proveedor</th><th>Gasto</th><th>Llamadas</th><th>Tokens</th></tr></thead>
              <tbody>
                <tr v-for="p in overview.byProvider" :key="p._id">
                  <td class="mono">{{ p._id }}</td>
                  <td>{{ money(p.costUsd) }}</td>
                  <td>{{ compact(p.calls) }}</td>
                  <td>{{ compact(p.inputTokens + p.outputTokens) }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="panel">
            <h2>Por modelo</h2>
            <table class="data-table">
              <thead><tr><th>Modelo</th><th>Gasto</th><th>Llamadas</th></tr></thead>
              <tbody>
                <tr v-for="m in overview.byModel" :key="m._id">
                  <td class="mono">{{ m._id }}</td>
                  <td>{{ money(m.costUsd) }}</td>
                  <td>{{ compact(m.calls) }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="panel">
            <h2>Por tarea</h2>
            <table class="data-table">
              <thead><tr><th>Tarea</th><th>Gasto</th><th>Llamadas</th></tr></thead>
              <tbody>
                <tr v-for="t in overview.byTask" :key="t._id">
                  <td>{{ TASK_LABELS[t._id] ?? t._id }}</td>
                  <td>{{ money(t.costUsd) }}</td>
                  <td>{{ compact(t.calls) }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </template>

      <!-- ============ USUARIOS ============ -->
      <template v-else-if="section === 'usuarios'">
        <section class="panel">
          <h2>Usuarios <span class="hint">(toca uno para el detalle)</span></h2>
          <div class="table-scroll">
            <table class="data-table clickable">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Gasto {{ days }}d</th>
                  <th>Total</th>
                  <th>Llamadas {{ days }}d</th>
                  <th>Frecuencia</th>
                  <th>Última IA</th>
                  <th>VIP</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="u in users"
                  :key="u.id"
                  :class="{ on: selectedUser?.id === u.id }"
                  @click="openUser(u)"
                >
                  <td class="user-cell">
                    <span class="u-name">
                      {{ userName(u) }}
                      <em v-if="u.isVip" class="vip-badge">VIP</em>
                      <em v-if="u.isAdmin" class="admin-badge">ADMIN</em>
                    </span>
                    <span class="u-meta">{{ u.isAnonymous ? 'anónimo' : u.plan }} · alta {{ shortDate(u.createdAt) }}</span>
                  </td>
                  <td>{{ money(u.costWindow) }}</td>
                  <td>{{ money(u.costTotal) }}</td>
                  <td>{{ u.callsWindow }}</td>
                  <td>
                    <template v-if="u.activeDays">
                      {{ u.activeDays }} día(s) · {{ u.callsPerActiveDay }}/día
                    </template>
                    <template v-else>—</template>
                  </td>
                  <td>{{ shortDate(u.lastCallAt) }}</td>
                  <td>
                    <button
                      v-if="!u.isAnonymous"
                      type="button"
                      class="vip-btn"
                      :class="{ active: u.isVip }"
                      :disabled="vipSaving === u.id"
                      @click.stop="toggleVip(u)"
                    >
                      <BaseIcon v-if="vipSaving === u.id" name="spinner" spin size="xs" color="cream" />
                      <span v-else>{{ u.isVip ? 'Quitar' : 'Hacer VIP' }}</span>
                    </button>
                    <span v-else class="empty">—</span>
                  </td>
                  <td>
                    <!-- Los admin por env son intocables desde aqui: son el respaldo -->
                    <span v-if="u.isEnvAdmin" class="empty" title="Definido en ADMIN_EMAILS (env)">env</span>
                    <button
                      v-else-if="!u.isAnonymous"
                      type="button"
                      class="vip-btn"
                      :class="{ active: u.isAdmin }"
                      :disabled="adminSaving === u.id"
                      @click.stop="toggleAdmin(u)"
                    >
                      <BaseIcon v-if="adminSaving === u.id" name="spinner" spin size="xs" color="cream" />
                      <span v-else>{{ u.isAdmin ? 'Quitar' : 'Hacer admin' }}</span>
                    </button>
                    <span v-else class="empty">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="selectedUser" class="user-detail">
            <h3>
              <BaseIcon name="step.PREFERRED_NAME" size="xs" color="sage" />
              {{ userName(selectedUser) }}
              <em v-if="selectedUser.isVip" class="vip-badge">VIP</em>
            </h3>

            <div v-if="detailLoading" class="state-inline">
              <BaseIcon name="spinner" spin size="sm" color="cream" />
            </div>

            <template v-else-if="detail">
              <div class="detail-tasks">
                <span v-for="t in detail.byTask" :key="t._id" class="task-chip">
                  {{ TASK_LABELS[t._id] ?? t._id }}: <strong>{{ money(t.costUsd) }}</strong> ({{ t.calls }})
                </span>
                <span v-if="!detail.byTask.length" class="empty">Sin consumo en {{ days }}d.</span>
              </div>

              <div class="table-scroll">
                <table class="data-table">
                  <thead>
                    <tr><th>Fecha</th><th>Tarea</th><th>Modelo</th><th>Tokens</th><th>Costo</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="(r, i) in detail.recent" :key="i">
                      <td>{{ new Date(r.createdAt).toISOString().slice(0, 16).replace('T', ' ') }}</td>
                      <td>{{ TASK_LABELS[r.task] ?? r.task }}</td>
                      <td class="mono">{{ r.aiModel }}{{ r.estimated ? ' ~' : '' }}</td>
                      <td>{{ compact(r.inputTokens + r.outputTokens) }}</td>
                      <td>{{ money(r.costUsd) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="foot-note">~ = tokens estimados (streaming no los reporta exactos).</p>
            </template>
          </div>
        </section>
      </template>

      <!-- ============ MODELOS ============ -->
      <template v-else-if="section === 'modelos' && modelsData">
        <section class="panel">
          <h2>Modelos por tarea</h2>
          <p class="panel-note">
            El modelo elegido aplica al instante en todas las llamadas nuevas (sin redeploy).
            "Proyección" = cuánto habría costado <strong>tu uso real de los últimos
            {{ days }} días</strong> de esa tarea con cada modelo — para decidir con datos, no
            con teoría.
          </p>

          <div v-for="(_models, provider) in modelsData.catalog" :key="provider" class="provider-block">
            <h3>{{ PROVIDER_LABELS[provider as string] ?? provider }}</h3>

            <div v-for="task in ['chat', 'analysis', 'vision']" :key="task">
              <template v-if="eligibleModels(provider as string, task).length && !(provider === 'deepseek' && task === 'vision')">
                <div class="task-head">
                  <strong>{{ TASK_LABELS[task] }}</strong>
                  <span class="active-model">
                    activo:
                    <code>{{ modelsData.active?.[provider]?.[task]?.model }}</code>
                    <em v-if="modelsData.active?.[provider]?.[task]?.source === 'override'" class="src-badge override">portal</em>
                    <em v-else class="src-badge">env</em>
                    <span v-if="modelsData.currentByTask?.[task] !== undefined" class="current-cost">
                      · gasto real {{ days }}d de {{ TASK_LABELS[task] }}: {{ money(modelsData.currentByTask[task]) }}
                    </span>
                  </span>
                </div>

                <div class="model-options">
                  <button
                    v-for="m in eligibleModels(provider as string, task)"
                    :key="m.id"
                    type="button"
                    class="model-card"
                    :class="{ on: modelsData.active?.[provider]?.[task]?.model === m.id }"
                    :disabled="modelSaving === `${provider}:${task}`"
                    @click="pickModel(provider as string, task, m.id)"
                  >
                    <span class="m-head">
                      <strong>{{ m.label }}</strong>
                      <BaseIcon
                        v-if="modelSaving === `${provider}:${task}`"
                        name="spinner" spin size="xs" color="cream"
                      />
                      <BaseIcon
                        v-else-if="modelsData.active?.[provider]?.[task]?.model === m.id"
                        name="check" size="xs" color="sage"
                      />
                    </span>
                    <span class="m-price">${{ m.inPerM }} in · ${{ m.outPerM }} out / 1M tokens</span>
                    <span class="m-projection">
                      Proyección {{ days }}d: <strong>{{ money(m.projectedByTask[task]) }}</strong>
                    </span>
                  </button>

                  <button
                    v-if="modelsData.active?.[provider]?.[task]?.source === 'override'"
                    type="button"
                    class="model-reset"
                    :disabled="modelSaving === `${provider}:${task}`"
                    @click="pickModel(provider as string, task, null)"
                  >
                    Volver al default del env
                  </button>
                </div>
              </template>
            </div>
          </div>
        </section>
      </template>

      <!-- ============ PROVEEDORES ============ -->
      <template v-else-if="section === 'proveedores' && providersData">
        <section class="panel">
          <h2>Verificación contra las APIs de los proveedores</h2>
          <p class="panel-note">
            El gasto local (por llamada, con detalle por usuario) es la fuente principal. Aquí
            se contrasta con lo que reporta cada proveedor, con su fuente explícita.
          </p>

          <div class="provider-cards">
            <!-- OpenAI -->
            <div class="billing-card" :class="{ ok: providersData.billing.openai.ok }">
              <h3>OpenAI</h3>
              <p class="b-local">
                Gasto local {{ days }}d:
                <strong>{{ money(providersData.local?.openai?.costUsd) }}</strong>
                ({{ compact(providersData.local?.openai?.calls) }} llamadas)
              </p>
              <template v-if="providersData.billing.openai.ok">
                <p class="b-live">
                  Costo real reportado por OpenAI:
                  <strong>{{ money((providersData.billing.openai.data as any)?.totalUsd) }}</strong>
                </p>
              </template>
              <p class="b-note">{{ providersData.billing.openai.note }}</p>
            </div>

            <!-- DeepSeek -->
            <div class="billing-card" :class="{ ok: providersData.billing.deepseek.ok }">
              <h3>DeepSeek</h3>
              <p class="b-local">
                Gasto local {{ days }}d:
                <strong>{{ money(providersData.local?.deepseek?.costUsd) }}</strong>
                ({{ compact(providersData.local?.deepseek?.calls) }} llamadas)
              </p>
              <template v-if="providersData.billing.deepseek.ok">
                <p
                  v-for="b in (providersData.billing.deepseek.data as any)?.balances ?? []"
                  :key="b.currency"
                  class="b-live"
                >
                  Saldo restante: <strong>{{ b.totalBalance }} {{ b.currency }}</strong>
                  <span class="b-sub">(recargado {{ b.toppedUpBalance }} · regalado {{ b.grantedBalance }})</span>
                </p>
              </template>
              <p class="b-note">{{ providersData.billing.deepseek.note }}</p>
            </div>

            <!-- Gemini -->
            <div class="billing-card">
              <h3>Gemini (Google)</h3>
              <p class="b-local">
                Gasto local {{ days }}d:
                <strong>{{ money(providersData.local?.gemini?.costUsd) }}</strong>
                ({{ compact(providersData.local?.gemini?.calls) }} llamadas)
              </p>
              <p class="b-note">{{ providersData.billing.gemini.note }}</p>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.admin-layout {
  display: flex;
  width: 100%;
  height: 100dvh;
  background-color: $alfii-navy;
}

// --- sidebar ---
.admin-sidebar {
  @include stack(16px);
  flex: 0 0 220px;
  padding: 20px 14px;
  border-right: 1px solid rgba($alfii-cream, 0.08);
  background-color: rgba($alfii-plum, 0.45);
  overflow-y: auto;

  // En movil el sidebar pasa arriba, horizontal y compacto.
  @media (max-width: 767px) {
    flex: 0 0 auto;
    width: 100%;
    flex-direction: row;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 14px;
    border-right: none;
    border-bottom: 1px solid rgba($alfii-cream, 0.08);
  }
}

@media (max-width: 767px) {
  .admin-layout {
    flex-direction: column;
  }
}

.side-back {
  @include row(6px, center);
  font-size: $fs-2xs;
  color: rgba($alfii-cream, 0.55);
  cursor: pointer;

  &:hover { color: $alfii-cream; }
}

.side-title {
  font-size: $fs-lg;
  font-weight: $fw-extrabold;
  color: $alfii-cream;

  @media (max-width: 767px) { display: none; }
}

.side-nav {
  @include stack(4px);
  flex: 1 1 auto;

  @media (max-width: 767px) {
    flex-direction: row;
    flex: 1 1 auto;
    gap: 4px;
  }

  button {
    @include row(10px, center);
    width: 100%;
    padding: 11px 12px;
    border-radius: 11px;
    font-size: $fs-sm;
    font-weight: $fw-semibold;
    color: rgba($alfii-cream, 0.65);
    text-align: left;
    cursor: pointer;
    transition: background-color $dur-fast $ease-out, color $dur-fast $ease-out;

    &:hover { background-color: rgba($alfii-cream, 0.05); }

    &.on {
      background-color: rgba($alfii-red, 0.14);
      color: $alfii-cream;
    }

    @media (max-width: 767px) {
      width: auto;
      padding: 8px 10px;
      font-size: $fs-xs;

      span { display: none; }
    }
  }
}

.range-tabs {
  @include row(6px, center);

  button {
    flex: 1;
    padding: 8px 10px;
    border-radius: 10px;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    color: rgba($alfii-cream, 0.7);
    background-color: rgba($alfii-navy, 0.6);
    border: 1px solid rgba($alfii-cream, 0.12);
    cursor: pointer;

    &.on {
      border-color: $alfii-sage;
      color: $alfii-cream;
      background-color: rgba($alfii-sage, 0.12);
    }
  }
}

// --- contenido ---
.admin-main {
  @include stack(16px);
  flex: 1 1 auto;
  min-width: 0;
  padding: 20px clamp(16px, 2.5vw, 32px) 60px;
  overflow-y: auto;
}

.state-block {
  @include stack(12px, center);
  padding: 60px 12px;
  text-align: center;

  h3 { font-size: $fs-md; font-weight: $fw-bold; color: $alfii-cream; }
  p { font-size: $fs-xs; color: rgba($alfii-cream, 0.6); max-width: 420px; line-height: $lh-relaxed; }
  code { color: $alfii-sage; }
}

.state-inline {
  @include row(8px, center, center);
  padding: 16px;
}

.cards-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.stat-card {
  @include stack(4px);
  flex: 1 1 180px;
  padding: 16px;
  border-radius: 14px;
  background-color: rgba($alfii-plum, 0.75);
  border: 1px solid rgba($alfii-cream, 0.1);

  .stat-label {
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba($alfii-cream, 0.55);
  }

  .stat-value {
    font-size: $fs-2xl;
    font-weight: $fw-extrabold;
    color: $alfii-cream;
  }

  .stat-sub {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.5);
  }
}

.panel {
  @include stack(10px);
  padding: 16px;
  border-radius: 14px;
  background-color: rgba($alfii-navy, 0.55);
  border: 1px solid rgba($alfii-cream, 0.08);

  h2 {
    font-size: $fs-sm;
    font-weight: $fw-bold;
    color: $alfii-cream;

    .hint {
      font-size: $fs-2xs;
      font-weight: $fw-medium;
      color: rgba($alfii-cream, 0.45);
    }
  }
}

.panel-note {
  font-size: $fs-xs;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.6);

  strong { color: rgba($alfii-cream, 0.85); }
}

.split {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: flex-start;

  .panel { flex: 1 1 280px; }
}

.day-bars { @include stack(4px); }

.day-row {
  @include row(8px, center);

  .day-label {
    flex: 0 0 44px;
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.55);
  }

  .day-track {
    flex: 1 1 auto;
    height: 10px;
    border-radius: 5px;
    background-color: rgba($alfii-cream, 0.06);
    overflow: hidden;
  }

  .day-fill {
    height: 100%;
    border-radius: 5px;
    background: linear-gradient(90deg, $alfii-sage, $alfii-red);
    min-width: 2px;
  }

  .day-cost {
    flex: 0 0 64px;
    text-align: right;
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.75);
  }
}

.table-scroll { overflow-x: auto; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: $fs-xs;

  th {
    text-align: left;
    padding: 8px 10px;
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba($alfii-cream, 0.45);
    border-bottom: 1px solid rgba($alfii-cream, 0.1);
    white-space: nowrap;
  }

  td {
    padding: 9px 10px;
    color: rgba($alfii-cream, 0.85);
    border-bottom: 1px solid rgba($alfii-cream, 0.05);
    white-space: nowrap;
  }

  .mono { font-family: monospace; font-size: $fs-2xs; }

  &.clickable tbody tr {
    cursor: pointer;

    &:hover { background-color: rgba($alfii-cream, 0.04); }
    &.on { background-color: rgba($alfii-sage, 0.08); }
  }
}

.user-cell {
  .u-name {
    @include row(6px, center);
    font-weight: $fw-semibold;
    color: $alfii-cream;
  }

  .u-meta {
    display: block;
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.45);
  }
}

.vip-badge {
  font-style: normal;
  font-size: 12px;
  font-weight: $fw-extrabold;
  letter-spacing: 0.08em;
  padding: 2px 7px;
  border-radius: 10px;
  color: $alfii-navy;
  background: linear-gradient(120deg, #eec25f, #f0a05a);
}

.admin-badge {
  font-style: normal;
  font-size: 12px;
  font-weight: $fw-extrabold;
  letter-spacing: 0.08em;
  padding: 2px 7px;
  border-radius: 10px;
  color: $alfii-cream;
  background: linear-gradient(120deg, rgba($alfii-red, 0.9), #7a2410);
}

.vip-btn {
  padding: 6px 12px;
  border-radius: 9px;
  font-size: $fs-2xs;
  font-weight: $fw-bold;
  color: rgba($alfii-cream, 0.8);
  border: 1px solid rgba($alfii-cream, 0.2);
  cursor: pointer;

  &:hover:not(:disabled) { border-color: #eec25f; color: $alfii-cream; }
  &.active { border-color: #eec25f; color: #eec25f; }
  &:disabled { opacity: 0.5; }
}

.user-detail {
  @include stack(10px);
  margin-top: 8px;
  padding: 14px;
  border-radius: 12px;
  background-color: rgba($alfii-plum, 0.5);
  border: 1px solid rgba($alfii-cream, 0.1);

  h3 {
    @include row(8px, center);
    font-size: $fs-sm;
    font-weight: $fw-bold;
    color: $alfii-cream;
  }
}

.detail-tasks {
  @include row(8px, center, flex-start);
  flex-wrap: wrap;
}

.task-chip {
  padding: 5px 10px;
  border-radius: 16px;
  font-size: $fs-2xs;
  color: rgba($alfii-cream, 0.75);
  background-color: rgba($alfii-cream, 0.06);

  strong { color: $alfii-sage; }
}

// --- seccion modelos ---
.provider-block {
  @include stack(10px);
  padding-top: 8px;

  h3 {
    font-size: $fs-md;
    font-weight: $fw-extrabold;
    color: $alfii-cream;
    padding-top: 6px;
    border-top: 1px solid rgba($alfii-cream, 0.07);
  }
}

.task-head {
  @include row(10px, center, flex-start);
  flex-wrap: wrap;
  padding-top: 6px;

  strong { font-size: $fs-sm; color: $alfii-cream; }

  .active-model {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.55);

    code { color: $alfii-sage; font-family: monospace; }
  }
}

.src-badge {
  font-style: normal;
  font-size: 12px;
  font-weight: $fw-bold;
  padding: 1px 6px;
  margin-left: 4px;
  border-radius: 8px;
  background-color: rgba($alfii-cream, 0.1);
  color: rgba($alfii-cream, 0.6);

  &.override {
    background-color: rgba($alfii-sage, 0.18);
    color: $alfii-sage;
  }
}

.current-cost { color: rgba($alfii-cream, 0.45); }

.model-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 0 4px;
}

.model-card {
  @include stack(4px);
  flex: 1 1 200px;
  max-width: 280px;
  padding: 11px 13px;
  border-radius: 12px;
  text-align: left;
  background-color: rgba($alfii-plum, 0.55);
  border: 1px solid rgba($alfii-cream, 0.12);
  cursor: pointer;
  transition: border-color $dur-fast $ease-out;

  &:hover:not(:disabled) { border-color: rgba($alfii-sage, 0.5); }
  &.on { border-color: $alfii-sage; background-color: rgba($alfii-sage, 0.08); }
  &:disabled { opacity: 0.6; cursor: wait; }

  .m-head {
    @include row(8px, center, space-between);

    strong { font-size: $fs-xs; color: $alfii-cream; }
  }

  .m-price {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.55);
  }

  .m-projection {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.7);

    strong { color: #eec25f; }
  }
}

.model-reset {
  align-self: center;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: $fs-2xs;
  font-weight: $fw-semibold;
  color: rgba($alfii-cream, 0.6);
  border: 1px dashed rgba($alfii-cream, 0.25);
  cursor: pointer;

  &:hover:not(:disabled) { color: $alfii-cream; }
}

// --- seccion proveedores ---
.provider-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.billing-card {
  @include stack(8px);
  flex: 1 1 260px;
  padding: 16px;
  border-radius: 14px;
  background-color: rgba($alfii-plum, 0.55);
  border: 1px solid rgba($alfii-cream, 0.12);

  &.ok { border-color: rgba($alfii-sage, 0.4); }

  h3 {
    font-size: $fs-md;
    font-weight: $fw-extrabold;
    color: $alfii-cream;
  }

  .b-local {
    font-size: $fs-xs;
    color: rgba($alfii-cream, 0.75);

    strong { color: $alfii-cream; }
  }

  .b-live {
    font-size: $fs-xs;
    color: $alfii-sage;

    strong { font-size: $fs-md; }

    .b-sub { font-size: $fs-2xs; color: rgba($alfii-cream, 0.5); }
  }

  .b-note {
    font-size: $fs-2xs;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.5);
  }
}

.empty {
  font-size: $fs-xs;
  color: rgba($alfii-cream, 0.5);
}

.foot-note {
  font-size: $fs-2xs;
  color: rgba($alfii-cream, 0.4);
}
</style>
