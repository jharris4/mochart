<script setup lang="ts">
import { computed, h, ref, shallowRef, watch } from 'vue';

import { buildMochartDemoConfig, copyDemoConfig, demoText, formatMochartDemoConfig, getReferenceSectionIds, isConfigSectionActive, parseConfig, slowAnimationConfig, toggleConfigProperty, toggleConfigSection } from '@mochart/demo-common';

import TextAreaContent from '../misc/TextAreaContent.vue';
import ButtonWithTooltip from '../misc/ButtonWithTooltip.vue';
import DocsLinks from '../misc/DocsLinks.vue';
import Icon from '../misc/Icon.vue';
import OverflowMenu from '../misc/OverflowMenu.vue';
import { usePhoneViewport } from '../misc/usePhoneViewport';

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
  catch {
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
const slow = computed(() => isConfigSectionActive(demoConfig.value, 'animationConfig', slowAnimationConfig));
const slowIcon = computed(() => slow.value ? 'hourglass' : 'hourglass-end');

// Live JSON validity — disables Apply and shows an inline hint while the
// editor holds unparseable text.
const jsonError = computed(() => {
  try {
    JSON.parse(configText.value);
    return null;
  }
  catch {
    return demoText.errors.invalidJson;
  }
});
const footerError = computed(() => jsonError.value ?? errorMessage.value);

// ---------------------------------------------------------------------------
// The phone fold. Apply stays beside the editor it applies, and the
// `role="alert"` error span stays inline — a message that has to be read
// cannot live behind a tap. Everything else, including the reference links,
// goes to the `⋯` menu. Each foldable control is a functional component
// rendered in exactly one of the two places (see OverflowMenu.vue).
// ---------------------------------------------------------------------------
const isPhone = usePhoneViewport();
const hasDocsLinks = computed(() => getReferenceSectionIds(demoConfig.value.configWithoutDefaults).length > 0);
const footerElement = ref<HTMLElement | null>(null);
const getFooterAnchor = () => footerElement.value;

const iconChild = (name: string) => () => h(Icon, { size: 'lg', fixedWidth: true, name });

const ResetButton = () => h(ButtonWithTooltip, {
  id: 'config-reset', label: demoText.configTab.reset.label, tooltipText: demoText.configTab.reset.tooltip,
  tooltipPlacement: 'top-start', onClick: resetConfig, 'aria-label': demoText.configTab.reset.aria
}, iconChild('arrow-rotate-left'));

const DefaultsButton = () => h(ButtonWithTooltip, {
  id: 'config-defaults', label: demoText.configTab.defaults.label, pressed: showDefaults.value,
  tooltipText: demoText.configTab.defaults.tooltip, tooltipPlacement: 'top-start',
  onClick: toggleConfigDefaults, 'aria-label': demoText.configTab.defaults.aria
}, iconChild(showDefaults.value ? 'eye' : 'eye-slash'));

const InvertedButton = () => h(ButtonWithTooltip, {
  id: 'config-inverted', label: demoText.configTab.invert.label, pressed: !!inverted.value,
  tooltipText: demoText.configTab.invert.tooltip, tooltipPlacement: 'top-start',
  onClick: toggleConfigInverted, 'aria-label': demoText.configTab.invert.aria
}, iconChild(invertedIcon.value));

const SlowButton = () => h(ButtonWithTooltip, {
  id: 'config-animate-slow', label: demoText.configTab.slow.label, pressed: slow.value,
  tooltipText: demoText.configTab.slow.tooltip, tooltipPlacement: 'top-start',
  onClick: toggleConfigAnimationSlow, 'aria-label': demoText.configTab.slow.aria
}, iconChild(slowIcon.value));

const ApplyButton = () => h(ButtonWithTooltip, {
  id: 'config-apply', label: demoText.configTab.apply.label, disabled: jsonError.value !== null,
  tooltipText: demoText.configTab.apply.tooltip, tooltipPlacement: 'top-start',
  onClick: applyConfig, 'aria-label': demoText.configTab.apply.aria
}, iconChild('check'));
</script>

<template>
  <div :class="'mochart-demo-tab-container demo-layout-col config' + (props.active ? ' active' : '')" :inert="!props.active">
    <div class="mochart-demo-tab-content">
      <TextAreaContent :value="configText" :on-change="onTextChange" />
    </div>
    <div class="mochart-demo-tab-footer" ref="footerElement">
      <div class="demo-toolbar" role="toolbar">
        <template v-if="isPhone">
          <ApplyButton />
          <!-- `.editor`, not `.chart`: what folds here edits the JSON, and
               "more chart controls" would tell a screen-reader user the wrong
               thing. Anchored to the full-width footer — the trigger sits
               mid-row, left of an error span that comes and goes. -->
          <OverflowMenu :text="demoText.overflowMenu.editor"
                        :placement="{ side: 'top', align: 'end', gap: 4 }"
                        :get-anchor="getFooterAnchor"
                        :active="props.active">
            <div class="demo-btn-group"><ResetButton /><DefaultsButton /><InvertedButton /><SlowButton /></div>
            <template v-if="hasDocsLinks">
              <div class="demo-menu-divider"></div>
              <DocsLinks :config="demoConfig.configWithoutDefaults" />
            </template>
          </OverflowMenu>
        </template>
        <template v-else>
          <ResetButton />
          <DefaultsButton />
          <InvertedButton />
          <SlowButton />
          <ApplyButton />
        </template>
        <span v-if="footerError" class="mochart-demo-footer-error" role="alert">{{ footerError }}</span>
      </div>
      <DocsLinks v-if="!isPhone" :config="demoConfig.configWithoutDefaults" />
    </div>
  </div>
</template>
