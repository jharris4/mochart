<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';

import { demoText } from '@mochart/demo-common';

// Error-boundary equivalent of the react ErrorTab. Unlike the react
// version (which cloned its child to inject `active`), children here
// receive their `active` prop directly at the call site.
interface Props {
  active: boolean;
}

const props = defineProps<Props>();

const failed = ref(false);

onErrorCaptured((error) => {
  console.error(error);
  failed.value = true;
  return false;
});
</script>

<template>
  <div v-if="failed" :class="'mochart-demo-tab-container error' + (props.active ? ' active' : '')" :inert="!props.active">
    <div class="demo-alert demo-alert-error demo-text-center mochart-demo-error-message" role="alert">
      {{ demoText.errors.errorOccurred }}
    </div>
  </div>
  <slot v-else></slot>
</template>
