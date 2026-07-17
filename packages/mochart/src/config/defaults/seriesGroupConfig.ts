import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';
import type { SeriesGroupConfig } from '../../types/config';

export default function getDefaults(config: Partial<SeriesGroupConfig> = {}, index: number): Partial<SeriesGroupConfig> {
  let regularDefaults = getRegularDefaults();
  let configWithRegularDefaults = { ...regularDefaults, ...config };
  let conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as SeriesGroupConfig, index));

  return { ...regularDefaults, ...conditionalDefaults } as Partial<SeriesGroupConfig>;
}

export function getRegularDefaults() {
  return {};
}

export function getConditionalDefaults(configWithRegularDefaults: SeriesGroupConfig, index: number) {
  return {
    id: conditionalDefault([
      { condition: (config, index) => true, suffix: 'series group index', default: 'SG' + index, defaultText: 'SG${index}' },
      { ...defaultRule, default: 'SG' + index }
    ], configWithRegularDefaults, index)
  }
}
