<script setup lang="ts">
import { demoText } from '@mochart/demo-common';

import Icon from './Icon.vue';

// Back link from a demo view to the gallery landing page.
interface Props {
  onBackToDemos: () => void;
}

const props = defineProps<Props>();
</script>

<template>
  <button type="button" class="btn btn-secondary mochart-demo-back-button"
          :title="demoText.backToDemos.tooltip" :aria-label="demoText.backToDemos.aria"
          @click="props.onBackToDemos()">
    <Icon name="chevron-left" /> {{ demoText.backToDemos.label }}
  </button>
</template>
