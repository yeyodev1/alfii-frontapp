<script setup lang="ts">
import { useModalStore } from '@/stores/modal';

const modalStore = useModalStore();
</script>

<template>
  <div class="modal-host">
    <component
      v-for="entry in modalStore.stack"
      :key="entry.id"
      :is="entry.component"
      v-bind="entry.props"
      @close="modalStore.pop"
    />
  </div>
</template>
