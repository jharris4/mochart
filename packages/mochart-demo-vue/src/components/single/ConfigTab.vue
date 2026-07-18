<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';

import { buildMochartDemoConfig, copyDemoConfig, demoText, formatMochartDemoConfig, parseConfig, slowAnimationConfig, toggleConfigProperty, toggleConfigSection } from '@mochart/demo-common';

import TextAreaContent from '../misc/TextAreaContent.vue';
import ButtonWithTooltip from '../misc/ButtonWithTooltip.vue';
import DocsLinks from '../misc/DocsLinks.vue';
import Icon from '../misc/Icon.vue';

import type { DemoConfig } from '../../types';

interface Props {
  active?: boolean;
  config: DemoConfig;
  onConfigChange: (config: DemoConfig) => void;
  onConfigReset: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  active: false
});

const showDefaults = ref(false);
const errorMessage = ref<string | null>(null);
const mochartDemoConfig = shallowRef(buildMochartDemoConfig(props.config));
const demoConfig = shallowRef(copyDemoConfig(mochartDemoConfig.value));
const configText = ref(formatMochartDemoConfig(demoConfig.value, false));

watch(() => props.config, (nextConfig) => {
  mochartDemoConfig.value = buildMochartDemoConfig(nextConfig);
  demoConfig.value = copyDemoConfig(mochartDemoConfig.value);
  configText.value = formatMochartDemoConfig(demoConfig.value, showDefaults.value);
});

function onTextChange(nextConfigText: string) {
  configText.value = nextConfigText;
  errorMessage.value = null;
}

function resetConfig() {
  props.onConfigReset();
}

function updateShowDefaults(nextShowDefaults: boolean) {
  try {
    const newConfig = JSON.parse(configText.value);
    const newMochartDemoConfig = buildMochartDemoConfig(newConfig);
    const { configValidation } = newMochartDemoConfig;
    const { valid } = configValidation;
    if (valid) {
      showDefaults.value = nextShowDefaults;
      configText.value = formatMochartDemoConfig(newMochartDemoConfig, nextShowDefaults);
      errorMessage.value = null;
    }
    else {
      const { errors, warnings } = configValidation;
      if (errors.length > 0) {
        console.warn('errors: ', errors);
      }
      if (warnings.length > 0) {
        console.warn('warnings: ', warnings);
      }
      errorMessage.value = demoText.errors.invalidChartConfig;
    }
  }
  catch (error) {
    console.warn('Invalid Chart Config JSON: ' + configText.value);
    errorMessage.value = demoText.errors.invalidJson;
  }
}

function toggleConfigDefaults() {
  updateShowDefaults(!showDefaults.value);
}

function toggleConfigInverted() {
  demoConfig.value = toggleConfigProperty(demoConfig.value, 'plotConfig', 'inverted', true) ?? demoConfig.value;
  configText.value = formatMochartDemoConfig(demoConfig.value, showDefaults.value);
}

function toggleConfigAnimationSlow() {
  demoConfig.value = toggleConfigSection(mochartDemoConfig.value, demoConfig.value, 'animationConfig', slowAnimationConfig) ?? demoConfig.value;
  configText.value = formatMochartDemoConfig(demoConfig.value, showDefaults.value);
}

function applyConfig() {
  const newConfig = parseConfig(configText.value);
  if (newConfig !== null) {
    props.onConfigChange(newConfig);
  }
}

const inverted = computed(() => demoConfig.value.configWithDefaults.plotConfig.inverted);
const invertedIcon = computed(() => inverted.value ? 'chart-bar' : 'chart-column');
const slow = computed(() => demoConfig.value.configWithDefaults.animationConfig === slowAnimationConfig);
const slowIcon = computed(() => slow.value ? 'hourglass' : 'hourglass-end');

// Live JSON validity — disables Apply and shows an inline hint while the
// editor holds unparseable text.
const jsonError = computed(() => {
  try {
    JSON.parse(configText.value);
    return null;
  }
  catch (error) {
    return demoText.errors.invalidJson;
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
        <ButtonWithTooltip id="config-reset" :label="demoText.configTab.reset.label" :tooltip-text="demoText.configTab.reset.tooltip" tooltip-placement="top-start"
                           :on-click="resetConfig" :aria-label="demoText.configTab.reset.aria">
          <Icon size="lg" :fixed-width="true" name="arrow-rotate-left" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="config-defaults" :label="demoText.configTab.defaults.label" :pressed="showDefaults"
                           :tooltip-text="demoText.configTab.defaults.tooltip" tooltip-placement="top-start"
                           :on-click="toggleConfigDefaults" :aria-label="demoText.configTab.defaults.aria">
          <Icon size="lg" :fixed-width="true" :name="showDefaults ? 'eye' : 'eye-slash'" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="config-inverted" :label="demoText.configTab.invert.label" :pressed="!!inverted"
                           :tooltip-text="demoText.configTab.invert.tooltip" tooltip-placement="top-start"
                           :on-click="toggleConfigInverted" :aria-label="demoText.configTab.invert.aria">
          <Icon size="lg" :fixed-width="true" :name="invertedIcon" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="config-animate-slow" :label="demoText.configTab.slow.label" :pressed="slow"
                           :tooltip-text="demoText.configTab.slow.tooltip" tooltip-placement="top-start"
                           :on-click="toggleConfigAnimationSlow" :aria-label="demoText.configTab.slow.aria">
          <Icon size="lg" :fixed-width="true" :name="slowIcon" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="config-apply" :label="demoText.configTab.apply.label" :disabled="jsonError !== null"
                           :tooltip-text="demoText.configTab.apply.tooltip" tooltip-placement="top-start"
                           :on-click="applyConfig" :aria-label="demoText.configTab.apply.aria">
          <Icon size="lg" :fixed-width="true" name="check" />
        </ButtonWithTooltip>
        <span v-if="footerError" class="mochart-demo-footer-error" role="alert">{{ footerError }}</span>
      </div>
      <DocsLinks :config="demoConfig.configWithoutDefaults" />
    </div>
  </div>
</template>
