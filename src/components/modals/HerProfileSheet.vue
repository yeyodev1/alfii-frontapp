<script lang="ts">
import type { IconName } from '@/config/icons';

export type HowWeMet =
  | 'APP_CITAS'
  | 'TRABAJO'
  | 'AMIGOS'
  | 'GYM'
  | 'UNIVERSIDAD'
  | 'FIESTA'
  | 'REDES'
  | 'CALLE'
  | 'OTRO';

export type RelationshipGoal = 'ALGO_SERIO' | 'CASUAL' | 'NO_LO_SE';

export interface HerProfile {
  howWeMet?: HowWeMet;
  knownSinceMonths?: number;
  herAge?: number;
  herOccupation?: string;
  instagram?: string;
  relationshipGoal?: RelationshipGoal;
  notes?: string;
}

export interface HerCompleteness {
  score: number;
  missing: string[];
}

/** Etiquetas en castellano. El enum crudo jamas llega a la pantalla. */
export const HOW_WE_MET_OPTIONS: { value: HowWeMet; label: string; icon: IconName }[] = [
  { value: 'APP_CITAS', label: 'En una app de citas', icon: 'platform.tinder' },
  { value: 'TRABAJO', label: 'En el trabajo', icon: 'step.STATUS' },
  { value: 'AMIGOS', label: 'Por amigos en común', icon: 'handHoldingHeart' },
  { value: 'GYM', label: 'En el gimnasio', icon: 'bolt' },
  { value: 'UNIVERSIDAD', label: 'En la universidad', icon: 'step.PHILOSOPHY' },
  { value: 'FIESTA', label: 'En una fiesta', icon: 'firstDate' },
  { value: 'REDES', label: 'Por redes sociales', icon: 'platform.instagram' },
  { value: 'CALLE', label: 'En la calle', icon: 'earthAmericas' },
  { value: 'OTRO', label: 'De otra forma', icon: 'info' },
];

export const GOAL_OPTIONS: { value: RelationshipGoal; label: string; hint: string; icon: IconName }[] = [
  {
    value: 'ALGO_SERIO',
    label: 'Algo serio',
    hint: 'Quieres que esto vaya a algún lado',
    icon: 'handHoldingHeart',
  },
  { value: 'CASUAL', label: 'Algo casual', hint: 'Sin etiquetas por ahora', icon: 'firstNight' },
  { value: 'NO_LO_SE', label: 'Todavía no lo sé', hint: 'Estás viendo qué pasa', icon: 'thinking' },
];

/** Rangos tocables: nadie recuerda "llevo 7 meses hablando con ella". */
export const KNOWN_SINCE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Menos de un mes' },
  { value: 2, label: 'Un par de meses' },
  { value: 5, label: 'Medio año' },
  { value: 10, label: 'Casi un año' },
  { value: 18, label: 'Un par de años' },
  { value: 48, label: 'Muchos años' },
];
</script>

<script setup lang="ts">
import { ref, computed } from 'vue';
import BaseSheet from '@/components/modals/BaseSheet.vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import api from '@/services/http';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  targetId: string;
  displayName: string;
  herProfile?: HerProfile | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved', target: any): void;
}>();

const toastStore = useToastStore();

// Borrador local: se contesta todo y se manda un solo PATCH al final, asi el
// usuario puede volver atras y cambiar de idea sin ensuciar la base
const draft = ref<HerProfile>({ ...(props.herProfile ?? {}) });
const step = ref(0);
const saving = ref(false);

const ageText = ref(draft.value.herAge ? String(draft.value.herAge) : '');
const occupationText = ref(draft.value.herOccupation ?? '');
const instagramText = ref(draft.value.instagram ?? '');
const notesText = ref(draft.value.notes ?? '');

const TOTAL_STEPS = 7;

const isLast = computed(() => step.value === TOTAL_STEPS - 1);
const progress = computed(() => Math.round(((step.value + 1) / TOTAL_STEPS) * 100));

// La edad se valida en el cliente para no gastar un viaje al backend en un 17
const ageValid = computed(() => {
  if (!ageText.value.trim()) return true;
  const n = Number(ageText.value);
  return Number.isInteger(n) && n >= 18 && n <= 99;
});

// Mismo criterio de normalizado que el backend: sin @, minúsculas, 30 chars
const instagramClean = computed(() =>
  instagramText.value.trim().replace(/^@+/, '').toLowerCase().slice(0, 30)
);
const instagramValid = computed(
  () => !instagramClean.value || /^[a-z0-9._]+$/.test(instagramClean.value)
);

