import validators from './validators';

import { AUTO, NONE, ANCHORS, COLOR_SAME, SIDES, THRESHOLD_TITLE_SIDES } from '../core/constants';

import type { Validator } from '@mochart/movalid';

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
    axisLine: validators.boolean(),
    axisLineFront: validators.boolean(),
    axisLineMargin: validators.numberMin(0),
    axisLineStyle: styleStates(lineMembers),

    backgroundStyle: validators.style(),
    backgroundFront: validators.boolean(),

    side: validators.oneOf(SIDES),

    collapsed: validators.boolean(),

    focusRange: validators.boolean(),
    focusRangeFront: validators.boolean(),
    focusRangeApplyToTitle: validators.boolean(),
    focusRangeStyle: styleShape(styleMembers, false),

    focusTickMarks: validators.boolean(),
    focusTickMarksFront: validators.boolean(),
    focusTickMarkSize: validators.numberMin(0),
    focusTickMarkMargin: validators.numberMin(0),
    focusTickMarkStyle: styleShape(['strokeColor', 'strokeOpacity', 'strokeWidth', 'strokeDashArray'], false),

    gridLines: validators.boolean(),
    gridLinesFront: validators.boolean(),
    gridLineStyle: styleStates(lineMembers),

    marginInner: validators.numberMin(0),
    marginOuter: validators.numberMin(0),

    maxTickCount: validators.integerMin(0),

    minTickSpacing: validators.numberMin(0),
    minTickInterval: validators.numberMin(0),

    paddingInner: validators.numberMin(0),
    paddingOuter: validators.numberMin(0),

    thresholds: validators.arrayOf(validators.objectWithShape({
      value: validators.dateAny(),
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

    tickMarks: validators.boolean(),
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
