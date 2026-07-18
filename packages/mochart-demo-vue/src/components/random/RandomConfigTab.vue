<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import TextAreaContent from '../misc/TextAreaContent.vue';
import ButtonWithTooltip from '../misc/ButtonWithTooltip.vue';
import Icon from '../misc/Icon.vue';

import { formatRandomConfig, validateRandomConfig } from '@mochart/demo-common';

import type { RandomConfigWithValid } from '../../types';

interface Props {
  active?: boolean;
  randomConfig: RandomConfigWithValid;
  onUpdate: (config: RandomConfigWithValid) => void;
  onReset: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  active: false
});

const configText = ref(formatRandomConfig(props.randomConfig));
const errorMessage = ref<string | null>(null);

watch(() => props.randomConfig, (nextRandomConfig) => {
  configText.value = formatRandomConfig(nextRandomConfig);
});

function onTextChange(nextConfigText: string) {
  configText.value = nextConfigText;
  errorMessage.value = null;
}

function onUpdateClick() {
  try {
    const newConfig = JSON.parse(configText.value);
    newConfig.valid = validateRandomConfig(newConfig);
    errorMessage.value = newConfig.valid ? null : 'Config has invalid values — details in the browser console';
    props.onUpdate(newConfig);
  }
  catch (error) {
    console.warn('Invalid Random Config JSON: ' + configText.value);
    errorMessage.value = 'Invalid JSON';
  }
}

const jsonError = computed(() => {
  try {
    JSON.parse(configText.value);
    return null;
  }
  catch (error) {
    return 'Invalid JSON';
  }
});
const footerError = computed(() => jsonError.value ?? errorMessage.value);
</script>

<template>
  <div :class="'mochart-demo-tab-container col config' + (props.active ? ' active' : '')">
    <div class="mochart-demo-tab-content">
      <TextAreaContent :value="configText" :on-change="onTextChange" />
    </div>
    <div class="mochart-demo-tab-footer">
      <div class="btn-toolbar" role="toolbar">
        <ButtonWithTooltip id="config-reset" label="Reset" tooltip-text="Restore the original random generator config" tooltip-placement="top-start"
                           :on-click="props.onReset" aria-label="Reset">
          <Icon size="lg" :fixed-width="true" name="arrow-rotate-left" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="config-apply" label="Apply" :disabled="jsonError !== null"
                           tooltip-text="Apply this generator config to the random chart" tooltip-placement="top-start"
                           :on-click="onUpdateClick" aria-label="Apply">
          <Icon size="lg" :fixed-width="true" name="check" />
        </ButtonWithTooltip>
        <span v-if="footerError" class="mochart-demo-footer-error" role="alert">{{ footerError }}</span>
      </div>
    </div>
  </div>
</template>
