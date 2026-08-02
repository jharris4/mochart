import { deepMerge } from '../core/deepMerge';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';
import type { DeepPartial, SeriesGroupConfig } from '../../types/config';

export default function getDefaults(config: DeepPartial<SeriesGroupConfig> = {}, index: number): Partial<SeriesGroupConfig> {
  const regularDefaults = getRegularDefaults();
  const configWithRegularDefaults = deepMerge(regularDefaults, config);
  const conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as SeriesGroupConfig, index));

  return deepMerge(regularDefaults, conditionalDefaults) as Partial<SeriesGroupConfig>;
}

export function getRegularDefaults() {
  return {};
}

export function getConditionalDefaults(configWithRegularDefaults: SeriesGroupConfig, index: number) {
  return {
    id: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'series group index', default: 'SG' + index, defaultText: 'SG${index}' },
      { ...defaultRule, default: 'SG' + index }
    ], configWithRegularDefaults, index)
  }
}
