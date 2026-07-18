<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import validators from '@mochart/movalid';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

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

const objectValidator = validators.object();
const arrayValidator = validators.array();

function formatConfig(transitionConfig: TransitionConfig): string {
  if (transitionConfig && objectValidator(transitionConfig)) {
    let configText = '{}';
    let dataText = '[]';
    if (transitionConfig.config && objectValidator(transitionConfig.config)) {
      configText = JSON.stringify(transitionConfig.config, null, '\t');
      configText = configText.replace(/\n\t/g, '\n\t\t');
      configText = configText.replace(/\n}/g, '\n\t}');
    }
    if (transitionConfig.data && arrayValidator(transitionConfig.data)) {
      const dataArray = transitionConfig.data;
      const dataTexts: string[] = [];
      let aDataText: string;
      for (const data of dataArray) {
        if (data && arrayValidator(data)) {
          aDataText = JSON.stringify(data).replace(/},{/g, '},\n\t\t\t{').replace(/,/g, ', ');
          aDataText = aDataText.replace(/\[{/, '[\n\t\t\t{');
          aDataText = aDataText.replace(/}\]/, '}\n\t\t]');
          dataTexts.push(aDataText);
        }
      }
      dataText = '[\n\t\t' + dataTexts.join(',\n\t\t') + '\n\t]';
    }
    return '{\n' + '\t"config": ' + configText + ',\n\t"data": ' + dataText + '\n}';
  }
  else {
    return String(transitionConfig);
  }
}

const props = withDefaults(defineProps<Props>(), {
  active: false
});

const configText = ref(formatConfig(props.transitionConfig));
const errorMessage = ref<string | null>(null);

watch(() => props.transitionConfig, (nextTransitionConfig) => {
  configText.value = formatConfig(nextTransitionConfig);
});

function onTextChange(nextConfigText: string) {
  configText.value = nextConfigText;
  errorMessage.value = null;
}

function onUpdateClick() {
  try {
    const newConfig = JSON.parse(configText.value);
    if (objectValidator(newConfig)) {
      if (objectValidator(newConfig.config)) {
        const mochartDemoConfig = buildMochartDemoConfig(newConfig.config);
        const { configValidation } = mochartDemoConfig;
        const { valid, errors, warnings } = configValidation;
        if (valid) {
          if (arrayValidator(newConfig.data) && !newConfig.data.some((aData: unknown) => !arrayValidator(aData))) {
            errorMessage.value = null;
            props.onUpdate(newConfig);
          }
          else {
            console.warn('Invalid Transition Config, data should be an array of arrays: ', newConfig.data);
            errorMessage.value = '"data" should be an array of arrays';
          }
        }
        else {
          if (errors.length > 0) {
            console.warn('errors: ', errors);
          }
          if (warnings.length > 0) {
            console.warn('warnings: ', warnings);
          }
          errorMessage.value = 'Invalid chart config — details in the browser console';
        }
      }
      else {
        console.warn('Invalid Transition Config, config should be an object: ', newConfig.config);
        errorMessage.value = '"config" should be an object';
      }
    }
    else {
      console.warn('Invalid Transition Config, should be an object: ', configText.value);
      errorMessage.value = 'Transition config should be an object';
    }
  }
  catch (error) {
    console.warn('Invalid Transition Config JSON: ', configText.value);
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
