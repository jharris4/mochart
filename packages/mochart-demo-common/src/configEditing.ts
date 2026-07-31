import type { DemoConfig, MochartDemoConfig } from './types';

// The with/without-defaults config views the editor toggles between. Config
// sections are intentionally loose (`any`) — they are arbitrary user JSON.
export interface DemoConfigView {
  configWithDefaults: Record<string, any>;
  configWithoutDefaults: Record<string, any>;
}

export const slowAnimationConfig = {
  "animate": true,
  "initialDuration": 5000,
  "expansionDuration": 3000,
  "valueChangeDuration": 5000,
  "collapseDuration": 3000,
  "focusDuration": 2500
};

export function formatConfig(config: unknown): string {
  return JSON.stringify(config, null, '\t');
}

export function formatMochartDemoConfig(demoConfig: DemoConfigView, showDefaults: boolean): string {
  const { configWithDefaults, configWithoutDefaults } = demoConfig;
  return formatConfig(showDefaults ? configWithDefaults : configWithoutDefaults);
}

export function copyDemoConfig(demoConfig: DemoConfigView | MochartDemoConfig): DemoConfigView {
  const { configWithDefaults, configWithoutDefaults } = demoConfig;
  return JSON.parse(JSON.stringify({ configWithDefaults, configWithoutDefaults }));
}

export function parseConfig(configText: string): DemoConfig | null {
  try {
    return JSON.parse(configText);
  }
  catch {
    console.warn('Invalid Chart Config JSON: ' + configText);
    return null;
  }
}

export function toggleConfigProperty(currentDemoConfig: DemoConfigView, section: string, key: string, defaultValue: unknown): DemoConfigView {
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

export function toggleConfigSection(currentMochartDemoConfig: MochartDemoConfig, currentDemoConfig: DemoConfigView, section: string, defaultSection: unknown): DemoConfigView {
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
