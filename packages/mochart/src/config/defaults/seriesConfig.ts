import {
  AUTO, NONE, RENDERER_AREA, RENDERER_BAR, RENDERER_LINE, RENDERER_NONE, MARKER_SHAPE_CIRCLE, CURVE_TYPE_LINEAR,
  COLOR_SAME, COLOR_SERIES, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX, LABEL_POSITION_CENTER,
  COLOR_INTERPOLATION_HCL
} from '../core/constants';

import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';
import type { SeriesColor, SeriesConfig } from '../../types/config';

export default function getDefaults(config: Partial<SeriesConfig> = {}, index: number, soleSeriesAxisId: string | null, soleSeriesStackId: string | null, soleSeriesGroupId: string | null, soleGradientConfigId: string | null): Partial<SeriesConfig> {
  let regularDefaults = getRegularDefaults();
  let configWithRegularDefaults = {...regularDefaults, ...config};
  let conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as SeriesConfig, index, soleSeriesAxisId, soleSeriesStackId, soleSeriesGroupId, soleGradientConfigId));

  return {...regularDefaults, ...conditionalDefaults} as Partial<SeriesConfig>;
}

export function getRegularDefaults() {
  return {
    rangeProperty: NONE,
    markerProperty: NONE,
    colorProperty: NONE,
    labelProperty: NONE,
    tooltipProperty: NONE,
    stack: NONE,
    group: NONE,
    gradient: NONE,
    ignore: false,
    renderer: RENDERER_LINE,
    skipMissing: false,
    skipPartialRange: false,
    showMissingAtBase: false,
    curve: { type: CURVE_TYPE_LINEAR },
    barWidthPercent: 1,
    capSize: 5,
    capType: NONE,
    capExpand: true,
    capOnlyStackOuter: false,
    valueLabel: NONE,
    valueFormat: AUTO,
    valuePrefix: NONE,
    valueSuffix: NONE,
    useTitleForValueLabel: true,
    title: NONE,
    labelFormat: AUTO,
    labelStrokeColor: '#000000',
    labelFocusedStrokeColor: COLOR_SAME,
    labelDefocusedStrokeColor: COLOR_SAME,
    labelFillColor: '#000000',
    labelFocusedFillColor: COLOR_SAME,
    labelDefocusedFillColor: COLOR_SAME,
    labelMinPositionPercent: NONE,
    labelMaxPositionPercent: NONE,
    labelMinRangePercent: NONE,
    labelOffset: 0,
    labelPosition: LABEL_POSITION_CENTER,
    labelAboveBaseMinPositionPercent: AUTO,
    labelAboveBaseMaxPositionPercent: AUTO,
    labelBelowBaseMinPositionPercent: AUTO,
    labelBelowBaseMaxPositionPercent: AUTO,
    labelAboveBaseOffset: AUTO,
    labelBelowBaseOffset: AUTO,
    labelAboveBasePosition: AUTO,
    labelBelowBasePosition: AUTO,
    labelStrokeWidth: 1,
    labelFocusedStrokeWidth: 1,
    labelDefocusedStrokeWidth: 1,
    labelStrokeOpacity: 0.8,
    labelFillOpacity: 0.8,
    labelFocusedStrokeOpacity: 1,
    labelFocusedFillOpacity: 1,
    labelDefocusedStrokeOpacity: 1,
    labelDefocusedFillOpacity: 1,
    strokeColor: COLOR_SERIES_INDEX,
    focusedStrokeColor: COLOR_SAME,
    defocusedStrokeColor: COLOR_SAME,
    fillColor: COLOR_SERIES_INDEX,
    focusedFillColor: COLOR_SAME,
    defocusedFillColor: COLOR_SAME,
    colorMin: NONE,
    colorMax: NONE,
    colorBaseAboveMin: NONE,
    colorBaseAboveMax: NONE,
    colorBase: NONE,
    colorBaseBelowMin: NONE,
    colorBaseBelowMax: NONE,
    minMarkerSize: 1,
    markerShowMissing: false,
    markerSize: 6,
    markerStrokeColor: COLOR_SERIES,
    markerFocusedStrokeColor: COLOR_SAME,
    markerDefocusedStrokeColor: COLOR_SAME,
    markerFillColor: COLOR_SERIES,
    markerFocusedFillColor: COLOR_SAME,
    markerDefocusedFillColor: COLOR_SAME,
    markerStrokeWidth: 1,
    markerFocusedStrokeWidth: 3,
    markerDefocusedStrokeWidth: 1,
    markerStrokeOpacity: 0.9,
    markerFillOpacity: 0.9,
    markerFocusedStrokeOpacity: 1,
    markerFocusedFillOpacity: 1,
    markerDefocusedStrokeOpacity: 0.8,
    markerDefocusedFillOpacity: 0.8,
    showInLegend: true,
    showInTooltip: true,
    suppressible: true,
    suppressWith: NONE,
    focusOnMouseOver: false,
    focusOnClick: false,
    focusGroupOnMouseOver: false,
    focusGroupOnClick: false,
    useAxisFocus: true
  };
}

