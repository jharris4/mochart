import { NONE } from '../core/constants';

import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';
import type { SeriesStackConfig } from '../../types/config';

export default function getDefaults(config: Partial<SeriesStackConfig> = {}, index: number, soleSeriesAxisId: string | null): Partial<SeriesStackConfig> {
  let regularDefaults = getRegularDefaults();
  let configWithRegularDefaults = { ...regularDefaults, ...config };
  let conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as SeriesStackConfig, index, soleSeriesAxisId));

  return { ...regularDefaults, ...conditionalDefaults } as Partial<SeriesStackConfig>;
}

export function getRegularDefaults() {
  return {
    outerCapSize: 5,
    outerCapType: NONE,
    outerCapExpand: true,
  };
}

export function getConditionalDefaults(configWithRegularDefaults: SeriesStackConfig, index: number, soleSeriesAxisId: string | null) {
  return {
    id: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'series stack index', default: 'SS' + index, defaultText: 'SS${index}' },
      { ...defaultRule, default: 'SS' + index }
    ], configWithRegularDefaults, index),
    axis: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'series axis', default: soleSeriesAxisId === null ? undefined : soleSeriesAxisId, defaultText: 'first axis id' },
      { ...defaultRule, default: soleSeriesAxisId === null ? undefined : soleSeriesAxisId }
    ], configWithRegularDefaults, index),
  }
}
