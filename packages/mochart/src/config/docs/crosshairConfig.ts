export default function getDescriptions() {
  return {
    visible: 'whether or not crosshairs should be shown when a group or series is focused',
    applyFocus: 'whether to change the focused group as the crosshairs are shown or hidden',
    showGroup: 'whether or not crosshair lines for focused groups should be shown',
    showSeries: 'whether or not crosshair lines for focused series should be shown',
    lineColor: 'the color to use when showing the crosshair lines',
    lineWidth: 'the stroke width (in pixels) of the crosshair lines',
    lineDashArray: 'the dash array pattern to use when drawing the crosshair lines (use null for none)',
    showBehindTooltip: 'whether to show the crosshair lines for sections where they are overlapped by the tooltip'
  };
}