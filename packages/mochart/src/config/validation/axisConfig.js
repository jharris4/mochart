import validators from './validators';

import { AUTO, NONE, ANCHORS } from '../core/constants';

export default function getValidators() {
  return {
    axisLine: validators.boolean(),
    axisLineFront: validators.boolean(),
    axisLineDashArray: validators.dashArray().orEqual(NONE),
    axisLineMargin: validators.numberMin(0),
    axisLineWidth: validators.numberMin(0),
    /* focus start */
    axisLineColor: validators.svgColor(),
    axisLineFocusedColor: validators.svgColor(),
    axisLineDefocusedColor: validators.svgColor(),
    /* focus end */
    /* focus start */
    axisLineOpacity: validators.opacity(),
    axisLineFocusedOpacity: validators.opacity(),
    axisLineDefocusedOpacity: validators.opacity(),
    /* focus end */

    backgroundStyle: validators.style(),
    backgroundFront: validators.boolean(),

    before: validators.boolean(),

    collapsed: validators.boolean(),

    focusRange: validators.boolean(),
    focusRangeFront: validators.boolean(),
    focusRangeApplyToTitle: validators.boolean(),
    focusRangeStrokeColor: validators.svgColor(),
    focusRangeFillColor: validators.svgColor(),
    focusRangeStrokeOpacity: validators.opacity(),
    focusRangeFillOpacity: validators.opacity(),
    focusRangeStrokeWidth: validators.numberMin(0),
    focusRangeDashArray: validators.dashArray().orEqual(NONE),

    focusTickMarks: validators.boolean(),
    focusTickMarksFront: validators.boolean(),
    focusTickMarkSize: validators.numberMin(0),
    focusTickMarkMargin: validators.numberMin(0),
    focusTickMarkWidth: validators.numberMin(0),
    focusTickMarkColor: validators.svgColor(),
    focusTickMarkOpacity: validators.opacity(),

    gridLines: validators.boolean(),
    gridLinesFront: validators.boolean(),
    /* focus start */
    gridLineColor: validators.svgColor(),
    gridLineFocusedColor: validators.svgColor(),
    gridLineDefocusedColor: validators.svgColor(),
    /* focus end */
    gridLineDashArray: validators.dashArray().orEqual(NONE),
    /* focus start */
    gridLineOpacity: validators.opacity(),
    gridLineFocusedOpacity: validators.opacity(),
    gridLineDefocusedOpacity: validators.opacity(),
    /* focus end */
    gridLineWidth: validators.numberMin(0),

    marginInner: validators.numberMin(0),
    marginOuter: validators.numberMin(0),

    maxTickCount: validators.integerMin(0),

    minTickSpacing: validators.numberMin(0),
    minTickInterval: validators.numberMin(0),

    paddingInner: validators.numberMin(0),
    paddingOuter: validators.numberMin(0),

    thresholdFront: validators.boolean(),
    thresholdTitle: validators.string().orEqual(NONE),
    thresholdTitleBefore: validators.boolean(),
    thresholdTitleSnapToValue: validators.boolean(),
    thresholdTitleMargin: validators.margin(),
    thresholdTitlePadding: validators.padding(),
    thresholdTitleStrokeColor: validators.svgColor(),
    thresholdTitleFocusedStrokeColor: validators.svgColor(),
    thresholdTitleDefocusedStrokeColor: validators.svgColor(),
    thresholdTitleFillColor: validators.svgColor(),
    thresholdTitleFocusedFillColor: validators.svgColor(),
    thresholdTitleDefocusedFillColor: validators.svgColor(),
    thresholdTitleStrokeOpacity: validators.opacity(),
    thresholdTitleFocusedStrokeOpacity: validators.opacity(),
    thresholdTitleDefocusedStrokeOpacity: validators.opacity(),
    thresholdTitleFillOpacity: validators.opacity(),
    thresholdTitleFocusedFillOpacity: validators.opacity(),
    thresholdTitleDefocusedFillOpacity: validators.opacity(),
    thresholdTitleBackgroundStyle: validators.style(),
    thresholdWidth: validators.numberMin(0),
    thresholdDashArray: validators.dashArray().orEqual(NONE),
    thresholdColor: validators.svgColor(),
    thresholdFocusedColor: validators.svgColor(),
    thresholdDefocusedColor: validators.svgColor(),
    thresholdOpacity: validators.opacity(),
    thresholdFocusedOpacity: validators.opacity(),
    thresholdDefocusedOpacity: validators.opacity(),

    tickCount: validators.integerMin(0).orEqual(AUTO),

    tickLabelFront: validators.boolean(),
    tickLabelBackgroundStyle: validators.style(),
    tickLabelSize: validators.numberMin(0).orEqual(AUTO),
    tickLabelMarginInner: validators.numberMin(0),
    tickLabelMarginOuter: validators.numberMin(0),
    tickLabelPaddingInner: validators.numberMin(0),
    tickLabelPaddingOuter: validators.numberMin(0),
    tickLabelStrokeWidth: validators.numberMin(0),
    tickLabelPrefix: validators.string().orEqual(NONE),
    tickLabelSuffix: validators.string().orEqual(NONE),
    tickLabelRotation: validators.numberMinMax(-90, 90),
    tickLabelAnchor: validators.oneOf(ANCHORS.concat([AUTO])),
    /* focus start */
    tickLabelStrokeColor: validators.svgColor(),
    tickLabelFocusedStrokeColor: validators.svgColor(),
    tickLabelDefocusedStrokeColor: validators.svgColor(),
    /* focus end */
    /* focus start */
    tickLabelFillColor: validators.svgColor(),
    tickLabelFocusedFillColor: validators.svgColor(),
    tickLabelDefocusedFillColor: validators.svgColor(),
    /* focus end */
    /* focus start */
    tickLabelStrokeOpacity: validators.opacity(),
    tickLabelFocusedStrokeOpacity: validators.opacity(),
    tickLabelDefocusedStrokeOpacity: validators.opacity(),
    /* focus end */
    /* focus start */
    tickLabelFillOpacity: validators.opacity(),
    tickLabelFocusedFillOpacity: validators.opacity(),
    tickLabelDefocusedFillOpacity: validators.opacity(),
    /* focus end */

    tickMarks: validators.boolean(),
    tickMarkFront: validators.boolean(),
    tickMarkSize: validators.numberMin(0),
    tickMarkMargin: validators.numberMin(0),
    tickMarkWidth: validators.numberMin(0),
    /* focus start */
    tickMarkColor: validators.svgColor(),
    tickMarkFocusedColor: validators.svgColor(),
    tickMarkDefocusedColor: validators.svgColor(),
    /* focus end */
    /* focus start */
    tickMarkOpacity: validators.opacity(),
    tickMarkFocusedOpacity: validators.opacity(),
    tickMarkDefocusedOpacity: validators.opacity(),
    /* focus end */

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
    titleStrokeWidth: validators.numberMin(0),
    /* focus start */
    titleStrokeColor: validators.svgColor(),
    titleFocusedStrokeColor: validators.svgColor(),
    titleDefocusedStrokeColor: validators.svgColor(),
    /* focus end */
    /* focus start */
    titleFillColor: validators.svgColor(),
    titleFocusedFillColor: validators.svgColor(),
    titleDefocusedFillColor: validators.svgColor(),
    /* focus end */
    /* focus start */
    titleStrokeOpacity: validators.opacity(),
    titleFocusedStrokeOpacity: validators.opacity(),
    titleDefocusedStrokeOpacity: validators.opacity(),
    /* focus end */
    /* focus start */
    titleFillOpacity: validators.opacity(),
    titleFocusedFillOpacity: validators.opacity(),
    titleDefocusedFillOpacity: validators.opacity(),
    /* focus end */

    visible: validators.boolean()
  };
}
