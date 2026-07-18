<script lang="ts">
  import { untrack } from 'svelte';

  import { buildMochartDemoConfig, copyDemoConfig, demoText, formatMochartDemoConfig, parseConfig, slowAnimationConfig, toggleConfigProperty, toggleConfigSection } from '@mochart/demo-common';

  import TextAreaContent from '../misc/TextAreaContent.svelte';
  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import DocsLinks from '../misc/DocsLinks.svelte';
  import Icon from '../misc/Icon.svelte';

  import type { DemoConfig } from '../../types';

  interface Props {
    active?: boolean;
    config: DemoConfig;
    onConfigChange: (config: DemoConfig) => void;
    onConfigReset: () => void;
  }

  // The with/without-defaults config views the editor toggles between. Config
  // sections are intentionally loose (`any`) — they are arbitrary user JSON.
  let { active = false, config, onConfigChange, onConfigReset }: Props = $props();

  let showDefaults = $state(false);
  let errorMessage = $state<string | null>(null);
  // Props intentionally seed local state with their initial value only; the
  // $effect.pre below re-syncs on later prop changes.
  // svelte-ignore state_referenced_locally
  let mochartDemoConfig = $state.raw(buildMochartDemoConfig(config));
  // svelte-ignore state_referenced_locally
  let demoConfig = $state.raw(copyDemoConfig(mochartDemoConfig));
  // svelte-ignore state_referenced_locally
  let configText = $state(formatMochartDemoConfig(demoConfig, false));

  // svelte-ignore state_referenced_locally
  let previousConfig = config;
  $effect.pre(() => {
    const nextConfig = config;
    untrack(() => {
      if (nextConfig !== previousConfig) {
        previousConfig = nextConfig;
        mochartDemoConfig = buildMochartDemoConfig(nextConfig);
        demoConfig = copyDemoConfig(mochartDemoConfig);
        configText = formatMochartDemoConfig(demoConfig, showDefaults);
      }
    });
  });

  function onTextChange(nextConfigText: string) {
    configText = nextConfigText;
    errorMessage = null;
  }

  function resetConfig() {
    onConfigReset();
  }

  function updateShowDefaults(nextShowDefaults: boolean) {
    try {
      const newConfig = JSON.parse(configText);
      const newMochartDemoConfig = buildMochartDemoConfig(newConfig);
      const { configValidation } = newMochartDemoConfig;
      const { valid } = configValidation;
      if (valid) {
        showDefaults = nextShowDefaults;
        configText = formatMochartDemoConfig(newMochartDemoConfig, nextShowDefaults);
        errorMessage = null;
      }
      else {
        const { errors, warnings } = configValidation;
        if (errors.length > 0) {
          console.warn('errors: ', errors);
        }
        if (warnings.length > 0) {
          console.warn('warnings: ', warnings);
        }
        errorMessage = demoText.errors.invalidChartConfig;
      }
    }
    catch (error) {
      console.warn('Invalid Chart Config JSON: ' + configText);
      errorMessage = demoText.errors.invalidJson;
    }
  }

  function toggleConfigDefaults() {
    updateShowDefaults(!showDefaults);
  }

  function toggleConfigInverted() {
    demoConfig = toggleConfigProperty(demoConfig, 'plotConfig', 'inverted', true) ?? demoConfig;
    configText = formatMochartDemoConfig(demoConfig, showDefaults);
  }

  function toggleConfigAnimationSlow() {
    demoConfig = toggleConfigSection(mochartDemoConfig, demoConfig, 'animationConfig', slowAnimationConfig) ?? demoConfig;
    configText = formatMochartDemoConfig(demoConfig, showDefaults);
  }

  function applyConfig() {
    const newConfig = parseConfig(configText);
    if (newConfig !== null) {
      onConfigChange(newConfig);
    }
  }

  // Live JSON validity — disables Apply and shows an inline hint while the
  // editor holds unparseable text.
  const jsonError = $derived.by(() => {
    try {
      JSON.parse(configText);
      return null;
    }
    catch (error) {
      return demoText.errors.invalidJson;
    }
  });
  const footerError = $derived(jsonError ?? errorMessage);

  const inverted = $derived(demoConfig.configWithDefaults.plotConfig.inverted);
  const invertedIcon = $derived(inverted ? 'chart-bar' : 'chart-column');
  const slow = $derived(demoConfig.configWithDefaults.animationConfig === slowAnimationConfig);
  const slowIcon = $derived(slow ? 'hourglass' : 'hourglass-end');
</script>

<div class={"mochart-demo-tab-container col config" + (active ? " active" : "")}>
  <div class="mochart-demo-tab-content">
    <TextAreaContent value={configText} onChange={onTextChange} />
  </div>
  <div class="mochart-demo-tab-footer">
    <div class="btn-toolbar" role="toolbar">
      <ButtonWithTooltip id="config-reset" label={demoText.configTab.reset.label} tooltipText={demoText.configTab.reset.tooltip} tooltipPlacement="top-start"
                         onClick={resetConfig} aria-label={demoText.configTab.reset.aria}>
        <Icon size="lg" fixedWidth={true} name="arrow-rotate-left" />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="config-defaults" label={demoText.configTab.defaults.label} pressed={showDefaults}
                         tooltipText={demoText.configTab.defaults.tooltip} tooltipPlacement="top-start"
                         onClick={toggleConfigDefaults} aria-label={demoText.configTab.defaults.aria}>
        <Icon size="lg" fixedWidth={true} name={showDefaults ? 'eye' : 'eye-slash'} />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="config-inverted" label={demoText.configTab.invert.label} pressed={inverted}
                         tooltipText={demoText.configTab.invert.tooltip} tooltipPlacement="top-start"
                         onClick={toggleConfigInverted} aria-label={demoText.configTab.invert.aria}>
        <Icon size="lg" fixedWidth={true} name={invertedIcon} />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="config-animate-slow" label={demoText.configTab.slow.label} pressed={slow}
                         tooltipText={demoText.configTab.slow.tooltip} tooltipPlacement="top-start"
                         onClick={toggleConfigAnimationSlow} aria-label={demoText.configTab.slow.aria}>
        <Icon size="lg" fixedWidth={true} name={slowIcon} />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="config-apply" label={demoText.configTab.apply.label} disabled={jsonError !== null}
                         tooltipText={demoText.configTab.apply.tooltip} tooltipPlacement="top-start"
                         onClick={applyConfig} aria-label={demoText.configTab.apply.aria}>
        <Icon size="lg" fixedWidth={true} name="check" />
      </ButtonWithTooltip>
      {#if footerError}
        <span class="mochart-demo-footer-error" role="alert">{footerError}</span>
      {/if}
    </div>
    <DocsLinks config={demoConfig.configWithoutDefaults} />
  </div>
</div>
