import validators, { boundValue } from './validators';
import { filterConfig, getRawIndices } from '../core/configUtils';
import { getPropertyMessage, isConfigObject } from './messages';
import { createStyleValidators, lineMembers, styleMembers } from './styleStateValidators';

import { AUTO, NONE, ANCHORS, COLOR_SAME, SIDES, THRESHOLD_TITLE_SIDES, TYPE_DATE } from '../core/constants';

import type { ConfigObject, LocatedValidationMessage } from './messages';

// Never null: an axis writes stroke="none" so a host-css stroke cannot inherit onto its text.
const { styleShape, styleStates } = createStyleValidators(allowSame =>
  allowSame ? validators.svgColor().orEqual(COLOR_SAME) : validators.svgColor()
);

export const axisStyleValidators = { styleShape, styleStates, lineMembers, styleMembers };

export default function getValidators() {
  return {
    showAxisLine: validators.boolean(),
    axisLineFront: validators.boolean(),
    axisLineMargin: validators.numberMin(0),
    axisLineStyle: styleStates(lineMembers),

    backgroundStyle: validators.style(),
    backgroundFront: validators.boolean(),

    side: validators.oneOf(SIDES),

    reversed: validators.boolean(),

    collapsed: validators.boolean(),

    showFocusRange: validators.boolean(),
    focusRangeFront: validators.boolean(),
    focusRangeApplyToTitle: validators.boolean(),
    focusRangeStyle: styleShape(styleMembers, false),

    showFocusTickMarks: validators.boolean(),
    focusTickMarkFront: validators.boolean(),
    focusTickMarkSize: validators.numberMin(0),
    focusTickMarkMargin: validators.numberMin(0),
    focusTickMarkStyle: styleShape(['strokeColor', 'strokeOpacity', 'strokeWidth', 'strokeDashArray'], false),

    showGridLines: validators.boolean(),
    gridLineFront: validators.boolean(),
    gridLineStyle: styleStates(lineMembers),

    marginInner: validators.numberMin(0),
    marginOuter: validators.numberMin(0),

    maxTickCount: validators.integerMin(0),

    minTickSpacing: validators.numberMin(0),
    minTickInterval: validators.numberMin(0),

    paddingInner: validators.numberMin(0),
    paddingOuter: validators.numberMin(0),

    thresholds: validators.arrayOf(validators.objectWithShape({
      value: validators.datePrimitive(),
      front: validators.boolean().orEqual(undefined),
      style: styleStates(lineMembers).orEqual(undefined),
      title: validators.string().orOneOf([NONE, undefined]),
      titleSide: validators.oneOf(THRESHOLD_TITLE_SIDES).orEqual(undefined),
      titleSnapToValue: validators.boolean().orEqual(undefined),
      titleMargin: validators.margin().orEqual(undefined),
      titlePadding: validators.padding().orEqual(undefined),
      titleTextStyle: styleStates(styleMembers).orEqual(undefined),
      titleBackgroundStyle: validators.style().orEqual(undefined)
    }), true),

    tickCount: validators.integerMin(0).orEqual(AUTO),

    tickLabelFront: validators.boolean(),
    tickLabelBackgroundStyle: validators.style(),
    tickLabelSize: validators.numberMin(0).orEqual(AUTO),
    tickLabelMarginInner: validators.numberMin(0),
    tickLabelMarginOuter: validators.numberMin(0),
    tickLabelPaddingInner: validators.numberMin(0),
    tickLabelPaddingOuter: validators.numberMin(0),
    tickLabelPrefix: validators.string().orEqual(NONE),
    tickLabelSuffix: validators.string().orEqual(NONE),
    tickLabelRotation: validators.numberMinMax(-90, 90),
    tickLabelAnchor: validators.oneOf(ANCHORS.concat([AUTO])),
    tickLabelTextStyle: styleStates(styleMembers),

    showTickMarks: validators.boolean(),
    tickMarkFront: validators.boolean(),
    tickMarkSize: validators.numberMin(0),
    tickMarkMargin: validators.numberMin(0),
    tickMarkStyle: styleStates(lineMembers),

    title: validators.string().orEqual(NONE),
    titleFront: validators.boolean(),
    titleBackgroundStyle: validators.style(),
    titleTruncationEnabled: validators.boolean(),
    titleTruncationValue: validators.string(),
    titleSize: validators.numberMin(0).orEqual(AUTO),
    titleMarginInner: validators.numberMin(0),
    titleMarginOuter: validators.numberMin(0),
    titlePaddingInner: validators.numberMin(0),
    titlePaddingOuter: validators.numberMin(0),
    titleTextStyle: styleStates(styleMembers),

    visible: validators.boolean()
  };
}

/** min above max is a mistake (axis.reversed is the way to invert an axis); min === max stays legal, as auto produces it from flat data. */
export function getAxisBoundsMessage(max: unknown): string {
  return 'should not be above the max property of the same axis: ' + JSON.stringify(max);
}

export function validateAxisBounds(config: ConfigObject, configWithoutDefaults: ConfigObject, errors: string[], errorDetails: LocatedValidationMessage[]): void {
  checkAxisBounds(config['categoryAxis'], 'categoryAxis', undefined, errors, errorDetails);
  const valueAxes = config['valueAxes'];
  if (Array.isArray(valueAxes)) {
    const rawValueAxes = configWithoutDefaults['valueAxes'];
    const rawIndices = getRawIndices(rawValueAxes);
    // no authored entries: the implicit axis takes its bounds from valueAxisDefaults, so report there
    if (rawIndices === null ? !filterConfig(rawValueAxes) : rawIndices.length === 0) {
      checkAxisBounds(valueAxes[0], 'valueAxisDefaults', undefined, errors, errorDetails);
      return;
    }
    for (let i = 0; i < valueAxes.length; i++) {
      checkAxisBounds(valueAxes[i], 'valueAxes', rawIndices?.[i] ?? i, errors, errorDetails);
    }
  }
}

function checkAxisBounds(section: unknown, sectionKey: string, index: number | undefined, errors: string[], errorDetails: LocatedValidationMessage[]): void {
  if (!isConfigObject(section)) {
    return;
  }
  const { min, max } = section;
  // an AUTO end is computed from the data, so there is no authored pair to compare
  if (min === AUTO || max === AUTO || min === undefined || max === undefined) {
    return;
  }
  const dateAxis = section['type'] === TYPE_DATE;
  const minValue = boundValue(min, dateAxis);
  const maxValue = boundValue(max, dateAxis);
  if (minValue === null || maxValue === null || minValue <= maxValue) {
    return;
  }
  const message = getAxisBoundsMessage(max);
  errors.push(getPropertyMessage(sectionKey, 'min', message, index));
  errorDetails.push({ path: index === undefined ? [sectionKey, 'min'] : [sectionKey, index, 'min'], message });
}
