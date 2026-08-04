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
  "contractionDuration": 3000,
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

/**
 * Whether the section currently holds the given preset. Structural comparison:
 * Apply round-trips configs through JSON, so object identity never survives.
 */
export function isConfigSectionActive(currentDemoConfig: DemoConfigView, section: string, defaultSection: unknown): boolean {
  const sectionConfig = currentDemoConfig.configWithoutDefaults[section];
  return sectionConfig === defaultSection || JSON.stringify(sectionConfig) === JSON.stringify(defaultSection);
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
    // one decision applied to both views: the with-defaults view carries extra
    // defaulted keys after Apply, so only the without-defaults view can tell
    const active = isConfigSectionActive(currentDemoConfig, section, defaultSection);
    configWithoutDefaults[section] = active ? currentMochartDemoConfig.configWithoutDefaults[section] : defaultSection;
    configWithDefaults[section] = active ? currentMochartDemoConfig.configWithDefaults[section] : defaultSection;
  }
  return { configWithDefaults, configWithoutDefaults };
}