function pickHowWeMet(value: HowWeMet) {
  draft.value.howWeMet = value;
  next();
}

function pickKnownSince(value: number) {
  draft.value.knownSinceMonths = value;
  next();
}

function pickGoal(value: RelationshipGoal) {
  draft.value.relationshipGoal = value;
  next();
}

function next() {
  if (isLast.value) {
    save();
    return;
  }
  step.value += 1;
}

function back() {
  if (step.value > 0) step.value -= 1;
}

/** Saltar deja el campo como estaba: nunca borra lo que ya habia. */
function skip() {
  next();
}

function commitTextFields() {
  const age = Number(ageText.value);
  if (ageText.value.trim() && Number.isInteger(age) && age >= 18 && age <= 99) {
    draft.value.herAge = age;
  }
  const occ = occupationText.value.trim();
  if (occ) draft.value.herOccupation = occ.slice(0, 80);
  if (instagramClean.value && instagramValid.value) draft.value.instagram = instagramClean.value;
  const notes = notesText.value.trim();
  if (notes) draft.value.notes = notes.slice(0, 500);
}

async function save() {
  if (saving.value) return;
  commitTextFields();

  // Solo se manda lo que tiene valor: el backend borra el campo si recibe null
  const payload: Record<string, unknown> = {};
  if (draft.value.howWeMet) payload.howWeMet = draft.value.howWeMet;
  if (typeof draft.value.knownSinceMonths === 'number') {
    payload.knownSinceMonths = draft.value.knownSinceMonths;
  }
  if (typeof draft.value.herAge === 'number') payload.herAge = draft.value.herAge;
  if (draft.value.herOccupation) payload.herOccupation = draft.value.herOccupation;
  if (draft.value.instagram) payload.instagram = draft.value.instagram;
  if (draft.value.relationshipGoal) payload.relationshipGoal = draft.value.relationshipGoal;
  if (draft.value.notes) payload.notes = draft.value.notes;

  if (Object.keys(payload).length === 0) {
    emit('close');
    return;
  }

  saving.value = true;
  try {
    const res: any = await api.patch(`/targets/${props.targetId}/her-profile`, payload);
    if (res?.target) emit('saved', res.target);
    toastStore.show('Alfii ya sabe más de ella', 'success');
    emit('close');
  } catch {
    // El interceptor de http ya avisa del error; la hoja se queda abierta
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseSheet :title="`Perfil de ${displayName}`" @close="emit('close')">
    <div class="her-sheet">
      <div class="progress-row">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
        <span class="progress-text">{{ step + 1 }}/{{ TOTAL_STEPS }}</span>
      </div>

      <p class="why">
        <BaseIcon name="lightbulb" size="xs" color="sage" />
        Esto entra en el análisis. Una match de hace tres días no se lee igual que una compañera de
        trabajo de hace dos años.
      </p>

      <!-- 1. Donde la conociste -->
      <section v-if="step === 0" class="step">
        <h3>¿Dónde la conociste?</h3>
        <p class="sub">Marca el origen de la conversación y el tono cambia entero.</p>
        <div class="option-wrap">
          <button
            v-for="o in HOW_WE_MET_OPTIONS"
            :key="o.value"
            type="button"
            class="chip"
            :class="{ on: draft.howWeMet === o.value }"
            @click="pickHowWeMet(o.value)"
          >
            <BaseIcon :name="o.icon" size="sm" :color="draft.howWeMet === o.value ? 'sage' : 'muted'" />
            <span>{{ o.label }}</span>
          </button>
        </div>
      </section>

      <!-- 2. Cuanto tiempo -->
      <section v-else-if="step === 1" class="step">
        <h3>¿Cuánto tiempo llevan hablando?</h3>
        <p class="sub">Con el tiempo cambia lo que se puede decir sin sonar raro.</p>
        <div class="option-wrap">
          <button
            v-for="o in KNOWN_SINCE_OPTIONS"
            :key="o.value"
            type="button"
            class="chip"
            :class="{ on: draft.knownSinceMonths === o.value }"
            @click="pickKnownSince(o.value)"
          >
            <span>{{ o.label }}</span>
          </button>
        </div>
      </section>

      <!-- 3. Edad -->
      <section v-else-if="step === 2" class="step">
        <h3>¿Sabes qué edad tiene?</h3>
        <p class="sub">Ajusta las referencias y el registro de los scripts.</p>
        <div class="field">
          <input
            v-model="ageText"
            type="number"
            inputmode="numeric"
            min="18"
            max="99"
            placeholder="Ej. 26"
          />
          <span v-if="!ageValid" class="field-error">Tiene que estar entre 18 y 99.</span>
        </div>
      </section>

      <!-- 4. Ocupacion -->
      <section v-else-if="step === 3" class="step">
        <h3>¿A qué se dedica?</h3>
        <p class="sub">Sirve para proponer planes y temas que le encajen de verdad.</p>
        <div class="field">
          <input
            v-model="occupationText"
            type="text"
            maxlength="80"
            placeholder="Ej. enfermera, diseñadora, estudiante de derecho"
          />
        </div>
      </section>

      <!-- 5. Instagram -->
      <section v-else-if="step === 4" class="step">
        <h3>¿Cuál es su Instagram?</h3>
        <p class="sub">Su perfil dice mucho: estilo de vida, círculo, cómo se muestra.</p>
        <div class="field">
          <div class="ig-field">
            <BaseIcon name="platform.instagram" size="sm" color="muted" />
            <span class="ig-at">@</span>
            <input
              v-model="instagramText"
              type="text"
              maxlength="31"
              autocapitalize="off"
              autocomplete="off"
              spellcheck="false"
              placeholder="usuario"
            />
          </div>
          <span v-if="!instagramValid" class="field-error">
            Solo letras, números, puntos y guiones bajos.
          </span>
        </div>
      </section>

      <!-- 6. Que buscas -->
      <section v-else-if="step === 5" class="step">
        <h3>¿Qué buscas con ella?</h3>
        <p class="sub">Sin esto, Alfii calibra a ciegas hacia dónde empujar.</p>
        <div class="option-wrap column">
          <button
            v-for="o in GOAL_OPTIONS"
            :key="o.value"
            type="button"
            class="chip wide"
            :class="{ on: draft.relationshipGoal === o.value }"
            @click="pickGoal(o.value)"
          >
            <BaseIcon
              :name="o.icon"
              size="sm"
              :color="draft.relationshipGoal === o.value ? 'sage' : 'muted'"
            />
            <span class="chip-text">
              <strong>{{ o.label }}</strong>
              <small>{{ o.hint }}</small>
            </span>
          </button>
        </div>
      </section>

      <!-- 7. Notas libres -->
      <section v-else class="step">
        <h3>¿Algo que deba saber de ella?</h3>
        <p class="sub">
          Lo que no cabe en una casilla: que acaba de salir de una relación, que odia los audios,
          que trabaja de noche.
        </p>
        <div class="field">
          <textarea
            v-model="notesText"
            maxlength="500"
            rows="4"
            placeholder="Escribe lo que quieras que Alfii tenga en cuenta"
          ></textarea>
          <span class="field-count">{{ notesText.length }}/500</span>
        </div>
      </section>

      <div class="nav-row">
        <button v-if="step > 0" type="button" class="btn-ghost" :disabled="saving" @click="back">
          <BaseIcon name="back" size="xs" color="muted" />
          <span>Atrás</span>
        </button>
        <span v-else class="nav-spacer"></span>

        <div class="nav-right">
          <button type="button" class="btn-ghost" :disabled="saving" @click="skip">Saltar</button>
          <button
            type="button"
            class="btn-primary"
            :disabled="saving || !ageValid || !instagramValid"
            @click="next"
          >
            <BaseIcon v-if="saving" name="spinner" spin size="xs" color="plum" />
            <span>{{ isLast ? 'Guardar' : 'Siguiente' }}</span>
          </button>
        </div>
      </div>
    </div>
  </BaseSheet>
</template>

<style lang="scss" scoped>
.her-sheet {
  @include stack(16px);
}

.progress-row {
  @include row(10px, center);

  .progress-track {
    flex: 1 1 auto;
    height: 5px;
    border-radius: 3px;
    background-color: rgba($alfii-cream, 0.1);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background-color: $alfii-sage;
    border-radius: 3px;
    transition: width $dur-base $ease-out;
  }

  .progress-text {
    flex: 0 0 auto;
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    color: rgba($alfii-cream, 0.5);
  }
}

.why {
  @include row(8px, flex-start);
  padding: 10px 12px;
  background-color: rgba($alfii-sage, 0.08);
  border-left: 3px solid $alfii-sage;
  border-radius: 10px;
  font-size: $fs-2xs;
  line-height: $lh-relaxed;
  color: rgba($alfii-cream, 0.75);
}

.step {
  @include stack(10px);
  min-height: 190px;

  h3 {
    font-size: $fs-lg;
    font-weight: $fw-bold;
    color: $alfii-cream;
    line-height: $lh-snug;
  }

  .sub {
    font-size: $fs-xs;
    line-height: $lh-relaxed;
    color: rgba($alfii-cream, 0.6);
  }
}

.option-wrap {
  @include row(8px, stretch, flex-start);
  flex-wrap: wrap;
  margin-top: 4px;

  &.column {
    flex-direction: column;
  }
}

.chip {
  @include row(8px, center);
  flex: 0 1 auto;
  padding: 10px 14px;
  border-radius: 12px;
  background-color: rgba($alfii-navy, 0.55);
  border: 1px solid rgba($alfii-cream, 0.12);
  font-size: $fs-xs;
  font-weight: $fw-semibold;
  color: rgba($alfii-cream, 0.85);
  cursor: pointer;
  transition: border-color $dur-fast $ease-out, background-color $dur-fast $ease-out;

  &:hover { border-color: rgba($alfii-cream, 0.28); }

  &.on {
    border-color: $alfii-sage;
    background-color: rgba($alfii-sage, 0.14);
    color: $alfii-cream;
  }

  &.wide {
    width: 100%;
    padding: 14px;
  }

  .chip-text {
    @include stack(2px);
    text-align: left;

    strong { font-size: $fs-sm; color: $alfii-cream; }
    small { font-size: $fs-2xs; color: rgba($alfii-cream, 0.55); }
  }
}

.field {
  @include stack(6px);
  margin-top: 4px;
  position: relative;

  input, textarea {
    width: 100%;
    padding: 14px 16px;
    background-color: rgba($alfii-navy, 0.6);
    border: 1px solid rgba($alfii-cream, 0.18);
    border-radius: 12px;
    font-size: $fs-md;
    color: $alfii-cream;
    resize: none;

    &::placeholder { color: rgba($alfii-cream, 0.35); font-size: $fs-sm; }
    &:focus { outline: none; border-color: $alfii-sage; }
  }

  .field-error {
    font-size: $fs-2xs;
    color: $alfii-red;
  }

  .ig-field {
    @include row(8px, center);
    padding: 0 16px;
    background-color: rgba($alfii-navy, 0.6);
    border: 1px solid rgba($alfii-cream, 0.18);
    border-radius: 12px;

    &:focus-within { border-color: $alfii-sage; }

    .ig-at {
      color: rgba($alfii-cream, 0.5);
      font-size: $fs-md;
      font-weight: $fw-semibold;
    }

    input {
      flex: 1 1 auto;
      padding: 14px 0;
      background: transparent;
      border: none;

      &:focus { border: none; }
    }
  }

  .field-count {
    font-size: $fs-2xs;
    color: rgba($alfii-cream, 0.4);
    text-align: right;
  }
}

.nav-row {
  @include row(10px, center, space-between);
  padding-top: 4px;
  border-top: 1px solid rgba($alfii-cream, 0.06);
}

.nav-spacer {
  flex: 0 0 auto;
  width: 1px;
}

.nav-right {
  @include row(8px, center, flex-end);
}

.btn-ghost {
  @include row(6px);
  padding: 10px 14px;
  border-radius: 10px;
  font-size: $fs-xs;
  font-weight: $fw-semibold;
  color: rgba($alfii-cream, 0.6);
  background: transparent;
  cursor: pointer;

  &:hover { color: $alfii-cream; }
  &:disabled { opacity: 0.5; cursor: default; }
}

.btn-primary {
  @include row(6px, center, center);
  padding: 12px 20px;
  border-radius: 12px;
  background-color: $alfii-sage;
  color: $alfii-navy;
  font-size: $fs-sm;
  font-weight: $fw-bold;
  cursor: pointer;

  &:disabled { opacity: 0.5; cursor: default; }
}

// Desde tablet la hoja tiene sitio para respirar
@media (min-width: 768px) {
  .step {
    min-height: 210px;

    h3 { font-size: $fs-xl; }
  }
}
</style>
