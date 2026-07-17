<script setup lang="ts">
import { computed } from 'vue';

// Font Awesome 4 icon (css classes only), the Vue equivalent of the
// react demo's react-fontawesome shim. Relies on the `font-awesome`
// package's css being imported.
interface Props {
  name: string;
  size?: string;
  fixedWidth?: boolean;
  flip?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: void 0,
  fixedWidth: false,
  flip: void 0
});

const classes = computed(() => {
  const list = ['fa', `fa-${props.name}`];
  if (props.size) {
    list.push(`fa-${props.size}`);
  }
  if (props.fixedWidth) {
    list.push('fa-fw');
  }
  if (props.flip) {
    list.push(`fa-flip-${props.flip}`);
  }
  return list.join(' ');
});
</script>

<template>
  <span aria-hidden="true" :class="classes"></span>
</template>
