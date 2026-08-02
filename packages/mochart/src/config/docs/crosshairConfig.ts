import { partialStyle } from './shared';

const lineMembers = ['strokeColor', 'strokeOpacity', 'strokeWidth'];

export default function getDescriptions() {
  return {
    visible: 'whether or not crosshairs should be shown when a group or series is focused',
    applyFocus: 'whether to change the focused group as the crosshairs are shown or hidden',
    showGroup: 'whether or not crosshair lines for focused groups should be shown',
    showSeries: 'whether or not crosshair lines for focused series should be shown',
    groupLineStyle: partialStyle('the style of the crosshair lines shown for the focused group', lineMembers),
    seriesLineStyle: partialStyle('the style of the crosshair lines shown for the focused series', lineMembers),
    lineDashArray: 'the dash array pattern to use when drawing the crosshair lines (use null for none)',
    showBehindTooltip: 'whether to show the crosshair lines for sections where they are overlapped by the tooltip'
  };
}
