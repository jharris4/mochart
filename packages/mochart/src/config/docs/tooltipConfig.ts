import type { NestedDescription } from './shared';

// Not the shared style prose: the tooltip is html, so an opacity is composited into its color rather
// than written as a separate svg attribute.
const backgroundStyle: NestedDescription = {
  description: 'the styles to apply to the tooltip box (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))',
  properties: {
    strokeColor: 'the color of the border around the tooltip (use null for none)',
    strokeOpacity: 'the opacity (0 - 1) to composite into the border color, or null to use the color exactly as written',
    strokeWidth: 'the width (in pixels) of the border around the tooltip (use null for none)',
    fillColor: 'the background color for the interior of the tooltip (use null for none)',
    fillOpacity: 'the opacity (0 - 1) to composite into the background color, or null to use the color exactly as written'
  }
};

export default function getDescriptions() {
  return {
    visible: 'whether or not to show the tooltip',
    applyFocus: 'whether to change the focused group as the tooltip is shown or hidden',
    snapToGroup: 'whether the tooltip should be centered at the closest group value (true) or at the click/tap position (false)',
    mouseOver: 'whether the tooltip should track the mouse position in the chart drawing area',
    closeOnClick: 'whether to hide the tooltip when the user clicks/taps within it',
    filterOnSeriesClick: 'whether series should be filtered when the user clicks/taps on them in the tooltip',
    focusOnGroupClick: 'whether group values should be focused when the user clicks/taps on them in the tooltip',
    focusOnSeriesClick: 'whether series should be focused when the user clicks/taps on them in the tooltip',
    focusOnGroupMouseOver: 'whether group values should be focused when the user mouses over them in the tooltip',
    focusOnSeriesMouseOver: 'whether series should be focused when the user mouses over them in the tooltip',
    showGroup: 'whether the group value should be shown as the first line of the tooltip',
    showControls: 'whether the focus/filter controls should be shown at the top of the tooltip',
    keepInside: 'whether to keep the tooltip within the series drawing area (true) or allow it to overlap the axes (false)',
    minWidth: 'the minimum width (in pixels) for the tooltip',
    padding: 'the padding (in pixels) to show on each side of the tooltip',
    linePadding: 'the padding (in pixels) betwen each line of the tooltip',
    alignValues: 'whether to right-align the values shown in the tooltip',
    backgroundStyle,
    borderRadius: 'the radius (in pixels) of the corners of the tooltip',
    dropShadowColor: 'the color of the drop shadow effect used for the tooltip',
    dropShadowOffsetX: 'the x offset (in pixels) of the drop shadow effect used for the tooltip',
    dropShadowOffsetY: 'the y offset (in pixels) of the drop shadow effect used for the tooltip',
    dropShadowBlurRadius: 'the blur radius (in pixels) of the drop shadow effect used for the tooltip',
    showIconColors: 'whether to show series colors next to series titles in the tooltip',
    showIconShapes: 'whether to show series marker shape next to series titles in the tooltip',
    showIconPlaceholders: 'whether to show placeholder icons next to the series titles in the tooltip',
    iconSize: 'the width and height (in pixels) of the series icons, or "auto" to match the inherited font size',
    iconSpacerSize: 'the horizontal space (in pixels) to show between series icons and titles',
    iconBorderSize: 'the width (in pixels) of the border drawn around series icons',
    iconBorderColor: 'the color of the border drawn around series icons',
    iconBorderOpacity: 'the opacity (0 - 1) of the border drawn around series icons',
    iconFilteredColor: 'the color to use for the series icon when the corresponding series is filtered',
    iconUnfilteredColor: 'the color to use for the placeholder series icons when the corresponding series is not filtered',
    showFilteringOnLabels: 'whether to strike through the label text of filtered series',
    adjustForFiltering: 'whether to adjust the series values when series filtering changes',
    adjustSizeForFiltering: 'whether to adjust the width of the tooltip when the series values change due to filtering changes',
    hideFiltered: 'whether to hide series that have been filtered from the tooltip',
    showMissingValues: 'whether to show series that do not have defined values in the tooltip',
    missingValueText: 'the text to show for series that do not have defined values',
    filteredValueText: 'the text to show for series that have been filtered (use null for none)',
    filteredValueCharacter: 'the character to show in place of each digit of a series value that has been filtered (use null for none)',
    rangeValueText: 'the text to use when joining the values for a series that has more than one value'
  };
}

export function getDetails() {
  return {
    showFilteringOnLabels: 'When `true`, the label of a series that has been filtered out of the chart is drawn with a line through it. The strike-through covers the label only, so the value beside it stays legible — except when `alignValues` is `false`, where the label and the value are one piece of text and both are struck.'
  };
}
