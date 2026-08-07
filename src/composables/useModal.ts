import { useModalStore } from '@/stores/modal';
import type { Component } from 'vue';

export function useModal() {
  const store = useModalStore();

  function open(id: string, component: Component, props: Record<string, any> = {}, dismissable = true) {
    store.push(id, component, props, dismissable);
  }

  function close() {
    store.pop();
  }

  function closeAll() {
    store.clear();
  }

  return { open, close, closeAll, stack: store.stack };
}
