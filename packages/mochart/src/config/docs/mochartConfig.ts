export default function getDescriptions() {
  return {
    version: 'The version of the configuration format',
    id: 'An optional identifier for the config (any value, not interpreted by the chart)',
    animationConfig: 'Configure the chart animation settings',
    chartConfig: 'Configure general settings of the chart',
    colorPaletteConfig: 'Configure the color palettes to use for collections of series',
    crosshairConfig: 'Configure the crosshair styling and behavior when a group and/or series is focused',
    groupAxisConfig: 'Configure the chart group axis content and styling',
    legendConfig: 'Configure the chart legend which itemizes the series',
    linearGradientConfigs: 'Configure linear gradients to be applied to series',
    linearGradientAllConfig: 'Configure common properties for all linear gradients',
    pieConfig: 'Configure the pie/donut slice geometry and slice labels (applies when chartConfig.type is pie)',
    plotConfig: 'Configure the chart plot content and styling',
    radialGradientConfigs: 'Configure radial gradients to be applied to series',
    radialGradientAllConfig: 'Configure common properties for all radial gradients',
    seriesAxisConfigs: 'Configure the chart series axes content and styling',
    seriesAxisAllConfig: 'Configure common properties for all series axes',
    seriesConfigs: 'Configure the chart series',
    seriesAllConfig: 'Configure common properties for all series',
    seriesGroupConfigs: 'Configure the grouping of series',
    seriesGroupAllConfig: 'Configure common properties for all series groups',
    seriesStackConfigs: 'Configure the stacking of series',
    seriesStackAllConfig: 'Configure common properties for all series stacks',
    titleConfig: 'Configure the chart title',
    tooltipConfig: 'Configure the chart tooltip styling and behavior'
  };
}