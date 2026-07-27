import validators from './validators';

import {
  AUTO, NONE, RENDERERS, CURVE_TYPES, CAP_TYPES, LABEL_POSITIONS, COLOR_INTERPOLATIONS, MARKER_SHAPES,
  COLOR_SERIES, COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX
} from '../core/constants';
import type { SeriesConfig } from '../../types/config';

type ColorCondition = Pick<SeriesConfig, 'colorProperty' | 'colorBase'>;

const colorPropertySuffix = 'when colorProperty is not ' + NONE;
const colorPropertyNoneSuffix = 'when colorProperty is ' + NONE;
const colorBaseSuffix = 'when colorProperty is not ' + NONE + ' and colorBase is not ' + NONE;
const colorBaseNoneSuffix = 'when colorProperty is not ' + NONE + ' and colorBase is ' + NONE;

const colorPropertyRule = { condition: ({ colorProperty }: ColorCondition) => colorProperty !== NONE, suffix: colorPropertySuffix };
const colorPropertyNoneRule = { condition: ({ colorProperty }: ColorCondition) => colorProperty === NONE, suffix: colorPropertyNoneSuffix };
const colorBaseRule = { condition: ({ colorProperty, colorBase }: ColorCondition) => colorProperty !== NONE && colorBase !== NONE, suffix: colorBaseSuffix };
const colorBaseNoneRule = { condition: ({ colorProperty, colorBase }: ColorCondition) => colorProperty !== NONE && colorBase === NONE, suffix: colorBaseNoneSuffix };

