import { CONFIG_VERSION } from '../core/constants';

type LegacyConfig = Record<string, unknown>;

export default function migrateConfig(config: LegacyConfig): LegacyConfig {
  // An omitted version means "authored for the current config format" — it is
  // normalized here so future migration steps never run against it.
  if (config !== null && typeof config === 'object' && config.version === undefined) {
    config = { ...config, version: CONFIG_VERSION };
  }
  const migrationSteps: Array<(config: LegacyConfig) => LegacyConfig> = [];

  // No migrations yet — 1.0.0 is the first config version. When the shape changes, bump CONFIG_VERSION and
  // push steps via a fall-through switch on config.version; each step stamps the version it migrates to.

  let migratedConfig = config;
  for (const migrationStep of migrationSteps) {
    migratedConfig = migrationStep(migratedConfig);
  }
  return migratedConfig;
}
