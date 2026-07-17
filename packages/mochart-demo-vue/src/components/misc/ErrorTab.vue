<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';

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
  <div v-if="failed" :class="'mochart-demo-tab-container error' + (props.active ? ' active' : '')">
    <div class="alert alert-danger text-center mochart-demo-error-message" role="alert">
      An Error Occurred
    </div>
  </div>
  <slot v-else></slot>
</template>
