import { style, spacing } from './shared';
import { getDescriptions as getSeriesIconDescriptions } from './seriesIconConfig';

export default function getDescriptions() {
  return {
    visible: 'whether the legend should be visible',
    position: 'the position of the legend relative to the chart (top or bottom)',
    truncationEnabled: 'whether to use text truncation when a legend item width exceeds the width of the chart',
    truncationValue: 'the truncation text to append to legend item text when its length exceeds the length of the chart',
    alignedToAxes: 'whether the legend should be centered between the axes (true) or the chart bounds (false)',
    align: 'the alignment for the legend (left, center, right)',
    margin: spacing('the margin (in pixels) for the top, right, bottom and left sides of the legend'),
    padding: spacing('the padding (in pixels) for the top, right, bottom and left sides of the legend'),
    backgroundStyle: style('the styles to apply to the legend background (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))'),
    itemMargin: spacing('the margin (in pixels) for the top, right, bottom and left sides of the legend items'),
    itemPadding: spacing('the padding (in pixels) for the top, right, bottom and left sides of the legend items'),
    itemBackgroundStyle: style('the styles to apply to the legend item backgrounds (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))'),
    itemTextStyle: style('the styles to apply to the legend item text (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none), use "currentColor" to follow the host page\'s css color and theme)'),
    ...getSeriesIconDescriptions('legend', 'the legend text font size'),
    showFilteringOnLabels: 'whether to strike through the item text of filtered series',
    focusOnMouseOver: 'whether to focus a series when the mouse is moved over the series icon or title',
    focusOnClick: 'whether to focus a series when the series icon or title is clicked',
    filterOnClick: 'whether to filter a series when the series icon or title is clicked'
  };
}
export function getDetails() {
  return {
    showFilteringOnLabels: 'When `true`, the item text of a series that has been filtered out of the chart is drawn with a line through it, so the legend shows at a glance which series are filtered. The strike-through covers the item text only, never its color icon — the icon already says the same thing by going hollow.',
    filterOnClick: 'When `true`, clicking a legend item toggles its series out of (and back into) the chart, playing the staged series transition; the item stays in the legend so it can be restored. `onSeriesFilter` reports every change.',
    focusOnMouseOver: 'When `true`, hovering a legend item focuses its series: the series gets its focused styling and every other series gets its defocused styling. `onFocus` reports focus changes.',
    focusOnClick: 'When `true`, clicking a legend item focuses its series (see `focusOnMouseOver`). Combine with `filterOnClick` deliberately — with both enabled a click filters and focuses.'
  };
}
