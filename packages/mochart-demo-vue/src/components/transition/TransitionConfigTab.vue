<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { applyTransitionConfigEdit, buildMochartDemoConfig, formatTransitionConfig } from '@mochart/demo-common';

import TextAreaContent from '../misc/TextAreaContent.vue';
import ButtonWithTooltip from '../misc/ButtonWithTooltip.vue';
import Icon from '../misc/Icon.vue';

import type { TransitionConfig } from '../../types';

interface Props {
  active?: boolean;
  transitionConfig: TransitionConfig;
  onUpdate: (config: TransitionConfig) => void;
  onReset: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  active: false
});

const configText = ref(formatTransitionConfig(props.transitionConfig));
const errorMessage = ref<string | null>(null);

watch(() => props.transitionConfig, (nextTransitionConfig) => {
  configText.value = formatTransitionConfig(nextTransitionConfig);
});

function onTextChange(nextConfigText: string) {
  configText.value = nextConfigText;
  errorMessage.value = null;
}

function onUpdateClick() {
  const result = applyTransitionConfigEdit(configText.value);
  if (result.ok) {
    errorMessage.value = null;
    props.onUpdate(result.config);
  }
  else {
    errorMessage.value = result.errorMessage;
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
        <ButtonWithTooltip id="config-reset" label="Reset" tooltip-text="Restore the original transition config" tooltip-placement="top-start"
                           :on-click="props.onReset" aria-label="Reset">
          <Icon size="lg" :fixed-width="true" name="arrow-rotate-left" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="config-apply" label="Apply" :disabled="jsonError !== null"
                           tooltip-text="Apply this config to the transition charts" tooltip-placement="top-start"
                           :on-click="onUpdateClick" aria-label="Apply">
          <Icon size="lg" :fixed-width="true" name="check" />
        </ButtonWithTooltip>
        <span v-if="footerError" class="mochart-demo-footer-error" role="alert">{{ footerError }}</span>
      </div>
    </div>
  </div>
</template>
