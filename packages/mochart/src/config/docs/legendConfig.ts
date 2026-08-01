export default function getDescriptions() {
  return {
    visible: 'whether the legend should be visible',
    position: 'the position of the legend relative to the chart (top or bottom)',
    truncationEnabled: 'whether to use text truncation when a legend item width exceeds the width of the chart',
    truncationValue: 'the truncation text to append to legend item text when its length exceeds the length of the chart',
    alignedToAxes: 'whether the legend should be centered between the axes (true) or the chart bounds (false)',
    align: 'the alignment for the legend (left, center, right)',
    margin: 'the margin (in pixels) for the top, right, bottom and left sides of the legend',
    padding: 'the padding (in pixels) for the top, right, bottom and left sides of the legend',
    backgroundStyle: 'the styles to apply to the legend background (stroke, strokeOpacity, strokeWidth, fill, fillOpacity (use null for none))',
    itemMargin: 'the margin (in pixels) for the top, right, bottom and left sides of the legend items',
    itemPadding: 'the padding (in pixels) for the top, right, bottom and left sides of the legend items',
    itemBackgroundStyle: 'the styles to apply to the legend item backgrounds (stroke, strokeOpacity, strokeWidth, fill, fillOpacity (use null for none))',
    itemTextStyle: 'the styles to apply to the legend item text (stroke, strokeOpacity, strokeWidth, fill, fillOpacity (use null for none), use "currentColor" to follow the host page\'s css color and theme)',
    showIconColors: 'whether to show series colors next to series titles in the legend',
    showIconShapes: 'whether to show series marker shape next to series titles in the legend',
    showIconPlaceholders: 'whether to show placeholder icons next to the series titles in the legend',
    iconSize: 'the width and height (in pixels) of the series icons, or "auto" to match the measured legend text height',
    iconSpacerSize: 'the horizontal space (in pixels) to show between series icons and titles',
    iconBorderSize: 'the width (in pixels) of the border drawn around series icons',
    iconBorderColor: 'the color of the border drawn around series icons',
    iconSuppressedColor: 'the color to use for the series icon when the corresponding series is suppressed',
    iconUnsuppressedColor: 'the color to use for the placeholder series icons when the corresponding series is not suppressed',
    focusOnMouseOver: 'whether to focus a series when the mouse is moved over the series icon or title',
    focusOnClick: 'whether to focus a series when the series icon or title is clicked',
    filterOnClick: 'whether to suppress a series when the series icon or title is clicked'
  };
}
export function getDetails() {
  return {
    filterOnClick: 'When `true`, clicking a legend item toggles its series out of (and back into) the chart, playing the staged series transition; the item stays in the legend so it can be restored. `onSeriesFilter` reports every change.',
    focusOnMouseOver: 'When `true`, hovering a legend item focuses its series: the series gets its focused styling and every other series gets its defocused styling. `onFocus` reports focus changes.',
    focusOnClick: 'When `true`, clicking a legend item focuses its series (see `focusOnMouseOver`). Combine with `filterOnClick` deliberately — with both enabled a click filters and focuses.'
  };
}
