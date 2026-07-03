export const mochartCssClasses = {
  chart: 'mochart-chart',
    background: 'mochart-background',
    title: 'mochart-title',
      titleBackground: 'mochart-title-background',
      titleText: 'mochart-title-text',
      titleTextBackground: 'mochart-title-text-background',
      titleTextRaw: 'mochart-title-text-raw',
      titlePrefix: 'mochart-title-prefix',
      titlePrefixBackground: 'mochart-title-prefix-background',
      titleSuffix: 'mochart-title-suffix',
      titleSuffixBackground: 'mochart-title-suffix-background',
    plot: 'mochart-plot',
      plotBackground: 'mochart-plot-background',
      plotBack: 'mochart-plot-back',
        axisGridContainer: 'mochart-axis-grid-container',
          groupAxisGrid: 'mochart-group-axis-grid',
          seriesAxisGrid: 'mochart-series-axis-grid mochart-series-axis-grid-',
            axisGridLine: 'mochart-axis-grid-line mochart-axis-grid-line-',
        axisBaseContainer: 'mochart-axis-base-container',
          seriesAxisBaseLine: 'mochart-series-axis-base-line mochart-series-axis-base-line-',
            axisBaseLine: 'mochart-axis-base-line',
        axisContainer: 'mochart-axis-container',
          groupAxis: 'mochart-group-axis',
          seriesAxis: 'mochart-series-axis mochart-series-axis-',
            axisBackground: 'mochart-axis-background',
            axisLine: 'mochart-axis-line',
            axisTitle: 'mochart-axis-title',
              axisTitleBackground: 'mochart-axis-title-background',
            axisTickMarks: 'mochart-axis-tick-marks',
              axisTickMark: 'mochart-axis-tick-mark mochart-axis-tick-mark-',
            axisTickLabels: 'mochart-axis-tick-labels',
              axisTickLabel: 'mochart-axis-tick-label mochart-axis-tick-label-',
                axisTickLabelBackground: 'mochart-axis-title-background',
            axisSizeTickLabel: 'mochart-axis-size-tick-label',
            axisFocusRange: 'mochart-axis-focus-range',
            axisFocusTickMarks: 'mochart-axis-focus-tick-marks',
              axisFocusTickMark: 'mochart-axis-focus-tick-mark mochart-axis-focus-tick-mark-',
        axisThresholdContainer: 'mochart-axis-threshold-container',
          groupAxisThreshold: 'mochart-group-axis-threshold',
          seriesAxisThreshold: 'mochart-series-axis-threshold mochart-series-axis-threshold-',
            axisThreshold: 'mochart-axis-threshold',
            axisThresholdMin: 'mochart-axis-threshold-min',
            axisThresholdMax: 'mochart-axis-threshold-max',
            axisThresholdRange: 'mochart-axis-threshold-range',
      seriesContainer: 'mochart-series-container',
        seriesBackground: 'mochart-series-background',
        series: 'mochart-series mochart-series-',
          seriesLine: 'mochart-series-line',
          seriesArea: 'mochart-series-area',
          seriesBar: 'mochart-series-bar mochart-series-bar-',
          seriesMarkers: 'mochart-series-markers',
            seriesMarker: 'mochart-series-marker mochart-series-marker-',
          seriesLabels: 'mochart-series-labels',
            seriesLabel: 'mochart-series-label mochart-series-label-',
      plotFront: 'mochart-plot-front',
    crosshair: 'mochart-crosshair',
      crosshairGroupLines: 'crosshair-group-lines',
      crosshairSeriesLines: 'crosshair-series-lines',
        crosshairLine: 'crosshair-line',
    legendContainer: 'mochart-legend-container',
      legendBackground: 'mochart-legend-background',
    legend: 'mochart-legend',
    legendItem: 'mochart-legend-item mochart-legend-item-',
      legendItemBackground: 'mochart-legend-item-background',
      legendItemIcon: 'mochart-legend-item-icon',
      legendItemText: 'mochart-legend-item-text',
      legendItemTextRaw: 'mochart-legend-item-text-raw',
  tooltipContainer: 'mochart-tooltip-container',
    tooltip: 'mochart-tooltip',
      tooltipContent: 'mochart-tooltip-content',
        tooltipControls: 'mochart-tooltip-controls',
        tooltipLines: 'mochart-tooltip-lines',
          tooltipGroupLine: 'mochart-tooltip-group-line',
          tooltipSeriesLine: 'mochart-tooltip-series-line mochart-tooltip-series-line-',
            tooltipLineIcon: 'mochart-tooltip-line-icon',
            tooltipLineText: 'mochart-tooltip-line-text',
            tooltipLineLabel: 'mochart-tooltip-line-label',
            tooltipLineValue: 'mochart-tooltip-line-value',
    tooltipSizer: 'mochart-tooltip-sizer',
  noData: 'mochart-no-data',
  noSeries: 'mochart-no-series',
  loading: 'mochart-loading',
  chartError: 'mochart-chart mochart-chart-error'
};

