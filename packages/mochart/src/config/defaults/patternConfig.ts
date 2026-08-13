import {
  COLOR_SERIES, NONE, PATTERN_TYPE_CROSSHATCH, PATTERN_TYPE_DOTS, PATTERN_TYPE_LINES
} from '../core/constants';
import { deepMerge } from '../core/deepMerge';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';
import type { DeepPartial, PatternConfig, PatternInputConfig } from '../../types/config';

export default function getDefaults(config: DeepPartial<PatternInputConfig> = {}, index: number): Partial<PatternConfig> {
  const regularDefaults = getRegularDefaults();
  const configWithRegularDefaults = deepMerge(regularDefaults, config) as PatternConfig;
  const conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults, index));

  return deepMerge(regularDefaults, conditionalDefaults) as Partial<PatternConfig>;
}

export function getRegularDefaults() {
  return {
    ignore: false,
    spacing: 8,
    foregroundColor: COLOR_SERIES,
    foregroundOpacity: 1,
    backgroundColor: NONE,
    backgroundOpacity: 1
  };
}

export function getConditionalDefaults(configWithRegularDefaults: PatternConfig, index: number) {
  const linePattern = ({ type }: PatternConfig) => type === PATTERN_TYPE_LINES || type === PATTERN_TYPE_CROSSHATCH;
  const dotPattern = ({ type }: PatternConfig) => type === PATTERN_TYPE_DOTS;
  return {
    id: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'pattern index', default: 'P' + index, defaultText: 'P${index}' },
      { ...defaultRule, default: 'P' + index }
    ], configWithRegularDefaults, index),
    angle: conditionalDefault([
      { condition: linePattern, suffix: 'when type is lines or crosshatch', default: 45 },
      { ...defaultRule, default: undefined }
    ], configWithRegularDefaults, index),
    lineWidth: conditionalDefault([
      { condition: linePattern, suffix: 'when type is lines or crosshatch', default: 2 },
      { ...defaultRule, default: undefined }
    ], configWithRegularDefaults, index),
    radius: conditionalDefault([
      { condition: dotPattern, suffix: 'when type is dots', default: 2 },
      { ...defaultRule, default: undefined }
    ], configWithRegularDefaults, index)
  };
}
