<script setup lang="ts">
import { formatData } from '@mochart/demo-common';

import { ref, watch } from 'vue';

import TextAreaContent from '../misc/TextAreaContent.vue';

interface Props {
  active?: boolean;
  data: unknown;
}

const props = withDefaults(defineProps<Props>(), {
  active: false
});

const dataText = ref(formatData(props.data));

watch(() => props.data, (nextData) => {
  dataText.value = formatData(nextData);
});
</script>

<template>
  <div :class="'mochart-demo-tab-container col data' + (props.active ? ' active' : '')">
    <div class="mochart-demo-tab-content">
      <TextAreaContent :value="dataText" :on-change="() => {}" />
    </div>
  </div>
</template>
