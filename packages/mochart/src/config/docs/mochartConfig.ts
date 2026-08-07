export default function getDescriptions() {
  return {
    version: 'The version of the configuration format (optional: omitted means the current format; include it in stored or shared configs so future releases can migrate them)',
    id: 'An optional identifier for the config (any value, not interpreted by the chart)',
    accessibility: 'Configure the chart accessibility features and screen-reader labels',
    animation: 'Configure the chart animation settings',
    chart: 'Configure general settings of the chart',
    colorPalette: 'Configure the color palettes to use for collections of series',
    crosshair: 'Configure the crosshair styling and behavior when a category and/or series is focused',
    categoryAxis: 'Configure the chart category axis content and styling',
    legend: 'Configure the chart legend which itemizes the series',
    linearGradients: 'Configure linear gradients to be applied to series',
    linearGradientDefaults: 'Configure common properties for all linear gradients',
    pie: 'Configure the pie/donut slice geometry and slice labels (applies when chart.type is pie)',
    plot: 'Configure the chart plot content and styling',
    radialGradients: 'Configure radial gradients to be applied to series',
    radialGradientDefaults: 'Configure common properties for all radial gradients',
    valueAxes: 'Configure the chart value axes content and styling',
    valueAxisDefaults: 'Configure common properties for all value axes',
    series: 'Configure the chart series',
    seriesDefaults: 'Configure common properties for all series',
    seriesGroups: 'Configure the grouping of series',
    seriesGroupDefaults: 'Configure common properties for all series groups',
    seriesStacks: 'Configure the stacking of series',
    seriesStackDefaults: 'Configure common properties for all series stacks',
    title: 'Configure the chart title',
    tooltip: 'Configure the chart tooltip styling and behavior'
  };
}