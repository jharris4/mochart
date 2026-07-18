import React, { useState, useRef, useMemo } from 'react';
import { ButtonToolbar } from 'reactstrap';
import FontAwesome from 'react-fontawesome';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import TextAreaContent from '../misc/TextAreaContent';
import ButtonWithTooltip from '../misc/ButtonWithTooltip';

import type { DemoConfig, MochartDemoConfig } from '../../types';

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

interface Props {
  active?: boolean;
  config?: DemoConfig | null;
  onConfigChange: (config: DemoConfig) => void;
  onConfigReset: () => void;
}

interface ConfigTabState {
  mochartDemoConfig: MochartDemoConfig;
  demoConfig: DemoConfigView;
  showDefaults: boolean;
  configText: string;
}

export default function MochartConfigTab({ active, config = null, onConfigChange, onConfigReset }: Props) {
  const build = (nextConfig: DemoConfig | null): ConfigTabState => {
    const mochartDemoConfig = buildMochartDemoConfig(nextConfig ?? {});
    const demoConfig = copyDemoConfig(mochartDemoConfig);
    return { mochartDemoConfig, demoConfig, showDefaults: false, configText: formatMochartDemoConfig(demoConfig, false) };
  };

  const [state, setState] = useState<ConfigTabState>(() => build(config));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Rebuild when the incoming config changes.
  const prevConfig = useRef(config);
  if (prevConfig.current !== config) {
    prevConfig.current = config;
    const mochartDemoConfig = buildMochartDemoConfig(config ?? {});
    const demoConfig = copyDemoConfig(mochartDemoConfig);
    setState(prev => ({ ...prev, mochartDemoConfig, demoConfig, configText: formatMochartDemoConfig(demoConfig, prev.showDefaults) }));
  }

  const resetConfig = () => onConfigReset();

  const updateShowDefaults = (showDefaults: boolean) => {
    const { configText } = state;
    try {
      const newConfig = JSON.parse(configText);
      const mochartDemoConfig = buildMochartDemoConfig(newConfig);
      const { configValidation } = mochartDemoConfig;
      const { valid } = configValidation;
      if (valid) {
        setState(prev => ({ ...prev, showDefaults, configText: formatMochartDemoConfig(mochartDemoConfig, showDefaults) }));
        setErrorMessage(null);
      }
      else {
        const { errors, warnings } = configValidation;
        if (errors.length > 0) {
          console.warn('errors: ', errors);
        }
        if (warnings.length > 0) {
          console.warn('warnings: ', warnings);
        }
        setErrorMessage('Invalid chart config — details in the browser console');
      }
    }
    catch (error) {
      console.warn('Invalid Chart Config JSON: ' + state.configText);
      setErrorMessage('Invalid JSON');
    }
  };

  const toggleConfigDefaults = () => updateShowDefaults(!state.showDefaults);

  const toggleConfigProperty = (demoConfig: DemoConfigView | undefined, section: string, key: string, defaultValue: unknown): DemoConfigView | undefined => {
    if (demoConfig) {
      const configWithDefaults = { ...demoConfig.configWithDefaults };
      const configWithoutDefaults = { ...demoConfig.configWithoutDefaults };
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
  };

  const toggleConfigSection = (mochartDemoConfig: MochartDemoConfig, demoConfig: DemoConfigView | undefined, section: string, defaultSection: unknown): DemoConfigView | undefined => {
    if (mochartDemoConfig && demoConfig) {
      const configWithDefaults = { ...demoConfig.configWithDefaults };
      const configWithoutDefaults = { ...demoConfig.configWithoutDefaults };
      const sectionConfig = configWithoutDefaults[section];
      if (!sectionConfig) {
        configWithoutDefaults[section] = defaultSection;
        configWithDefaults[section] = defaultSection;
      }
      else {
        configWithoutDefaults[section] = configWithoutDefaults[section] === defaultSection ? mochartDemoConfig.configWithoutDefaults[section] : defaultSection;
        configWithDefaults[section] = configWithDefaults[section] === defaultSection ? mochartDemoConfig.configWithDefaults[section] : defaultSection;
      }
      return { configWithDefaults, configWithoutDefaults };
    }
  };

  const toggleConfigInverted = () => {
    const demoConfig = toggleConfigProperty(state.demoConfig, 'plotConfig', 'inverted', true) ?? state.demoConfig;
    setState(prev => ({ ...prev, demoConfig, configText: formatMochartDemoConfig(demoConfig, prev.showDefaults) }));
  };

  const toggleConfigAnimationSlow = () => {
    const demoConfig = toggleConfigSection(state.mochartDemoConfig, state.demoConfig, 'animationConfig', slowAnimationConfig) ?? state.demoConfig;
    setState(prev => ({ ...prev, demoConfig, configText: formatMochartDemoConfig(demoConfig, prev.showDefaults) }));
  };

  const applyConfig = () => {
    const parsed = parseConfig(state.configText);
    if (parsed !== null) {
      onConfigChange(parsed);
    }
  };

  const { demoConfig, configText, showDefaults } = state;
  const { configWithDefaults } = demoConfig;
  const { inverted } = configWithDefaults.plotConfig;

  const invertedIcon = inverted ? 'chart-bar' : 'chart-column';
  const slow = configWithDefaults.animationConfig === slowAnimationConfig;
  const slowIcon = slow ? 'hourglass' : 'hourglass-end';

  // Live JSON validity — disables Apply and shows an inline hint while the
  // editor holds unparseable text.
  const jsonError = useMemo(() => {
    try {
      JSON.parse(configText);
      return null;
    }
    catch (error) {
      return 'Invalid JSON';
    }
  }, [configText]);
  const footerError = jsonError ?? errorMessage;

  return (
    <div className={"mochart-demo-tab-container col config" + (active ? " active" : "")}>
      <div className="mochart-demo-tab-content">
        <TextAreaContent value={configText} onChange={(text: string) => { setState(prev => ({ ...prev, configText: text })); setErrorMessage(null); }} />
      </div>
      <div className="mochart-demo-tab-footer">
        <ButtonToolbar>
          <ButtonWithTooltip id="config-reset" label="Reset" tooltipText="Restore this demo's original config" tooltipPlacement="top-start"
            onClick={resetConfig} aria-label="Reset">
            <FontAwesome size="lg" fixedWidth={true} name="arrow-rotate-left" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="config-defaults" label="Defaults" pressed={showDefaults}
            tooltipText="Show or hide the default config values merged into the JSON" tooltipPlacement="top-start"
            onClick={toggleConfigDefaults} aria-label="Toggle Defaults">
            <FontAwesome size="lg" fixedWidth={true} name={showDefaults ? 'eye' : 'eye-slash'} />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="config-inverted" label="Invert" pressed={!!inverted}
            tooltipText="Swap the chart between vertical and horizontal orientation" tooltipPlacement="top-start"
            onClick={toggleConfigInverted} aria-label="Toggle Inverted">
            <FontAwesome size="lg" fixedWidth={true} name={invertedIcon} />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="config-animate-slow" label="Slow" pressed={slow}
            tooltipText="Slow all animations down so transitions are easy to watch" tooltipPlacement="top-start"
            onClick={toggleConfigAnimationSlow} aria-label="Toggle Slow">
            <FontAwesome size="lg" fixedWidth={true} name={slowIcon} />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="config-apply" label="Apply" disabled={jsonError !== null}
            tooltipText="Apply this config — the chart updates when you return to the Chart tab" tooltipPlacement="top-start"
            onClick={applyConfig} aria-label="Apply">
            <FontAwesome size="lg" fixedWidth={true} name="check" />
          </ButtonWithTooltip>
          {footerError ? <span className="mochart-demo-footer-error" role="alert">{footerError}</span> : null}
        </ButtonToolbar>
      </div>
    </div>
  );
}
