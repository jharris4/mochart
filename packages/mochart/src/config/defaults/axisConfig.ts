import { AUTO, NONE, ELLIPSIS, COLOR_CURRENT, COLOR_SAME, SIDE_START, TITLE_SIDE_HIGH } from '../core/constants';
import { deepMerge } from '../core/deepMerge';
import type { StrokeStyleStates, Style, StyleStates, ThresholdConfig } from '../../types/config';
import type { MarginPadding } from '../../types/geometry';
import type { ThresholdTitleSide } from '../core/constants';

export default function getDefaults() {
  return {
    showAxisLine: true,
    axisLineFront: false,
    axisLineMargin: 0,
    axisLineStyle: {
      normal: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.65, strokeWidth: 1, strokeDashArray: NONE },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 0.65, strokeWidth: COLOR_SAME, strokeDashArray: COLOR_SAME },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 0.325, strokeWidth: COLOR_SAME, strokeDashArray: COLOR_SAME }
    },

    backgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, strokeDashArray: NONE, fillColor: NONE, fillOpacity: 0 },
    backgroundFront: false,

    side: SIDE_START,

    collapsed: false,

    showFocusRange: true,
    focusRangeFront: false,
    focusRangeApplyToTitle: false,
    // 0.2 / 0.12 matches the old '#000033' / '#aaccff' wash on a light page and stays legible on a dark one.
    focusRangeStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.2, strokeWidth: 1, strokeDashArray: NONE, fillColor: COLOR_CURRENT, fillOpacity: 0.12 },

    showFocusTickMarks: false,
    focusTickMarkFront: false,
    focusTickMarkSize: 9,
    focusTickMarkMargin: 3,
    focusTickMarkStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 1, strokeWidth: 3, strokeDashArray: NONE },

    showGridLines: false,
    gridLineFront: false,
    // The old '#e5e5e5' at 0.75 over white is about '#ececec'; currentColor at
    // 0.13 sits between matching that on a light page and matching a dark
    // page's grid, so one value reads as a grid line in either theme.
    gridLineStyle: {
      normal: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.13, strokeWidth: 1, strokeDashArray: '5, 5' },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 0.17, strokeWidth: COLOR_SAME, strokeDashArray: COLOR_SAME },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 0.09, strokeWidth: COLOR_SAME, strokeDashArray: COLOR_SAME }
    },

    marginInner: 0,
    marginOuter: 1,

    max: AUTO,
    maxOffset: 0,

    maxTickCount: 10,

    min: AUTO,
    minOffset: 0,

    minTickSpacing: 12,
    minTickInterval: 0,

    paddingInner: 0,
    paddingOuter: 1,

    softMin: NONE,
    softMax: NONE,

    thresholds: [],

    tickCount: AUTO,

    tickLabelFront: false,
    tickLabelAnchor: AUTO,
    tickLabelBackgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, strokeDashArray: NONE, fillColor: NONE, fillOpacity: 0 },
    tickLabelSize: AUTO,
    tickLabelMarginInner: 2,
    tickLabelMarginOuter: 1,
    tickLabelPaddingInner: 5,
    tickLabelPaddingOuter: 5,
    tickLabelFormat: AUTO,
    tickLabelPrefix: NONE,
    tickLabelSuffix: NONE,
    tickLabelRotation: 0,
    tickLabelTextStyle: {
      normal: { strokeColor: 'none', strokeOpacity: 1, strokeWidth: 0, strokeDashArray: NONE, fillColor: COLOR_CURRENT, fillOpacity: 1 },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 1, strokeWidth: 0, strokeDashArray: COLOR_SAME, fillColor: COLOR_SAME, fillOpacity: 1 },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 0.5, strokeWidth: 0, strokeDashArray: COLOR_SAME, fillColor: COLOR_SAME, fillOpacity: 0.5 }
    },

    showTickMarks: true,
    tickMarkFront: false,
    tickMarkSize: 3,
    tickMarkMargin: 0,
    tickMarkStyle: {
      normal: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.65, strokeWidth: 1, strokeDashArray: NONE },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 0.65, strokeWidth: COLOR_SAME, strokeDashArray: COLOR_SAME },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 0.325, strokeWidth: COLOR_SAME, strokeDashArray: COLOR_SAME }
    },

    title: NONE,
    titleFront: false,
    titleBackgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, strokeDashArray: NONE, fillColor: NONE, fillOpacity: 0 },
    titleTruncationEnabled: true,
    titleTruncationValue: ELLIPSIS,
    titleSize: AUTO,
    titleMarginInner: 2,
    titleMarginOuter: 2,
    titlePaddingInner: 3,
    titlePaddingOuter: 3,
    titleTextStyle: {
      normal: { strokeColor: 'none', strokeOpacity: 1, strokeWidth: 0, strokeDashArray: NONE, fillColor: COLOR_CURRENT, fillOpacity: 1 },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 1, strokeWidth: 0, strokeDashArray: COLOR_SAME, fillColor: COLOR_SAME, fillOpacity: 1 },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 0.5, strokeWidth: 0, strokeDashArray: COLOR_SAME, fillColor: COLOR_SAME, fillOpacity: 0.5 }
    },
    visible: true
  };
}

/** The defaults merged under each `thresholds` entry (the array itself replaces wholesale). */
export function getThresholdEntryDefaults() {
  return {
    front: true,
    style: {
      normal: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.65, strokeWidth: 1, strokeDashArray: NONE },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 0.65, strokeWidth: COLOR_SAME, strokeDashArray: COLOR_SAME },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 0.325, strokeWidth: COLOR_SAME, strokeDashArray: COLOR_SAME }
    },
    title: NONE,
    titleSide: TITLE_SIDE_HIGH,
    titleSnapToValue: true,
    titleMargin: { top: 0, right: 0, bottom: 0, left: 0 },
    titlePadding: { top: 0, right: 0, bottom: 0, left: 0 },
    // 'none' rather than null: stroke="none" firewalls a host-css stroke inheriting onto the text.
    titleTextStyle: {
      normal: { strokeColor: 'none', strokeOpacity: 1, strokeWidth: NONE, strokeDashArray: NONE, fillColor: COLOR_CURRENT, fillOpacity: 1 },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 1, strokeWidth: NONE, strokeDashArray: COLOR_SAME, fillColor: COLOR_SAME, fillOpacity: 1 },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 1, strokeWidth: NONE, strokeDashArray: COLOR_SAME, fillColor: COLOR_SAME, fillOpacity: 1 }
    },
    titleBackgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, strokeDashArray: NONE, fillColor: NONE, fillOpacity: 0 }
  };
}

/** A `thresholds` entry with every member filled from the entry defaults. */
export interface ResolvedThreshold {
  /** A number, or an ISO date string on date axes (validated by datePrimitive); other strings never validate or render. */
  value: number | string;
  front: boolean;
  style: StrokeStyleStates;
  title: string | null;
  titleSide: ThresholdTitleSide;
  titleSnapToValue: boolean;
  titleMargin: MarginPadding;
  titlePadding: MarginPadding;
  titleTextStyle: StyleStates;
  titleBackgroundStyle: Style;
}

export function resolveThresholds(thresholds: readonly ThresholdConfig[] | undefined): ResolvedThreshold[] {
  if (!Array.isArray(thresholds)) {
    return [];
  }
  return thresholds
    .filter(entry => entry !== null && typeof entry === 'object' && (typeof entry.value === 'number' || typeof entry.value === 'string'))
    .map(entry => deepMerge(getThresholdEntryDefaults(), entry as Record<string, unknown>) as unknown as ResolvedThreshold);
}