function getTitleTextCssSelector() {
  return '.' + mochartCssClasses['titleText'];
}

function getTitleTextRawCssSelector() {
  return '.' + mochartCssClasses['titleTextRaw'];
}

function getTitlePrefixCssSelector() {
  return '.' + mochartCssClasses['titlePrefix'];
}

function getTitleSuffixCssSelector() {
  return '.' + mochartCssClasses['titleSuffix'];
}

function getGroupAxisTickLabelsCssSelector() {
  return '.' + [mochartCssClasses['groupAxis'], mochartCssClasses['axisTickLabels'], mochartCssClasses['axisTickLabel'].split(' ')[0]].join(' .') + ' text';
}

function getGroupAxisSizeTickLabelCssSelector() {
  return '.' + [mochartCssClasses['groupAxis'], mochartCssClasses['axisSizeTickLabel']].join(' .') + ' text';
}

function getGroupAxisTitleCssSelector() {
  return '.' + [mochartCssClasses['groupAxis'], mochartCssClasses['axisTitle']].join(' .') + ' text';
}

function getGroupAxisThresholdTitleCssSelector() {
  return '.' + [mochartCssClasses['groupAxisThreshold'], mochartCssClasses['axisThreshold']].join(' .') + ' text';
}

function getSeriesAxisTickLabelsCssSelectorForId(axisId) {
  return '.' + [mochartCssClasses['seriesAxis'].split(' ')[1] + axisId, mochartCssClasses['axisTickLabels']].join(' .') + ' text';
}

function getSeriesAxisTitleCssSelectorForId(axisId) {
  return '.' + [mochartCssClasses['seriesAxis'].split(' ')[1] + axisId, mochartCssClasses['axisTitle']].join(' .') + ' text';
}

function getSeriesAxisThresholdTitleCssSelectorForId(axisId) {
  return '.' + [mochartCssClasses['seriesAxisThreshold'].split(' ')[1] + axisId, mochartCssClasses['axisThreshold']].join(' .') + ' text';
}

function getLegendCssSelector() {
  return '.' + mochartCssClasses['legend'];
}

function getLegendItemTextsCssSelector() {
  return '.' + mochartCssClasses['legendItemText'] + ' text';
}

function getLegendItemTextRawsCssSelector() {
  return '.' + mochartCssClasses['legendItemTextRaw'] + ' text';
}

function getTooltipCssSelector() {
  return '.' + mochartCssClasses['tooltipSizer'];
}

export function getDomAccessors(chartElement) {
  return {
    getTitleTextDomElement: () => chartElement.querySelector(getTitleTextCssSelector()),
    getTitleTextRawDomElement: () => chartElement.querySelector(getTitleTextRawCssSelector()),
    getTitlePrefixDomElement: () => chartElement.querySelector(getTitlePrefixCssSelector()),
    getTitleSuffixDomElement: () => chartElement.querySelector(getTitleSuffixCssSelector()),
    getGroupAxisTicksDomElements: () => chartElement.querySelectorAll(getGroupAxisTickLabelsCssSelector()),
    getGroupAxisSizeTickDomElement: () => chartElement.querySelector(getGroupAxisSizeTickLabelCssSelector()),
    getGroupAxisTitleDomElement: () => chartElement.querySelector(getGroupAxisTitleCssSelector()),
    getGroupAxisThresholdTitleDomElement: () => chartElement.querySelector(getGroupAxisThresholdTitleCssSelector()),
    getSeriesAxisTicksDomElementsForId: (axisId) => chartElement.querySelectorAll(getSeriesAxisTickLabelsCssSelectorForId(axisId)),
    getSeriesAxisTitleDomElementForId: (axisId) => chartElement.querySelector(getSeriesAxisTitleCssSelectorForId(axisId)),
    getSeriesAxisThresholdTitleDomElementForId: (axisId) => chartElement.querySelector(getSeriesAxisThresholdTitleCssSelectorForId(axisId)),
    getLegendDomElement: () => chartElement.querySelector(getLegendCssSelector()),
    getLegendItemTextDomElements: () => chartElement.querySelectorAll(getLegendItemTextsCssSelector()),
    getLegendItemTextRawDomElements: () => chartElement.querySelectorAll(getLegendItemTextRawsCssSelector()),
    getTooltipDomElement: () => chartElement.querySelector(getTooltipCssSelector())
  };
}