export function getConditionalDefaults(configWithRegularDefaults: SeriesConfig & { color?: SeriesColor }, index: number, soleSeriesAxisId: string | null, soleSeriesStackId: string | null, soleSeriesGroupId: string | null, soleGradientConfigId: string | null) {
  return {
    id: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'series index', default: 'S' + index, defaultText: 'S${index}' },
      { ...defaultRule, default: 'S' + index }
    ], configWithRegularDefaults, index),
    order: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'series index', default: index, defaultText: '${index}' },
      { ...defaultRule, default: index }
    ], configWithRegularDefaults, index),
    axis: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'series axis', default: soleSeriesAxisId === null ? undefined : soleSeriesAxisId, defaultText: 'sole axis id' },
      { ...defaultRule, default: soleSeriesAxisId === null ? undefined : soleSeriesAxisId }
    ], configWithRegularDefaults, index),
    stack: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'series stack', default: soleSeriesStackId, defaultText: 'sole stack id' },
      { ...defaultRule, default: soleSeriesStackId }
    ], configWithRegularDefaults, index),
    group: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'series group', default: soleSeriesGroupId, defaultText: 'sole group id' },
      { ...defaultRule, default: soleSeriesGroupId }
    ], configWithRegularDefaults, index),
    gradient: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'series gradient', default: soleGradientConfigId, defaultText: 'sole gradient id' },
      { ...defaultRule, default: soleGradientConfigId }
    ], configWithRegularDefaults, index),
    animateBaseFromAdjacent: conditionalDefault([
      { condition: ({ renderer }) => renderer === RENDERER_BAR, suffix: 'when renderer is ' + RENDERER_BAR, default: false },
      { condition: ({ renderer }) => renderer === RENDERER_LINE, suffix: 'when renderer is ' + RENDERER_LINE, default: true },
      { condition: ({ renderer }) => renderer === RENDERER_AREA, suffix: 'when renderer is ' + RENDERER_AREA, default: true },
      { condition: ({ renderer }) => renderer === RENDERER_NONE, suffix: 'when renderer is ' + RENDERER_NONE, default: false },
      { ...defaultRule, default: false }
    ], configWithRegularDefaults, index),
    strokeOpacity: conditionalDefault([
      { condition: ({ renderer }) => renderer === RENDERER_BAR, suffix: 'when renderer is ' + RENDERER_BAR, default: 0.8 },
      { condition: ({ renderer }) => renderer === RENDERER_LINE, suffix: 'when renderer is ' + RENDERER_LINE, default: 0.9 },
      { condition: ({ renderer }) => renderer === RENDERER_AREA, suffix: 'when renderer is ' + RENDERER_AREA, default: 0.8 },
      { condition: ({ renderer }) => renderer === RENDERER_NONE, suffix: 'when renderer is ' + RENDERER_NONE, default: 0.9 },
      { ...defaultRule, default: 0.8 }
    ], configWithRegularDefaults, index),
    fillOpacity: conditionalDefault([
      { condition: ({ renderer }) => renderer === RENDERER_BAR, suffix: 'when renderer is ' + RENDERER_BAR, default: 0.8 },
      { condition: ({ renderer }) => renderer === RENDERER_LINE, suffix: 'when renderer is ' + RENDERER_LINE, default: 0.9 },
      { condition: ({ renderer }) => renderer === RENDERER_AREA, suffix: 'when renderer is ' + RENDERER_AREA, default: 0.8 },
      { condition: ({ renderer }) => renderer === RENDERER_NONE, suffix: 'when renderer is ' + RENDERER_NONE, default: 0.9 },
      { ...defaultRule, default: 0.8 }
    ], configWithRegularDefaults, index),
    focusedStrokeOpacity: conditionalDefault([
      { condition: ({ renderer }) => renderer === RENDERER_BAR, suffix: 'when renderer is ' + RENDERER_BAR, default: 1 },
      { condition: ({ renderer }) => renderer === RENDERER_LINE, suffix: 'when renderer is ' + RENDERER_LINE, default: 1 },
      { condition: ({ renderer }) => renderer === RENDERER_AREA, suffix: 'when renderer is ' + RENDERER_AREA, default: 1 },
      { condition: ({ renderer }) => renderer === RENDERER_NONE, suffix: 'when renderer is ' + RENDERER_NONE, default: 1 },
      { ...defaultRule, default: 1 }
    ], configWithRegularDefaults, index),
    focusedFillOpacity: conditionalDefault([
      { condition: ({ renderer }) => renderer === RENDERER_BAR, suffix: 'when renderer is ' + RENDERER_BAR, default: 1 },
      { condition: ({ renderer }) => renderer === RENDERER_LINE, suffix: 'when renderer is ' + RENDERER_LINE, default: 1 },
      { condition: ({ renderer }) => renderer === RENDERER_AREA, suffix: 'when renderer is ' + RENDERER_AREA, default: 1 },
      { condition: ({ renderer }) => renderer === RENDERER_NONE, suffix: 'when renderer is ' + RENDERER_NONE, default: 1 },
      { ...defaultRule, default: 1 }
    ], configWithRegularDefaults, index),
    defocusedStrokeOpacity: conditionalDefault([
      { condition: ({ renderer }) => renderer === RENDERER_BAR, suffix: 'when renderer is ' + RENDERER_BAR, default: 0.5 },
      { condition: ({ renderer }) => renderer === RENDERER_LINE, suffix: 'when renderer is ' + RENDERER_LINE, default: 0.8 },
      { condition: ({ renderer }) => renderer === RENDERER_AREA, suffix: 'when renderer is ' + RENDERER_AREA, default: 0.5 },
      { condition: ({ renderer }) => renderer === RENDERER_NONE, suffix: 'when renderer is ' + RENDERER_NONE, default: 0.8 },
      { ...defaultRule, default: 1 }
    ], configWithRegularDefaults, index),
    defocusedFillOpacity: conditionalDefault([
      { condition: ({ renderer }) => renderer === RENDERER_BAR, suffix: 'when renderer is ' + RENDERER_BAR, default: 0.5 },
      { condition: ({ renderer }) => renderer === RENDERER_LINE, suffix: 'when renderer is ' + RENDERER_LINE, default: 0.8 },
      { condition: ({ renderer }) => renderer === RENDERER_AREA, suffix: 'when renderer is ' + RENDERER_AREA, default: 0.5 },
      { condition: ({ renderer }) => renderer === RENDERER_NONE, suffix: 'when renderer is ' + RENDERER_NONE, default: 0.8 },
      { ...defaultRule, default: 1 }
    ], configWithRegularDefaults, index),
    strokeWidth: conditionalDefault([
      { condition: ({ renderer }) => renderer === RENDERER_BAR, suffix: 'when renderer is ' + RENDERER_BAR, default: 0 },
      { condition: ({ renderer }) => renderer === RENDERER_LINE, suffix: 'when renderer is ' + RENDERER_LINE, default: 3 },
      { condition: ({ renderer }) => renderer === RENDERER_AREA, suffix: 'when renderer is ' + RENDERER_AREA, default: 0 },
      { condition: ({ renderer }) => renderer === RENDERER_NONE, suffix: 'when renderer is ' + RENDERER_NONE, default: 0 },
      { ...defaultRule, default: 1 }
    ], configWithRegularDefaults, index),
    focusedStrokeWidth: conditionalDefault([
      { condition: ({ renderer }) => renderer === RENDERER_BAR, suffix: 'when renderer is ' + RENDERER_BAR, default: 1 },
      { condition: ({ renderer }) => renderer === RENDERER_LINE, suffix: 'when renderer is ' + RENDERER_LINE, default: 4 },
      { condition: ({ renderer }) => renderer === RENDERER_AREA, suffix: 'when renderer is ' + RENDERER_AREA, default: 1 },
      { condition: ({ renderer }) => renderer === RENDERER_NONE, suffix: 'when renderer is ' + RENDERER_NONE, default: 0 },
      { ...defaultRule, default: 1 }
    ], configWithRegularDefaults, index),
    defocusedStrokeWidth: conditionalDefault([
      { condition: ({ renderer }) => renderer === RENDERER_BAR, suffix: 'when renderer is ' + RENDERER_BAR, default: 0 },
      { condition: ({ renderer }) => renderer === RENDERER_LINE, suffix: 'when renderer is ' + RENDERER_LINE, default: 2 },
      { condition: ({ renderer }) => renderer === RENDERER_AREA, suffix: 'when renderer is ' + RENDERER_AREA, default: 0 },
      { condition: ({ renderer }) => renderer === RENDERER_NONE, suffix: 'when renderer is ' + RENDERER_NONE, default: 0 },
      { ...defaultRule, default: 1 }
    ], configWithRegularDefaults, index),
    markerShape: conditionalDefault([
      { condition: ({ renderer }) => renderer === RENDERER_BAR, suffix: 'when renderer is ' + RENDERER_BAR, default: NONE },
      { condition: ({ renderer }) => renderer === RENDERER_LINE, suffix: 'when renderer is ' + RENDERER_LINE, default: MARKER_SHAPE_CIRCLE },
      { condition: ({ renderer }) => renderer === RENDERER_AREA, suffix: 'when renderer is ' + RENDERER_AREA, default: MARKER_SHAPE_CIRCLE },
      { condition: ({ renderer }) => renderer === RENDERER_NONE, suffix: 'when renderer is ' + RENDERER_NONE, default: MARKER_SHAPE_CIRCLE },
      { ...defaultRule, default: NONE }
    ], configWithRegularDefaults, index),
    colorInterpolation: conditionalDefault([
      { condition: ({ colorProperty }) => colorProperty === NONE, suffix: 'when colorProperty is ' + NONE, default: NONE },
      { condition: ({ colorProperty }) => colorProperty !== NONE, suffix: 'when colorProperty is not ' + NONE, default: COLOR_INTERPOLATION_HCL },
      { ...defaultRule, default: NONE }
    ], configWithRegularDefaults, index),
    colorMin: conditionalDefault([
      { condition: ({ colorProperty }) => colorProperty === NONE, suffix: 'when colorProperty is ' + NONE, default: NONE },
      { condition: ({ colorProperty, colorBase }) => colorProperty !== NONE && colorBase === NONE, suffix: 'when colorProperty is not ' + NONE + ' and colorBase is ' + NONE, default: '#8f8fff' },
      { condition: ({ colorProperty, colorBase }) => colorProperty !== NONE && colorBase !== NONE, suffix: 'when colorProperty is not ' + NONE + ' and colorBase is not ' + NONE, default: NONE },
      { ...defaultRule, default: NONE }
    ], configWithRegularDefaults, index),
    colorMax: conditionalDefault([
      { condition: ({ colorProperty }) => colorProperty === NONE, suffix: 'when colorProperty is ' + NONE, default: NONE },
      { condition: ({ colorProperty, colorBase }) => colorProperty !== NONE && colorBase === NONE, suffix: 'when colorProperty is not ' + NONE + ' and colorBase is ' + NONE, default: '#0000ff' },
      { condition: ({ colorProperty, colorBase }) => colorProperty !== NONE && colorBase !== NONE, suffix: 'when colorProperty is not ' + NONE + ' and colorBase is not ' + NONE, default: NONE },
      { ...defaultRule, default: NONE }
    ], configWithRegularDefaults, index),
    colorBaseAboveMin: conditionalDefault([
      { condition: ({ colorProperty }) => colorProperty === NONE, suffix: 'when colorProperty is ' + NONE, default: NONE },
      { condition: ({ colorProperty, colorBase }) => colorProperty !== NONE && colorBase === NONE, suffix: 'when colorProperty is not ' + NONE + ' and colorBase is ' + NONE, default: NONE },
      { condition: ({ colorProperty, colorBase }) => colorProperty !== NONE && colorBase !== NONE, suffix: 'when colorProperty is not ' + NONE + ' and colorBase is not ' + NONE, default: '#8f8fff' },
      { ...defaultRule, default: NONE }
    ], configWithRegularDefaults, index),
    colorBaseAboveMax: conditionalDefault([
      { condition: ({ colorProperty }) => colorProperty === NONE, suffix: 'when colorProperty is ' + NONE, default: NONE },
      { condition: ({ colorProperty, colorBase }) => colorProperty !== NONE && colorBase === NONE, suffix: 'when colorProperty is not ' + NONE + ' and colorBase is ' + NONE, default: NONE },
      { condition: ({ colorProperty, colorBase }) => colorProperty !== NONE && colorBase !== NONE, suffix: 'when colorProperty is not ' + NONE + ' and colorBase is not ' + NONE, default: '#0000ff' },
      { ...defaultRule, default: NONE }
    ], configWithRegularDefaults, index),
    colorBaseBelowMin: conditionalDefault([
      { condition: ({ colorProperty }) => colorProperty === NONE, suffix: 'when colorProperty is ' + NONE, default: NONE },
      { condition: ({ colorProperty, colorBase }) => colorProperty !== NONE && colorBase === NONE, suffix: 'when colorProperty is not ' + NONE + ' and colorBase is ' + NONE, default: NONE },
      { condition: ({ colorProperty, colorBase }) => colorProperty !== NONE && colorBase !== NONE, suffix: 'when colorProperty is not ' + NONE + ' and colorBase is not ' + NONE, default: '#ff8f8f' },
      { ...defaultRule, default: NONE }
    ], configWithRegularDefaults, index),
    colorBaseBelowMax: conditionalDefault([
      { condition: ({ colorProperty }) => colorProperty === NONE, suffix: 'when colorProperty is ' + NONE, default: NONE },
      { condition: ({ colorProperty, colorBase }) => colorProperty !== NONE && colorBase === NONE, suffix: 'when colorProperty is not ' + NONE + ' and colorBase is ' + NONE, default: NONE },
      { condition: ({ colorProperty, colorBase }) => colorProperty !== NONE && colorBase !== NONE, suffix: 'when colorProperty is not ' + NONE + ' and colorBase is not ' + NONE, default: '#ff0000' },
      { ...defaultRule, default: NONE }
    ], configWithRegularDefaults, index),
    showColorInLegend: conditionalDefault([
      { condition: ({ color }) => color === COLOR_GROUP_INDEX, suffix: 'when color is ' + COLOR_GROUP_INDEX, default: false },
      { condition: ({ color }) => color !== COLOR_GROUP_INDEX, suffix: 'when color is not ' + COLOR_GROUP_INDEX, default: true },
      { ...defaultRule, default: true }
    ], configWithRegularDefaults, index),
    showColorInTooltip: conditionalDefault([
      { condition: ({ color }) => color === COLOR_GROUP_INDEX, suffix: 'when color is ' + COLOR_GROUP_INDEX, default: false },
      { condition: ({ color }) => color !== COLOR_GROUP_INDEX, suffix: 'when color is not ' + COLOR_GROUP_INDEX, default: true },
      { ...defaultRule, default: true }
    ], configWithRegularDefaults, index)
  };
}
