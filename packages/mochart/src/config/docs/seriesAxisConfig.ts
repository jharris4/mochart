import getAxisDescriptions from './axisConfig';

export default function getDescriptions() {
  return {
    ...getAxisDescriptions(),
    id: 'the unique identifier for the series axis so it can be referenced by series that belong to it',
    type: 'the type of the series axis, must be number',
    scale: 'the scale of the series axis, must be linear',
    order: 'the unique order number of the series axis controlling its order of appearance',
    base: 'the numeric base value of the axis, used for animation and relative positioning for shapes (use null for none)',
    baseLine: 'whether to show a line along the base of the axis',
    baseLineFront: 'whether the base line should be shown in front (true) or behind (false) the series shapes',
    baseLineWidth: 'the stroke width (in pixels) of the line shown along the base of the axis',
    baseLineDashArray: 'the dash array pattern to use when drawing the line shown along the base of the axis',
    baseLineColor: 'the color to use when drawing the line shown along the base of the axis',
    baseLineFocusedColor: 'the color to use when drawing the line shown along the base of the focused axis',
    baseLineDefocusedColor: 'the color to use when drawing the line shown along the base of the defocused axis',
    baseLineOpacity: 'the opacity (0 - 1) of the line shown along the base of the axis',
    baseLineFocusedOpacity: 'the opacity (0 - 1) of the line shown along the base of the focused axis',
    baseLineDefocusedOpacity: 'the opacity (0 - 1) of the line shown along the base of the defocused axis',
    adjustForSuppression: 'whether to adjust the domain of the axis as series belonging to it are suppressed',
    adjustTickLabelSizeForSuppression: 'whether to adjust the size of the axis tick label bounds as series belonging to it are suppressed',
    alwaysVisible: 'whether the axis should be visible when all series belonging to it are suppressed',
    tickLabelFormat: 'the d3 format string to be applied to the series values when displayed in axis tick labels (use null for none, use "auto" to derive from data)',
    ticks: 'the explicit ticks to show on the axis in place of the generated ones, each { value, label } placing label text at an axis value (label falls back to the formatted value, use null for none)',
    maxMarginPercent: 'the percentage margin (0 or greater) relative to the domain of the axis to use at the maximum extent of the axis (only applied if max is "auto" and max value is not equal base)',
    minMarginPercent: 'the percentage margin (0 or greater) relative to the domain of the axis to use at the minimum extent of the axis (only applied if min is "auto" and min value is not equal base)',
    focusOnMouseOver: 'whether the series axis should be focused whenever the user mouses over a part of it in the chart',
    focusOnClick: 'whether the series axis should be focused whenever the user clicks/taps a part of it in the chart',
    useSeriesFocus: 'whether to show the axis as focused when any series belonging to is focused',
  };
}
export function getDetails() {
  return {
    id: 'Referenced by `seriesConfigs.axis` (and `seriesStackConfigs.axis`) to assign series to this axis. With a single axis the ids can be omitted everywhere.',
    min: 'With `"auto"` the minimum is computed from the data (including stacking) on every update, and changes animate through the staged axis expansion/contraction phases. Set a number to pin the bound instead.',
    max: 'With `"auto"` the maximum is computed from the data (including stacking) on every update, and changes animate through the staged axis expansion/contraction phases. Set a number to pin the bound instead.',
    softMin: 'A lower bound that only applies while no data value is below it — the axis covers at least this value, but real data smaller than it still expands the domain. Unlike `min`, it never clips data.',
    softMax: 'An upper bound that only applies while no data value is above it — the axis covers at least this value, but real data larger than it still expands the domain. Unlike `max`, it never clips data.',
    base: 'The value that bars and areas grow from, and the resting position shapes animate from/to when series enter or leave. With mixed positive/negative data the base separates the two directions.',
    ticks: 'Replaces the automatic tick generation entirely: tick counts, intervals and domain-edge ticks are ignored. Useful for naming fixed positions, e.g. heatmap row bands or threshold levels. Ticks outside the current axis domain are hidden.',
    maxMarginPercent: 'The margin is relative to the pre-margin domain, so values above 1 are allowed and confine the data to a band of the plot: a margin of 4 leaves the data in the bottom fifth — how the candlestick/OHLC volume pane reserves the upper plot for the price axis.',
    minMarginPercent: 'The margin is relative to the pre-margin domain, so values above 1 are allowed and confine the data to a band of the plot: a price axis with margin 1/3 keeps its data in the top three quarters, leaving the bottom for a volume pane.'
  };
}
