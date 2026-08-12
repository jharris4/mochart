import validators, { boundValue } from './validators';
import { filterConfig } from '../core/mochartConfig';
import { getPropertyMessage, isConfigObject } from './messages';

import { AUTO, NONE, ANCHORS, COLOR_SAME, SIDES, THRESHOLD_TITLE_SIDES } from '../core/constants';

import type { Validator } from '@mochart/movalid';
import type { ConfigObject, LocatedValidationMessage } from './messages';

export type StyleMember = 'strokeColor' | 'strokeOpacity' | 'strokeWidth' | 'strokeDashArray' | 'fillColor' | 'fillOpacity';

const lineMembers: StyleMember[] = ['strokeColor', 'strokeOpacity', 'strokeWidth', 'strokeDashArray'];
const styleMembers: StyleMember[] = ['strokeColor', 'strokeOpacity', 'strokeWidth', 'strokeDashArray', 'fillColor', 'fillOpacity'];

function memberValidator(member: StyleMember, allowSame: boolean): Validator {
  switch (member) {
    // Never null: an axis writes stroke="none" so a host-css stroke cannot inherit onto its text.
    case 'strokeColor':
    case 'fillColor':
      return allowSame ? validators.svgColor().orEqual(COLOR_SAME) : validators.svgColor();
    case 'strokeOpacity':
    case 'fillOpacity':
      return validators.opacity();
    case 'strokeWidth':
      return allowSame ? validators.numberMin(0).orOneOf([NONE, COLOR_SAME]) : validators.numberMin(0).orEqual(NONE);
    case 'strokeDashArray':
      return allowSame ? validators.dashArray().orOneOf([NONE, COLOR_SAME]) : validators.dashArray().orEqual(NONE);
  }
}

// Partial, and extra members pass: an unknown member is reported once by the unknown-key walk.
function styleShape(members: StyleMember[], allowSame: boolean) {
  const shape: Record<string, Validator> = {};
  for (const member of members) {
    shape[member] = memberValidator(member, allowSame);
  }
  return validators.partialObjectWithShape(shape, true);
}

function styleStates(members: StyleMember[]) {
  return validators.partialObjectWithShape({
    normal: styleShape(members, false),
    focused: styleShape(members, true),
    defocused: styleShape(members, true)
  }, true);
}

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

/**
 * An axis whose min is above its max would run backwards. `axis.reversed` is the supported way to
 * invert an axis, so an inverted domain is a mistake rather than a spelling of that intent.
 * `min === max` stays legal: `auto` already produces a collapsed domain from flat data, and it is
 * where computed bounds land when every value is the same.
 */
export function getAxisBoundsMessage(max: unknown): string {
  return 'should not be above the max property of the same axis: ' + JSON.stringify(max);
}

export function validateAxisBounds(config: ConfigObject, configWithoutDefaults: ConfigObject, errors: string[], errorDetails: LocatedValidationMessage[]): void {
  checkAxisBounds(config['categoryAxis'], 'categoryAxis', undefined, errors, errorDetails);
  const valueAxes = config['valueAxes'];
  if (Array.isArray(valueAxes)) {
    // built sections drop ignored/non-object raw entries, so report at the filtered raw index
    const rawSections = Array.isArray(configWithoutDefaults['valueAxes']) ? configWithoutDefaults['valueAxes'] as unknown[] : [];
    const rawIndices: number[] = [];
    for (let i = 0; i < rawSections.length; i++) {
      if (filterConfig(rawSections[i])) {
        rawIndices.push(i);
      }
    }
    for (let i = 0; i < valueAxes.length; i++) {
      checkAxisBounds(valueAxes[i], 'valueAxes', rawIndices[i] ?? i, errors, errorDetails);
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
  const minValue = boundValue(min);
  const maxValue = boundValue(max);
  if (minValue === null || maxValue === null || minValue <= maxValue) {
    return;
  }
  const message = getAxisBoundsMessage(max);
  errors.push(getPropertyMessage(sectionKey, 'min', message, index));
  errorDetails.push({ path: index === undefined ? [sectionKey, 'min'] : [sectionKey, index, 'min'], message });
}
