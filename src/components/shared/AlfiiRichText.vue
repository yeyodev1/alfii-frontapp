<script setup lang="ts">
/**
 * Render de una respuesta de Alfii en el chat.
 *
 * El modelo escribe un formato minimo (ver CHAT_MODE en el backend):
 *   "> texto"  mensaje listo para enviarle a ella  → tarjeta con Copiar
 *   "⏱ texto"  tiempo / espera                      → aviso destacado
 *   "• texto"  paso u opcion                         → lista
 *   "➜ texto"  accion ahora                          → cierre
 *   **clave**  negrita inline
 * Se re-parsea en cada delta del streaming: el parser es tolerante a lineas a
 * medias y nunca lanza. Texto sin marcas se pinta como parrafos normales.
 */
import { computed } from 'vue';
import BaseIcon from '@/components/shared/BaseIcon.vue';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{ content: string }>();
const toastStore = useToastStore();

type Block =
  | { type: 'p'; text: string }
  | { type: 'script'; text: string }
  | { type: 'timing'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'next'; text: string };

const TIMING_RE = /^(?:⏱|⏰|🕐|⌛)️?\s*/;
const NEXT_RE = /^(?:➜|→|➡|👉)️?\s*/;
const BULLET_RE = /^(?:•|-|–|·)\s+/;

const blocks = computed<Block[]>(() => {
  const out: Block[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) out.push({ type: 'p', text: para.join(' ') });
    para = [];
  };

  for (const raw of (props.content || '').split('\n')) {
    const line = raw.trim();
    if (!line) { flushPara(); continue; }

    if (line.startsWith('>')) {
      flushPara();
      out.push({ type: 'script', text: line.replace(/^>\s?/, '').replace(/^["“]|["”]$/g, '') });
    } else if (TIMING_RE.test(line)) {
      flushPara();
      out.push({ type: 'timing', text: line.replace(TIMING_RE, '') });
    } else if (NEXT_RE.test(line)) {
      flushPara();
      out.push({ type: 'next', text: line.replace(NEXT_RE, '') });
    } else if (BULLET_RE.test(line)) {
      flushPara();
      const item = line.replace(BULLET_RE, '');
      const last = out[out.length - 1];
      if (last && last.type === 'list') last.items.push(item);
      else out.push({ type: 'list', items: [item] });
    } else {
      para.push(line);
    }
  }
  flushPara();
  return out;
});

/** Negrita inline sin HTML arbitrario: solo se interpreta **...**. */
function inline(text: string): Array<{ b: boolean; t: string }> {
  const parts: Array<{ b: boolean; t: string }> = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ b: false, t: text.slice(last, m.index) });
    parts.push({ b: true, t: m[1] ?? '' });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ b: false, t: text.slice(last).replace(/\*\*$/, '') });
  return parts;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toastStore.show('Mensaje copiado. Pégalo tal cual.', 'success');
  } catch {
    toastStore.show('No pude copiar. Selecciónalo a mano.', 'error');
  }
}
</script>

<template>
  <div class="rich">
    <template v-for="(b, i) in blocks" :key="i">
      <p v-if="b.type === 'p'" class="rich-p">
        <template v-for="(s, j) in inline(b.text)" :key="j"><strong v-if="s.b">{{ s.t }}</strong><template v-else>{{ s.t }}</template></template>
      </p>

      <div v-else-if="b.type === 'timing'" class="rich-timing">
        <span class="t-icon"><BaseIcon name="timing" size="sm" color="cream" /></span>
        <div class="t-body">
          <span class="t-label">Tiempo</span>
          <p><template v-for="(s, j) in inline(b.text)" :key="j"><strong v-if="s.b">{{ s.t }}</strong><template v-else>{{ s.t }}</template></template></p>
        </div>
      </div>

      <div v-else-if="b.type === 'script'" class="rich-script">
        <div class="s-head">
          <span class="s-label"><BaseIcon name="scripts" size="xs" color="sage" /> Mensaje para ella</span>
          <button type="button" class="s-copy" @click="copy(b.text)">
            <BaseIcon name="copy" size="xs" color="cream" /> Copiar
          </button>
        </div>
        <p class="s-text">{{ b.text }}</p>
      </div>

      <ul v-else-if="b.type === 'list'" class="rich-list">
        <li v-for="(it, k) in b.items" :key="k">
          <template v-for="(s, j) in inline(it)" :key="j"><strong v-if="s.b">{{ s.t }}</strong><template v-else>{{ s.t }}</template></template>
        </li>
      </ul>

      <div v-else-if="b.type === 'next'" class="rich-next">
        <BaseIcon name="bolt" size="xs" color="cream" />
        <p><template v-for="(s, j) in inline(b.text)" :key="j"><strong v-if="s.b">{{ s.t }}</strong><template v-else>{{ s.t }}</template></template></p>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.rich {
  @include stack(10px);
  white-space: normal;
}

.rich-p {
  margin: 0;
  line-height: $lh-relaxed;
  strong { color: $alfii-cream; font-weight: $fw-bold; }
}

.rich-timing {
  @include row(10px, flex-start);
  padding: 10px 12px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(#e0b15a, 0.22), rgba(#e0b15a, 0.06));
  border: 1px solid rgba(#e0b15a, 0.5);

  .t-icon {
    @include center;
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-color: rgba(#e0b15a, 0.35);
  }

  .t-body { @include stack(2px); }

  .t-label {
    font-size: 11px;
    font-weight: $fw-bold;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #e0b15a;
  }

  p {
    margin: 0;
    font-size: $fs-sm;
    font-weight: $fw-semibold;
    line-height: $lh-snug;
    color: $alfii-cream;
  }
}

.rich-script {
  @include stack(6px);
  padding: 10px 12px 12px;
  border-radius: 12px;
  background-color: rgba($alfii-sage, 0.12);
  border: 1px solid rgba($alfii-sage, 0.45);
  border-left-width: 3px;

  .s-head { @include row(8px, center, space-between); }

  .s-label {
    @include row(6px);
    font-size: 11px;
    font-weight: $fw-bold;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: $alfii-sage;
  }

  .s-copy {
    @include row(5px);
    padding: 5px 10px;
    border-radius: 999px;
    font-size: $fs-2xs;
    font-weight: $fw-semibold;
    color: $alfii-cream;
    background-color: rgba($alfii-cream, 0.1);
    border: 1px solid rgba($alfii-cream, 0.18);
    transition: background-color $dur-fast $ease-out;
    &:hover { background-color: rgba($alfii-cream, 0.2); }
  }

  .s-text {
    margin: 0;
    font-size: $fs-sm;
    line-height: $lh-relaxed;
    color: $alfii-cream;
    font-style: italic;
  }
}

.rich-list {
  margin: 0;
  padding-left: 4px;
  list-style: none;
  @include stack(6px);

  li {
    position: relative;
    padding-left: 18px;
    line-height: $lh-relaxed;
    &::before {
      content: '';
      position: absolute;
      left: 2px;
      top: 0.62em;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: $alfii-red;
    }
  }
}

.rich-next {
  @include row(8px, flex-start);
  margin-top: 2px;
  padding: 10px 12px;
  border-radius: 12px;
  background-color: rgba($alfii-red, 0.18);
  border: 1px solid rgba($alfii-red, 0.45);

  p {
    margin: 0;
    font-size: $fs-sm;
    font-weight: $fw-bold;
    line-height: $lh-snug;
    color: $alfii-cream;
  }
}
</style>
