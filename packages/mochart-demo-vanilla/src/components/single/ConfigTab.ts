import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import { buttonWithTooltip, el, icon, setActiveClass, textAreaContent } from '../misc/dom';

import type { DemoConfig, MochartDemoConfig } from '../../types';

export interface ConfigTabProps {
  active?: boolean;
  config: DemoConfig;
  onConfigChange: (config: DemoConfig) => void;
  onConfigReset: () => void;
}

export interface ConfigTabHandle {
  el: HTMLElement;
  setActive(active: boolean): void;
  setConfig(config: DemoConfig): void;
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
    return null;
  }
}

export function configTab(props: ConfigTabProps): ConfigTabHandle {
  const { onConfigChange, onConfigReset } = props;

  let config = props.config;
  let showDefaults = false;
  let errorMessage: string | null = null;
  let mochartDemoConfig = buildMochartDemoConfig(config);
  let demoConfig = copyDemoConfig(mochartDemoConfig);

  const textArea = textAreaContent(formatMochartDemoConfig(demoConfig, false), onTextChange);

  function getConfigText(): string {
    return textArea.getValue();
  }

  function jsonError(): string | null {
    try {
      JSON.parse(getConfigText());
      return null;
    }
    catch (error) {
      return 'Invalid JSON';
    }
  }

  function onTextChange(): void {
    errorMessage = null;
    sync();
  }

  function updateShowDefaults(nextShowDefaults: boolean): void {
    try {
      const newConfig = JSON.parse(getConfigText());
      const newMochartDemoConfig = buildMochartDemoConfig(newConfig);
      const { configValidation } = newMochartDemoConfig;
      const { valid } = configValidation;
      if (valid) {
        showDefaults = nextShowDefaults;
        textArea.setValue(formatMochartDemoConfig(newMochartDemoConfig, nextShowDefaults));
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
        errorMessage = 'Invalid chart config — details in the browser console';
      }
    }
    catch (error) {
      console.warn('Invalid Chart Config JSON: ' + getConfigText());
      errorMessage = 'Invalid JSON';
    }
    sync();
  }

  function toggleConfigProperty(currentDemoConfig: DemoConfigView, section: string, key: string, defaultValue: unknown): DemoConfigView {
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
    return { configWithDefaults, configWithoutDefaults };
  }

  function toggleConfigSection(currentMochartDemoConfig: MochartDemoConfig, currentDemoConfig: DemoConfigView, section: string, defaultSection: unknown): DemoConfigView {
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
    return { configWithDefaults, configWithoutDefaults };
  }

  function toggleConfigInverted(): void {
    demoConfig = toggleConfigProperty(demoConfig, 'plotConfig', 'inverted', true);
    textArea.setValue(formatMochartDemoConfig(demoConfig, showDefaults));
    sync();
  }

  function toggleConfigAnimationSlow(): void {
    demoConfig = toggleConfigSection(mochartDemoConfig, demoConfig, 'animationConfig', slowAnimationConfig);
    textArea.setValue(formatMochartDemoConfig(demoConfig, showDefaults));
    sync();
  }

  function applyConfig(): void {
    const newConfig = parseConfig(getConfigText());
    if (newConfig !== null) {
      onConfigChange(newConfig);
    }
  }

  const resetButton = buttonWithTooltip({
    id: 'config-reset', label: 'Reset', ariaLabel: 'Reset',
    tooltipText: "Restore this demo's original config",
    onClick: () => onConfigReset(),
    content: [icon('arrow-rotate-left', { size: 'lg', fixedWidth: true })]
  });
  const defaultsButton = buttonWithTooltip({
    id: 'config-defaults', label: 'Defaults', pressed: showDefaults, ariaLabel: 'Toggle Defaults',
    tooltipText: 'Show or hide the default config values merged into the JSON',
    onClick: () => updateShowDefaults(!showDefaults),
    content: [icon('eye-slash', { size: 'lg', fixedWidth: true })]
  });
  const invertedButton = buttonWithTooltip({
    id: 'config-inverted', label: 'Invert', pressed: false, ariaLabel: 'Toggle Inverted',
    tooltipText: 'Swap the chart between vertical and horizontal orientation',
    onClick: toggleConfigInverted,
    content: [icon('chart-column', { size: 'lg', fixedWidth: true })]
  });
  const slowButton = buttonWithTooltip({
    id: 'config-animate-slow', label: 'Slow', pressed: false, ariaLabel: 'Toggle Slow',
    tooltipText: 'Slow all animations down so transitions are easy to watch',
    onClick: toggleConfigAnimationSlow,
    content: [icon('hourglass-end', { size: 'lg', fixedWidth: true })]
  });
  const applyButton = buttonWithTooltip({
    id: 'config-apply', label: 'Apply', ariaLabel: 'Apply',
    tooltipText: 'Apply this config — the chart updates when you return to the Chart tab',
    onClick: applyConfig,
    content: [icon('check', { size: 'lg', fixedWidth: true })]
  });

  const footerError = el('span', { className: 'mochart-demo-footer-error', attrs: { role: 'alert' } });
  footerError.hidden = true;

  const container = el('div', {
    className: 'mochart-demo-tab-container col config' + (props.active ? ' active' : '')
  }, [
    el('div', { className: 'mochart-demo-tab-content' }, [textArea.el]),
    el('div', { className: 'mochart-demo-tab-footer' }, [
      el('div', { className: 'btn-toolbar', attrs: { role: 'toolbar' } }, [
        resetButton.el, defaultsButton.el, invertedButton.el, slowButton.el, applyButton.el, footerError
      ])
    ])
  ]);

  // Patch every derived bit of the footer from the current state (the vanilla
  // stand-in for the framework demos' derived values).
  function sync(): void {
    const currentJsonError = jsonError();
    const currentFooterError = currentJsonError ?? errorMessage;
    applyButton.setDisabled(currentJsonError !== null);
    footerError.hidden = currentFooterError === null;
    footerError.textContent = currentFooterError ?? '';

    defaultsButton.setPressed(showDefaults);
    defaultsButton.setContent([icon(showDefaults ? 'eye' : 'eye-slash', { size: 'lg', fixedWidth: true })]);

    const inverted = !!demoConfig.configWithDefaults.plotConfig?.inverted;
    invertedButton.setPressed(inverted);
    invertedButton.setContent([icon(inverted ? 'chart-bar' : 'chart-column', { size: 'lg', fixedWidth: true })]);

    const slow = demoConfig.configWithDefaults.animationConfig === slowAnimationConfig;
    slowButton.setPressed(slow);
    slowButton.setContent([icon(slow ? 'hourglass' : 'hourglass-end', { size: 'lg', fixedWidth: true })]);
  }
  sync();

  return {
    el: container,
    setActive(active: boolean) {
      setActiveClass(container, active);
    },
    setConfig(nextConfig: DemoConfig) {
      if (nextConfig !== config) {
        config = nextConfig;
        mochartDemoConfig = buildMochartDemoConfig(nextConfig);
        demoConfig = copyDemoConfig(mochartDemoConfig);
        textArea.setValue(formatMochartDemoConfig(demoConfig, showDefaults));
        errorMessage = null;
        sync();
      }
    }
  };
}
