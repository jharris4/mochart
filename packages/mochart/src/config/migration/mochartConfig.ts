type LegacyConfig = Record<string, unknown>;

export default function migrateConfig(config: LegacyConfig): LegacyConfig {
  const migrationSteps: Array<(config: LegacyConfig) => LegacyConfig> = [];

  // No migrations yet — 1.0.0 is the initial config version. When a future
  // release changes the config shape, bump CONFIG_VERSION and build up the
  // steps with a fall-through switch on config.version, e.g.:
  //
  //   switch (config.version) {
  //     case '1.0.0':
  //       migrationSteps.push(migrateConfig_1_0_0_TO_1_0_1);
  //     case '1.0.1':
  //       migrationSteps.push(migrateConfig_1_0_1_TO_1_0_2);
  //   }
  //
  // Each step should set version to the version it migrates to.

  let migratedConfig = config;
  for (const migrationStep of migrationSteps) {
    migratedConfig = migrationStep(migratedConfig);
  }
  return migratedConfig;
}
