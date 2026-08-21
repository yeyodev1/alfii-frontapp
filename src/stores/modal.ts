import { defineStore } from 'pinia';
import { ref, markRaw, type Component } from 'vue';
import { useSound } from '@/composables/useSound';
const { sound } = useSound();

export interface ModalEntry {
  id: string;
  component: Component;
  props?: Record<string, any>;
  dismissable?: boolean;
}

export const useModalStore = defineStore('modal', () => {
  const stack = ref<ModalEntry[]>([]);

  function push(id: string, component: Component, props: Record<string, any> = {}, dismissable = true) {
    // Si ya existe el mismo id en la pila, se reemplaza la cima.
    const idx = stack.value.findIndex((m) => m.id === id);
    if (idx !== -1) {
      stack.value.splice(idx, 1);
    }
    stack.value.push({ id, component: markRaw(component), props, dismissable });
    sound('open');
    document.body.style.overflow = 'hidden';
  }

  function pop() {
    if (stack.value.length) sound('close');
    stack.value.pop();
    if (stack.value.length === 0) {
      document.body.style.overflow = '';
    }
  }

  function clear() {
    stack.value = [];
    document.body.style.overflow = '';
  }

  return { stack, push, pop, clear };
});
