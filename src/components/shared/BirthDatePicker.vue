<script setup lang="ts">
import BaseIcon from '@/components/shared/BaseIcon.vue';
import { computed, nextTick, ref, watch } from 'vue';

/**
 * Selector de fecha de nacimiento propio.
 *
 * PORQUE no se usa <input type="date">: el nativo abre un calendario que arranca
 * en el mes actual y obliga a retroceder decadas para llegar a un ano de
 * nacimiento. Para una fecha de hace 20 o 40 anos es el peor patron posible.
 * Aqui se elige por listas independientes (dia, mes, ano) con el ano ordenado de
 * mas reciente a mas antiguo, que es como piensa el usuario.
 */

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    minAge?: number;
    maxAge?: number;
  }>(),
  {
    modelValue: '',
    minAge: 18,
    maxAge: 80,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'confirm', value: string): void;
}>();

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const day = ref<number | null>(null);
const month = ref<number | null>(null);
const year = ref<number | null>(null);

type Field = 'day' | 'month' | 'year' | null;
const openField = ref<Field>(null);
const listRef = ref<HTMLElement | null>(null);

const currentYear = new Date().getFullYear();

const years = computed(() => {
  const from = currentYear - props.minAge;
  const to = currentYear - props.maxAge;
  const out: number[] = [];
  for (let y = from; y >= to; y--) out.push(y);
  return out;
});

/** Los dias dependen del mes y del ano: sin esto se puede elegir 31 de febrero. */
const daysInMonth = computed(() => {
  if (month.value === null) return 31;
  const y = year.value ?? 2000;
  return new Date(y, month.value + 1, 0).getDate();
});

const days = computed(() => Array.from({ length: daysInMonth.value }, (_, i) => i + 1));

// Si el usuario ya habia elegido 31 y cambia a un mes de 30, se corrige sola en
// vez de dejar una fecha imposible seleccionada.
watch(daysInMonth, (max) => {
  if (day.value && day.value > max) day.value = max;
});

const isComplete = computed(() => day.value !== null && month.value !== null && year.value !== null);

const isoValue = computed(() => {
  if (!isComplete.value) return '';
  const mm = String((month.value as number) + 1).padStart(2, '0');
  const dd = String(day.value).padStart(2, '0');
  return `${year.value}-${mm}-${dd}`;
});

const age = computed(() => {
  if (!isComplete.value) return null;
  const today = new Date();
  const birth = new Date(year.value as number, month.value as number, day.value as number);
  let a = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
  return a;
});

watch(isoValue, (v) => emit('update:modelValue', v));

async function toggle(field: Exclude<Field, null>) {
  openField.value = openField.value === field ? null : field;
  if (!openField.value) return;

  // Al abrir, se centra el valor ya elegido: si no, la lista de anos empieza
  // arriba y el usuario cree que perdio su seleccion.
  await nextTick();
  listRef.value?.querySelector('.opt.selected')?.scrollIntoView({ block: 'center' });
}

function pick(field: Exclude<Field, null>, value: number) {
  if (field === 'day') day.value = value;
  if (field === 'month') month.value = value;
  if (field === 'year') year.value = value;

  // Encadena al siguiente campo vacio: el usuario no tiene que pensar que toca.
  if (field === 'day' && month.value === null) openField.value = 'month';
  else if (field === 'month' && year.value === null) openField.value = 'year';
  else if (field === 'year' && day.value === null) openField.value = 'day';
  else openField.value = null;
}

const options = computed(() => {
  if (openField.value === 'day') return days.value.map((d) => ({ value: d, label: String(d) }));
  if (openField.value === 'month') return MONTHS.map((m, i) => ({ value: i, label: m }));
  if (openField.value === 'year') return years.value.map((y) => ({ value: y, label: String(y) }));
  return [];
});

function isSelected(value: number) {
  if (openField.value === 'day') return day.value === value;
  if (openField.value === 'month') return month.value === value;
  if (openField.value === 'year') return year.value === value;
  return false;
}

function confirm() {
  if (!isComplete.value) return;
  emit('confirm', isoValue.value);
}
</script>