export default function getValidators(config: Partial<SeriesConfig>) {
  return {
    id: validators.string(),
    order: validators.number(),
    axis: validators.string(),
    stack: validators.string().orEqual(NONE),
    group: validators.string().orEqual(NONE),
    property: validators.propertyRequired(),
    rangeProperty: validators.propertyOptional(),
    markerProperty: validators.propertyOptional(),
    colorProperty: validators.propertyOptional(),
    labelProperty: validators.propertyOptional(),
    tooltipProperty: validators.propertyOptional(),
    ignore: validators.boolean(),
    renderer: validators.oneOf(RENDERERS),
    skipMissing: validators.boolean(),
    showMissingAtBase: validators.boolean(),
    curve: validators.objectWithShape({
      type: validators.oneOf(CURVE_TYPES),
      param: validators.numberMinMax(0, 1).orEqual(void 0)
    }),
    capSize: validators.numberMin(0),
    capType: validators.oneOf(CAP_TYPES).orEqual(NONE),
    capExpand: validators.boolean(),
    capOnlyStackOuter: validators.boolean(),
    valueLabel: validators.string().orEqual(NONE),
    valueFormat: validators.numberFormat().orOneOf([NONE, AUTO]),
    valuePrefix: validators.string().orEqual(NONE),
    valueSuffix: validators.string().orEqual(NONE),
    useTitleForValueLabel: validators.boolean(),
    title: validators.string().orEqual(NONE),
    strokeWidth: validators.numberMin(0),
    focusedStrokeWidth: validators.numberMin(0),
    defocusedStrokeWidth: validators.numberMin(0),
    strokeOpacity: validators.opacity(),
    fillOpacity: validators.opacity(),
    focusedStrokeOpacity: validators.opacity(),
    focusedFillOpacity: validators.opacity(),
    defocusedStrokeOpacity: validators.opacity(),
    defocusedFillOpacity: validators.opacity(),
    labelFormat: validators.numberFormat().orOneOf([NONE, AUTO]),
    labelStrokeColor: validators.svgColor().orOneOf([COLOR_SERIES, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    labelFocusedStrokeColor: validators.svgColor().orOneOf([COLOR_SERIES, COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    labelDefocusedStrokeColor: validators.svgColor().orOneOf([COLOR_SERIES, COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    labelFillColor: validators.svgColor().orOneOf([COLOR_SERIES, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    labelFocusedFillColor: validators.svgColor().orOneOf([COLOR_SERIES, COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    labelDefocusedFillColor: validators.svgColor().orOneOf([COLOR_SERIES, COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    labelMinPositionPercent: validators.numberMinMax(0, 1).orEqual(NONE),
    labelMaxPositionPercent: validators.numberMinMax(0, 1).orEqual(NONE),
    labelMinRangePercent: validators.numberMinMax(0, 1).orEqual(NONE),
    labelOffset: validators.number(),
    labelPosition: validators.oneOf(LABEL_POSITIONS),
    labelAboveBaseMinPositionPercent: validators.numberMinMax(0, 1).orOneOf([NONE, AUTO]),
    labelAboveBaseMaxPositionPercent: validators.numberMinMax(0, 1).orOneOf([NONE, AUTO]),
    labelBelowBaseMinPositionPercent: validators.numberMinMax(0, 1).orOneOf([NONE, AUTO]),
    labelBelowBaseMaxPositionPercent: validators.numberMinMax(0, 1).orOneOf([NONE, AUTO]),
    labelAboveBaseOffset: validators.number().orEqual(AUTO),
    labelBelowBaseOffset: validators.number().orEqual(AUTO),
    labelAboveBasePosition: validators.oneOf([AUTO].concat(LABEL_POSITIONS)),
    labelBelowBasePosition: validators.oneOf([AUTO].concat(LABEL_POSITIONS)),
    labelStrokeWidth: validators.numberMin(0),
    labelFocusedStrokeWidth: validators.numberMin(0),
    labelDefocusedStrokeWidth: validators.numberMin(0),
    labelStrokeOpacity: validators.opacity(),
    labelFillOpacity: validators.opacity(),
    labelFocusedStrokeOpacity: validators.opacity(),
    labelFocusedFillOpacity: validators.opacity(),
    labelDefocusedStrokeOpacity: validators.opacity(),
    labelDefocusedFillOpacity: validators.opacity(),
    gradient: validators.string().orEqual(NONE),
    strokeColor: validators.svgColor().orOneOf([COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    focusedStrokeColor: validators.svgColor().orOneOf([COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    defocusedStrokeColor: validators.svgColor().orOneOf([COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    fillColor: validators.svgColor().orOneOf([COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    focusedFillColor: validators.svgColor().orOneOf([COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    defocusedFillColor: validators.svgColor().orOneOf([COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    colorMin: validators.conditional([
      { ...colorPropertyNoneRule, validator: validators.equal(NONE) },
      { ...colorBaseRule, validator: validators.equal(NONE) },
      { ...colorBaseNoneRule, validator: validators.color() },
    ], config),
    colorMax: validators.conditional([
      { ...colorPropertyNoneRule, validator: validators.equal(NONE) },
      { ...colorBaseRule, validator: validators.equal(NONE) },
      { ...colorBaseNoneRule, validator: validators.color() },
    ], config),
    colorBase: validators.number().orEqual(NONE),
    colorBaseAboveMin: validators.conditional([
      { ...colorPropertyNoneRule, validator: validators.equal(NONE) },
      { ...colorBaseNoneRule, validator: validators.equal(NONE) },
      { ...colorBaseRule, validator: validators.color() },
    ], config),
    colorBaseAboveMax: validators.conditional([
      { ...colorPropertyNoneRule, validator: validators.equal(NONE) },
      { ...colorBaseNoneRule, validator: validators.equal(NONE) },
      { ...colorBaseRule, validator: validators.color() },
    ], config),
    colorBaseBelowMin: validators.conditional([
      { ...colorPropertyNoneRule, validator: validators.equal(NONE) },
      { ...colorBaseNoneRule, validator: validators.equal(NONE) },
      { ...colorBaseRule, validator: validators.color() },
    ], config),
    colorBaseBelowMax: validators.conditional([
      { ...colorPropertyNoneRule, validator: validators.equal(NONE) },
      { ...colorBaseNoneRule, validator: validators.equal(NONE) },
      { ...colorBaseRule, validator: validators.color() },
    ], config),
    colorInterpolation: validators.conditional([
      { ...colorPropertyRule, validator: validators.oneOf(COLOR_INTERPOLATIONS) },
      { ...colorPropertyNoneRule, validator: validators.equal(NONE) }
    ], config),
    markerStrokeColor: validators.svgColor().orOneOf([COLOR_SERIES, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    markerFocusedStrokeColor: validators.svgColor().orOneOf([COLOR_SERIES, COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    markerDefocusedStrokeColor: validators.svgColor().orOneOf([COLOR_SERIES, COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    markerFillColor: validators.svgColor().orOneOf([COLOR_SERIES, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    markerFocusedFillColor: validators.svgColor().orOneOf([COLOR_SERIES, COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    markerDefocusedFillColor: validators.svgColor().orOneOf([COLOR_SERIES, COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX]),
    markerShape: validators.oneOf([NONE, ...MARKER_SHAPES]),
    minMarkerSize: validators.numberMin(0),
    markerShowMissing: validators.boolean(),
    markerSize: validators.numberMin(0),
    markerStrokeWidth: validators.numberMin(0),
    markerFocusedStrokeWidth: validators.numberMin(0),
    markerDefocusedStrokeWidth: validators.numberMin(0),
    markerStrokeOpacity: validators.opacity(),
    markerFillOpacity: validators.opacity(),
    markerFocusedStrokeOpacity: validators.opacity(),
    markerFocusedFillOpacity: validators.opacity(),
    markerDefocusedStrokeOpacity: validators.opacity(),
    markerDefocusedFillOpacity: validators.opacity(),
    showInLegend: validators.boolean(),
    showInTooltip: validators.boolean(),
    showColorInLegend: validators.boolean(),
    showColorInTooltip: validators.boolean(),
    suppressible: validators.boolean(),
    focusOnMouseOver: validators.boolean(),
    focusOnClick: validators.boolean(),
    focusGroupOnMouseOver: validators.boolean(),
    focusGroupOnClick: validators.boolean(),
    useAxisFocus: validators.boolean(),
    animateBaseFromAdjacent: validators.boolean()
  };
}
