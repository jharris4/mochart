<script setup lang="ts">
import { demoText, formatData } from '@mochart/demo-common';

import { ref, watch } from 'vue';

import JsonEditorContent from '../misc/JsonEditorContent.vue';

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
  <div :class="'mochart-demo-tab-container demo-layout-col data' + (props.active ? ' active' : '')" :inert="!props.active">
    <div class="mochart-demo-tab-content">
      <JsonEditorContent :value="dataText" :ariaLabel="demoText.randomDataTab.editorAria" :read-only="true" />
    </div>
  </div>
</template>
