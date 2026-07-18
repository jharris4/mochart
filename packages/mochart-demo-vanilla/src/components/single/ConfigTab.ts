import { buildMochartDemoConfig, copyDemoConfig, demoText, formatMochartDemoConfig, parseConfig, slowAnimationConfig, toggleConfigProperty, toggleConfigSection } from '@mochart/demo-common';

import { buttonWithTooltip, el, icon, setActiveClass, textAreaContent } from '../misc/dom';

import type { DemoConfig } from '../../types';

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
      return demoText.errors.invalidJson;
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
        errorMessage = demoText.errors.invalidChartConfig;
      }
    }
    catch (error) {
      console.warn('Invalid Chart Config JSON: ' + getConfigText());
      errorMessage = demoText.errors.invalidJson;
    }
    sync();
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
    id: 'config-reset', label: demoText.configTab.reset.label, ariaLabel: demoText.configTab.reset.aria,
    tooltipText: demoText.configTab.reset.tooltip,
    onClick: () => onConfigReset(),
    content: [icon('arrow-rotate-left', { size: 'lg', fixedWidth: true })]
  });
  const defaultsButton = buttonWithTooltip({
    id: 'config-defaults', label: demoText.configTab.defaults.label, pressed: showDefaults, ariaLabel: demoText.configTab.defaults.aria,
    tooltipText: demoText.configTab.defaults.tooltip,
    onClick: () => updateShowDefaults(!showDefaults),
    content: [icon('eye-slash', { size: 'lg', fixedWidth: true })]
  });
  const invertedButton = buttonWithTooltip({
    id: 'config-inverted', label: demoText.configTab.invert.label, pressed: false, ariaLabel: demoText.configTab.invert.aria,
    tooltipText: demoText.configTab.invert.tooltip,
    onClick: toggleConfigInverted,
    content: [icon('chart-column', { size: 'lg', fixedWidth: true })]
  });
  const slowButton = buttonWithTooltip({
    id: 'config-animate-slow', label: demoText.configTab.slow.label, pressed: false, ariaLabel: demoText.configTab.slow.aria,
    tooltipText: demoText.configTab.slow.tooltip,
    onClick: toggleConfigAnimationSlow,
    content: [icon('hourglass-end', { size: 'lg', fixedWidth: true })]
  });
  const applyButton = buttonWithTooltip({
    id: 'config-apply', label: demoText.configTab.apply.label, ariaLabel: demoText.configTab.apply.aria,
    tooltipText: demoText.configTab.apply.tooltip,
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
