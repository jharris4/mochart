<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import TextAreaContent from '../misc/TextAreaContent.vue';
import ButtonWithTooltip from '../misc/ButtonWithTooltip.vue';
import Icon from '../misc/Icon.vue';

import type { DemoConfig, MochartDemoConfig } from '../../types';

interface Props {
  active?: boolean;
  config: DemoConfig;
  onConfigChange: (config: DemoConfig) => void;
  onConfigReset: () => void;
}

// The with/without-defaults config views the editor toggles between. Config
// sections are intentionally loose (`any`) — they are arbitrary user JSON.
interface DemoConfigView {
  configWithDefaults: Record<string, any>;
  configWithoutDefaults: Record<string, any>;
}

const slowAnimationConfig = {
  "animate": true,
  "initialDuration": 5000,
  "expansionDuration": 3000,
  "valueChangeDuration": 5000,
  "collapseDuration": 3000,
  "focusDuration": 2500
};

function formatConfig(config: unknown): string {
  return JSON.stringify(config, null, '\t');
}

function formatMochartDemoConfig(demoConfig: DemoConfigView, showDefaults: boolean): string {
  const { configWithDefaults, configWithoutDefaults } = demoConfig;
  return formatConfig(showDefaults ? configWithDefaults : configWithoutDefaults);
}

function copyDemoConfig(demoConfig: DemoConfigView | MochartDemoConfig): DemoConfigView {
  const { configWithDefaults, configWithoutDefaults } = demoConfig;
  return JSON.parse(JSON.stringify({ configWithDefaults, configWithoutDefaults }));
}

function parseConfig(configText: string): DemoConfig | null {
  try {
    return JSON.parse(configText);
  }
  catch (error) {
    console.warn('Invalid Chart Config JSON: ' + configText);
    alert('Invalid Chart Config JSON');
    return null;
  }
}

const props = withDefaults(defineProps<Props>(), {
  active: false
});

const showDefaults = ref(false);
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
    }
    else {
      const { errors, warnings } = configValidation;
      if (errors.length > 0) {
        console.warn('errors: ', errors);
      }
      if (warnings.length > 0) {
        console.warn('warnings: ', warnings);
      }
      alert('Invalid Chart Config');
    }
  }
  catch (error) {
    console.log('**** error', error);
    console.warn('Invalid Chart Config JSON: ' + configText.value);
    alert('Invalid Chart Config JSON');
  }
}

function toggleConfigDefaults() {
  updateShowDefaults(!showDefaults.value);
}

function toggleConfigProperty(currentDemoConfig: DemoConfigView | undefined, section: string, key: string, defaultValue: unknown): DemoConfigView | undefined {
  if (currentDemoConfig) {
    let { configWithDefaults, configWithoutDefaults } = currentDemoConfig;
    configWithDefaults = { ...configWithDefaults };
    configWithoutDefaults = { ...configWithoutDefaults };
    const sectionConfig = configWithoutDefaults[section];
    if (!sectionConfig) {
      configWithoutDefaults[section] = { [key]: defaultValue };
      configWithDefaults[section] = { ...configWithDefaults[section], [key]: defaultValue };
    }
    else {
      configWithoutDefaults[section] = { ...sectionConfig, [key]: !sectionConfig[key] };
      configWithDefaults[section] = { ...configWithDefaults[section], [key]: !sectionConfig[key] };
    }
    return {
      configWithDefaults, configWithoutDefaults
    };
  }
}

function toggleConfigSection(currentMochartDemoConfig: MochartDemoConfig, currentDemoConfig: DemoConfigView | undefined, section: string, defaultSection: unknown): DemoConfigView | undefined {
  if (currentMochartDemoConfig && currentDemoConfig) {
    let { configWithDefaults, configWithoutDefaults } = currentDemoConfig;
    configWithDefaults = { ...configWithDefaults };
    configWithoutDefaults = { ...configWithoutDefaults };
    const sectionConfig = configWithoutDefaults[section];
    if (!sectionConfig) {
      configWithoutDefaults[section] = defaultSection;
      configWithDefaults[section] = defaultSection;
    }
    else {
      configWithoutDefaults[section] = configWithoutDefaults[section] === defaultSection ? currentMochartDemoConfig.configWithoutDefaults[section] : defaultSection;
      configWithDefaults[section] = configWithDefaults[section] === defaultSection ? currentMochartDemoConfig.configWithDefaults[section] : defaultSection;
    }
    return {
      configWithDefaults, configWithoutDefaults
    };
  }
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
const invertedIcon = computed(() => inverted.value ? 'caret-square-o-up' : 'caret-square-o-right');
const slowIcon = computed(() => demoConfig.value.configWithDefaults.animationConfig === slowAnimationConfig ? 'hourglass' : 'hourglass-end');
</script>

<template>
  <div :class="'mochart-demo-tab-container col config' + (props.active ? ' active' : '')">
    <div class="mochart-demo-tab-content">
      <TextAreaContent :value="configText" :on-change="onTextChange" />
    </div>
    <div class="mochart-demo-tab-footer">
      <div class="btn-toolbar" role="toolbar">
        <ButtonWithTooltip id="config-reset" tooltip-text="Reset" tooltip-placement="top-start"
                           :on-click="resetConfig" aria-label="Reset">
          <Icon size="lg" :fixed-width="true" name="undo" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="config-defaults" tooltip-text="Toggle Defaults" tooltip-placement="top-start"
                           :on-click="toggleConfigDefaults" aria-label="Toggle Defaults">
          <Icon size="lg" :fixed-width="true" name="crosshairs" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="config-inverted" tooltip-text="Toggle Inverted" tooltip-placement="top-start"
                           :on-click="toggleConfigInverted" aria-label="Toggle Inverted">
          <Icon size="lg" :fixed-width="true" :name="invertedIcon" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="config-animate-slow" tooltip-text="Toggle Slow" tooltip-placement="top-start"
                           :on-click="toggleConfigAnimationSlow" aria-label="Toggle Slow">
          <Icon size="lg" :fixed-width="true" :name="slowIcon" />
        </ButtonWithTooltip>
        <ButtonWithTooltip id="config-apply" tooltip-text="Apply" tooltip-placement="top-start"
                           :on-click="applyConfig" aria-label="Apply">
          <Icon size="lg" :fixed-width="true" name="check" />
        </ButtonWithTooltip>
      </div>
    </div>
  </div>
</template>
