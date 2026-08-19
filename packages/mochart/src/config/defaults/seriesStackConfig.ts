import { NONE } from '../core/constants';

import { resolveDefaults, conditionalDefault, defaultRule } from './conditionalDefault';
import type { DeepPartial, SeriesStackConfig } from '../../types/config';

export default function getDefaults(config: DeepPartial<SeriesStackConfig> = {}, index: number, soleValueAxisId: string | null): Partial<SeriesStackConfig> {
  return resolveDefaults(getRegularDefaults(), getConditionalDefaults, config, index, soleValueAxisId);
}

export function getRegularDefaults() {
  return {
    ignore: false,
    outerCap: {
      size: 5,
      type: NONE,
      expand: true
    },
  };
}

export function getConditionalDefaults(configWithRegularDefaults: SeriesStackConfig, index: number, soleValueAxisId: string | null) {
  return {
    id: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'series stack index', default: 'SS' + index, defaultText: 'SS${index}' },
      { ...defaultRule, default: 'SS' + index }
    ], configWithRegularDefaults, index),
    axis: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'value axis', default: soleValueAxisId === null ? undefined : soleValueAxisId, defaultText: 'sole axis id' },
      { ...defaultRule, default: soleValueAxisId === null ? undefined : soleValueAxisId }
    ], configWithRegularDefaults, index),
  }
}
