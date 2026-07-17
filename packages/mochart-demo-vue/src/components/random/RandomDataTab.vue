<script setup lang="ts">
import { ref, watch } from 'vue';

import TextAreaContent from '../misc/TextAreaContent.vue';

interface Props {
  active?: boolean;
  data: unknown;
}

function formatData(dataJSON: unknown): string {
  return JSON.stringify(dataJSON).replace(/,/g, ', ').replace(/},/g, '},\n');
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
