import React, { useState, useRef } from 'react';
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
    alert('Invalid Chart Config JSON');
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
      console.warn('Invalid Chart Config JSON: ' + state.configText);
      alert('Invalid Chart Config JSON');
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

  const { demoConfig, configText } = state;
  const { configWithDefaults } = demoConfig;
  const { inverted } = configWithDefaults.plotConfig;

  const invertedIcon = inverted ? 'caret-square-o-up' : 'caret-square-o-right';
  const slowIcon = configWithDefaults.animationConfig === slowAnimationConfig ? 'hourglass' : 'hourglass-end';

  return (
    <div className={"mochart-demo-tab-container col config" + (active ? " active" : "")}>
      <div className="mochart-demo-tab-content">
        <TextAreaContent value={configText} onChange={(text: string) => setState(prev => ({ ...prev, configText: text }))} />
      </div>
      <div className="mochart-demo-tab-footer">
        <ButtonToolbar>
          <ButtonWithTooltip id="config-reset" tooltipText="Reset" tooltipPlacement="top-start"
            onClick={resetConfig} aria-label="Reset">
            <FontAwesome size="lg" fixedWidth={true} name="undo" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="config-defaults" tooltipText="Toggle Defaults" tooltipPlacement="top-start"
            onClick={toggleConfigDefaults} aria-label="Toggle Defaults">
            <FontAwesome size="lg" fixedWidth={true} name="crosshairs" />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="config-inverted" tooltipText="Toggle Inverted" tooltipPlacement="top-start"
            onClick={toggleConfigInverted} aria-label="Toggle Inverted">
            <FontAwesome size="lg" fixedWidth={true} name={invertedIcon} />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="config-animate-slow" tooltipText="Toggle Slow" tooltipPlacement="top-start"
            onClick={toggleConfigAnimationSlow} aria-label="Toggle Slow">
            <FontAwesome size="lg" fixedWidth={true} name={slowIcon} />
          </ButtonWithTooltip>
          <ButtonWithTooltip id="config-apply" tooltipText="Apply" tooltipPlacement="top-start"
            onClick={applyConfig} aria-label="Apply">
            <FontAwesome size="lg" fixedWidth={true} name="check" />
          </ButtonWithTooltip>
        </ButtonToolbar>
      </div>
    </div>
  );
}
