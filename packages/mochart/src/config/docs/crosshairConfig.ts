import { partialStyle } from './shared';

const lineMembers = ['strokeColor', 'strokeOpacity', 'strokeWidth'];

export default function getDescriptions() {
  return {
    visible: 'whether or not crosshairs should be shown when a category or series is focused',
    applyFocus: 'whether to change the focused category as the crosshairs are shown or hidden',
    showCategory: 'whether or not crosshair lines for focused categories should be shown',
    showSeries: 'whether or not crosshair lines for focused series should be shown',
    categoryLineStyle: partialStyle('the style of the crosshair lines shown for the focused category', lineMembers),
    seriesLineStyle: partialStyle('the style of the crosshair lines shown for the focused series', lineMembers),
    lineDashArray: 'the dash array pattern to use when drawing the crosshair lines (use null for none)',
    showBehindTooltip: 'whether to show the crosshair lines for sections where they are overlapped by the tooltip'
  };
}
