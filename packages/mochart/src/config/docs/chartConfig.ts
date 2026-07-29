export default function getDescriptions() {
  return {
    type: 'the type of chart to render: an x/y plot with axes (xy) or a pie/donut chart (pie)',
    margin: 'the margin (in pixels) for the top, right, bottom and left sides of the chart',
    padding: 'the padding (in pixels) for the top, right, bottom and left sides of the chart',
    backgroundStyle: 'the styles to apply to the chart background (stroke, strokeOpacity, strokeWidth, fill, fillOpacity (use null for none))'
  };
}
