import { style, spacing } from './shared';

export default function getDescriptions() {
  return {
    type: 'the type of chart to render: an x/y plot with axes (xy) or a pie/donut chart (pie)',
    margin: spacing('the margin (in pixels) for the top, right, bottom and left sides of the chart'),
    padding: spacing('the padding (in pixels) for the top, right, bottom and left sides of the chart'),
    backgroundStyle: style('the styles to apply to the chart background (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))')
  };
}
