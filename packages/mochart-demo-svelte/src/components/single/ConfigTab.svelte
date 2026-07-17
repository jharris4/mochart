<script lang="ts">
  import { untrack } from 'svelte';

  import buildMochartDemoConfig from '../../config/mochartDemoConfig';

  import TextAreaContent from '../misc/TextAreaContent.svelte';
  import ButtonWithTooltip from '../misc/ButtonWithTooltip.svelte';
  import Icon from '../misc/Icon.svelte';

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

  let { active = false, config, onConfigChange, onConfigReset }: Props = $props();

  let showDefaults = $state(false);
  let mochartDemoConfig = $state.raw(buildMochartDemoConfig(config));
  let demoConfig = $state.raw(copyDemoConfig(mochartDemoConfig));
  let configText = $state(formatMochartDemoConfig(demoConfig, false));

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
      console.warn('Invalid Chart Config JSON: ' + configText);
      alert('Invalid Chart Config JSON');
    }
  }

  function toggleConfigDefaults() {
    updateShowDefaults(!showDefaults);
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

  const inverted = $derived(demoConfig.configWithDefaults.plotConfig.inverted);
  const invertedIcon = $derived(inverted ? 'caret-square-o-up' : 'caret-square-o-right');
  const slowIcon = $derived(demoConfig.configWithDefaults.animationConfig === slowAnimationConfig ? 'hourglass' : 'hourglass-end');
</script>

<div class={"mochart-demo-tab-container col config" + (active ? " active" : "")}>
  <div class="mochart-demo-tab-content">
    <TextAreaContent value={configText} onChange={onTextChange} />
  </div>
  <div class="mochart-demo-tab-footer">
    <div class="btn-toolbar" role="toolbar">
      <ButtonWithTooltip id="config-reset" tooltipText="Reset" tooltipPlacement="top-start"
                         onClick={resetConfig} aria-label="Reset">
        <Icon size="lg" fixedWidth={true} name="undo" />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="config-defaults" tooltipText="Toggle Defaults" tooltipPlacement="top-start"
                         onClick={toggleConfigDefaults} aria-label="Toggle Defaults">
        <Icon size="lg" fixedWidth={true} name="crosshairs" />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="config-inverted" tooltipText="Toggle Inverted" tooltipPlacement="top-start"
                         onClick={toggleConfigInverted} aria-label="Toggle Inverted">
        <Icon size="lg" fixedWidth={true} name={invertedIcon} />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="config-animate-slow" tooltipText="Toggle Slow" tooltipPlacement="top-start"
                         onClick={toggleConfigAnimationSlow} aria-label="Toggle Slow">
        <Icon size="lg" fixedWidth={true} name={slowIcon} />
      </ButtonWithTooltip>
      <ButtonWithTooltip id="config-apply" tooltipText="Apply" tooltipPlacement="top-start"
                         onClick={applyConfig} aria-label="Apply">
        <Icon size="lg" fixedWidth={true} name="check" />
      </ButtonWithTooltip>
    </div>
  </div>
</div>
