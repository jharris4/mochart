import { AUTO, NONE, ELLIPSIS, COLOR_CURRENT, COLOR_SAME } from '../core/constants';

export default function getDefaults() {
  return {
    axisLine: true,
    axisLineFront: false,
    axisLineWidth: 1,
    axisLineDashArray: NONE,
    axisLineMargin: 0,
    axisLineStyle: {
      normal: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.65 },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 0.65 },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 0.325 }
    },

    backgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, fillColor: NONE, fillOpacity: 0 },
    backgroundFront: false,

    before: true,

    collapsed: false,

    focusRange: true,
    focusRangeFront: false,
    focusRangeApplyToTitle: false,
    // 0.2 / 0.12 matches the old '#000033' / '#aaccff' wash on a light page and stays legible on a dark one.
    focusRangeStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.2, strokeWidth: 1, fillColor: COLOR_CURRENT, fillOpacity: 0.12 },
    focusRangeDashArray: NONE,

    focusTickMarks: false,
    focusTickMarksFront: false,
    focusTickMarkSize: 9,
    focusTickMarkMargin: 3,
    focusTickMarkStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 1, strokeWidth: 3 },

    gridLines: false,
    gridLinesFront: false,
    gridLineWidth: 1,
    gridLineDashArray: '5, 5',
    // The old '#e5e5e5' at 0.75 over white is about '#ececec'; currentColor at
    // 0.13 sits between matching that on a light page and matching a dark
    // page's grid, so one value reads as a grid line in either theme.
    gridLineStyle: {
      normal: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.13 },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 0.17 },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 0.09 }
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

    threshold: NONE,
    thresholdFront: true,
    thresholdTitle: NONE,
    thresholdTitleBefore: false,
    thresholdTitleSnapToValue: true,
    thresholdTitleMargin: { top: 0, right: 0, bottom: 0, left: 0 },
    thresholdTitlePadding: { top: 0, right: 0, bottom: 0, left: 0 },
    // 'none' rather than null: stroke="none" firewalls a host-css stroke inheriting onto the text.
    thresholdTitleTextStyle: {
      normal: { strokeColor: 'none', strokeOpacity: 1, strokeWidth: NONE, fillColor: COLOR_CURRENT, fillOpacity: 1 },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 1, strokeWidth: NONE, fillColor: COLOR_SAME, fillOpacity: 1 },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 1, strokeWidth: NONE, fillColor: COLOR_SAME, fillOpacity: 1 }
    },
    thresholdTitleBackgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, fillColor: NONE, fillOpacity: 0 },
    thresholdWidth: 1,
    thresholdDashArray: NONE,
    thresholdStyle: {
      normal: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.65 },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 0.65 },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 0.325 }
    },

    tickCount: AUTO,

    tickLabelFront: false,
    tickLabelAnchor: AUTO,
    tickLabelBackgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, fillColor: NONE, fillOpacity: 0 },
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
      normal: { strokeColor: 'none', strokeOpacity: 1, strokeWidth: 0, fillColor: COLOR_CURRENT, fillOpacity: 1 },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 1, strokeWidth: 0, fillColor: COLOR_SAME, fillOpacity: 1 },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 0.5, strokeWidth: 0, fillColor: COLOR_SAME, fillOpacity: 0.5 }
    },

    tickMarks: true,
    tickMarkFront: false,
    tickMarkSize: 3,
    tickMarkMargin: 0,
    tickMarkWidth: 1,
    tickMarkStyle: {
      normal: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.65 },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 0.65 },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 0.325 }
    },

    title: NONE,
    titleFront: false,
    titleBackgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, fillColor: NONE, fillOpacity: 0 },
    titleTruncationEnabled: true,
    titleTruncationValue: ELLIPSIS,
    titleSize: AUTO,
    titleMarginInner: 2,
    titleMarginOuter: 2,
    titlePaddingInner: 3,
    titlePaddingOuter: 3,
    titleTextStyle: {
      normal: { strokeColor: 'none', strokeOpacity: 1, strokeWidth: 0, fillColor: COLOR_CURRENT, fillOpacity: 1 },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 1, strokeWidth: 0, fillColor: COLOR_SAME, fillOpacity: 1 },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 0.5, strokeWidth: 0, fillColor: COLOR_SAME, fillOpacity: 0.5 }
    },
    visible: true
  };
}