<template>
  <div class="bd-picker">
    <div class="fields">
      <button
        class="field"
        :class="{ open: openField === 'day', filled: day !== null }"
        @click="toggle('day')"
      >
        <span class="f-label">Día</span>
        <span class="f-value">{{ day ?? '--' }}</span>
      </button>

      <button
        class="field wide"
        :class="{ open: openField === 'month', filled: month !== null }"
        @click="toggle('month')"
      >
        <span class="f-label">Mes</span>
        <span class="f-value">{{ month !== null ? MONTHS[month] : '--' }}</span>
      </button>

      <button
        class="field"
        :class="{ open: openField === 'year', filled: year !== null }"
        @click="toggle('year')"
      >
        <span class="f-label">Año</span>
        <span class="f-value">{{ year ?? '--' }}</span>
      </button>
    </div>

    <div v-if="openField" ref="listRef" class="options">
      <button
        v-for="opt in options"
        :key="opt.value"
        class="opt"
        :class="{ selected: isSelected(opt.value) }"
        @click="pick(openField!, opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div v-if="isComplete" class="confirm-row">
      <span class="age-note">
        <BaseIcon name="check" size="xs" color="sage" />
        Tienes {{ age }} años
      </span>
      <button class="confirm-btn" @click="confirm">
        <span>Confirmar</span>
        <BaseIcon name="arrowRight" size="xs" color="cream" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.bd-picker {
  @include stack(10px);
  width: 100%;
}

.fields {
  @include row(8px, stretch);
}

.field {
  @include stack(2px, flex-start);
  flex: 1;
  padding: 10px 12px;
  border-radius: 13px;
  text-align: left;
  background-color: rgba($alfii-navy, 0.8);
  border: 1px solid rgba($alfii-cream, 0.14);
  transition: border-color $dur-fast $ease-out, background-color $dur-fast $ease-out;

  &.wide { flex: 1.6; }

  &.filled { border-color: rgba($alfii-sage, 0.45); }

  &.open {
    border-color: $alfii-red;
    background-color: rgba($alfii-red, 0.1);
  }

  .f-label {
    font-size: $fs-2xs;
    font-weight: $fw-bold;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba($alfii-cream, 0.5);
  }

  .f-value {
    font-size: $fs-lg;
    font-weight: $fw-bold;
    color: $alfii-cream;
    text-transform: capitalize;
  }
}

// Lista propia en vez de <select>: el desplegable nativo no se puede tematizar
// y en movil abre una rueda del sistema que rompe la estetica de la app.
.options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 190px;
  padding: 10px;
  border-radius: 14px;
  background-color: rgba($alfii-plum, 0.85);
  border: 1px solid rgba($alfii-cream, 0.12);
  @include scroll-y;
  animation: fadeInUp $dur-fast $ease-out both;

  .opt {
    flex: 0 0 auto;
    min-width: 52px;
    padding: 9px 12px;
    border-radius: 10px;
    font-size: $fs-sm;
    font-weight: $fw-semibold;
    color: rgba($alfii-cream, 0.8);
    background-color: rgba($alfii-navy, 0.6);
    border: 1px solid transparent;
    text-transform: capitalize;

    &:hover { border-color: rgba($alfii-cream, 0.22); }

    &.selected {
      background-color: $alfii-red;
      color: $alfii-cream;
      border-color: $alfii-red;
    }
  }
}

.confirm-row {
  @include row(10px, center, space-between);
  animation: fadeInUp $dur-fast $ease-out both;

  .age-note {
    @include row(6px, center);
    font-size: $fs-xs;
    font-weight: $fw-semibold;
    color: $alfii-sage;
  }

  .confirm-btn {
    @include row(7px, center);
    padding: 11px 20px;
    border-radius: 12px;
    font-size: $fs-xs;
    font-weight: $fw-bold;
    background-color: $alfii-red;
    color: $alfii-cream;
    box-shadow: 0 4px 16px rgba($alfii-red, 0.42);
  }
}

@media (min-width: 768px) {
  .options { max-height: 230px; }
}
</style>
