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
          categoryAxisGrid: 'mochart-category-axis-grid',
          valueAxisGrid: 'mochart-value-axis-grid mochart-value-axis-grid-',
            axisGridLine: 'mochart-axis-grid-line mochart-axis-grid-line-',
        axisBaseContainer: 'mochart-axis-base-container',
          valueAxisBaseLine: 'mochart-value-axis-base-line mochart-value-axis-base-line-',
            axisBaseLine: 'mochart-axis-base-line',
        axisContainer: 'mochart-axis-container',
          categoryAxis: 'mochart-category-axis',
          valueAxis: 'mochart-value-axis mochart-value-axis-',
            axisBackground: 'mochart-axis-background',
            axisLine: 'mochart-axis-line',
            axisTitle: 'mochart-axis-title',
              axisTitleBackground: 'mochart-axis-title-background',
            axisTickMarks: 'mochart-axis-tick-marks',
              axisTickMark: 'mochart-axis-tick-mark mochart-axis-tick-mark-',
            axisTickLabels: 'mochart-axis-tick-labels',
              axisTickLabel: 'mochart-axis-tick-label mochart-axis-tick-label-',
                axisTickLabelBackground: 'mochart-axis-tick-label-background',
            axisSizeTickLabel: 'mochart-axis-size-tick-label',
            axisFocusRange: 'mochart-axis-focus-range',
            axisFocusTickMarks: 'mochart-axis-focus-tick-marks',
              axisFocusTickMark: 'mochart-axis-focus-tick-mark mochart-axis-focus-tick-mark-',
        axisThresholdContainer: 'mochart-axis-threshold-container',
          categoryAxisThreshold: 'mochart-category-axis-threshold',
          valueAxisThreshold: 'mochart-value-axis-threshold mochart-value-axis-threshold-',
            axisThreshold: 'mochart-axis-threshold',
            axisThresholdTitle: 'mochart-axis-threshold-title mochart-axis-threshold-title-',
            axisThresholdMin: 'mochart-axis-threshold-min',
            axisThresholdMax: 'mochart-axis-threshold-max',
            axisThresholdRange: 'mochart-axis-threshold-range',
      seriesContainer: 'mochart-series-container',
        seriesBackground: 'mochart-series-background',
        series: 'mochart-series mochart-series-',
          seriesLine: 'mochart-series-line',
          seriesArea: 'mochart-series-area',
          seriesBar: 'mochart-series-bar mochart-series-bar-',
          seriesErrorBars: 'mochart-series-error-bars',
            seriesErrorBar: 'mochart-series-error-bar mochart-series-error-bar-',
          seriesMarkers: 'mochart-series-markers',
            seriesMarker: 'mochart-series-marker mochart-series-marker-',
          seriesLabels: 'mochart-series-labels',
            seriesLabel: 'mochart-series-label mochart-series-label-',
      plotFront: 'mochart-plot-front',
    radialPlot: 'mochart-radial-plot',
      seriesSlice: 'mochart-series-slice',
      seriesSliceLabel: 'mochart-series-slice-label',
      pieCenter: 'mochart-pie-center',
        pieCenterLabel: 'mochart-pie-center-label',
        pieCenterTotal: 'mochart-pie-center-total',
    crosshair: 'mochart-crosshair',
      crosshairCategoryLines: 'crosshair-category-lines',
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
          tooltipCategoryLine: 'mochart-tooltip-category-line',
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

function getCategoryAxisTickLabelsCssSelector() {
  return '.' + [mochartCssClasses['categoryAxis'], mochartCssClasses['axisTickLabels'], mochartCssClasses['axisTickLabel'].split(' ')[0]].join(' .') + ' text';
}

function getCategoryAxisSizeTickLabelCssSelector() {
  return '.' + [mochartCssClasses['categoryAxis'], mochartCssClasses['axisSizeTickLabel']].join(' .') + ' text';
}

function getCategoryAxisTitleCssSelector() {
  return '.' + [mochartCssClasses['categoryAxis'], mochartCssClasses['axisTitle']].join(' .') + ' text';
}

function getCategoryAxisThresholdTitleCssSelector() {
  return '.' + [mochartCssClasses['categoryAxisThreshold'], mochartCssClasses['axisThresholdTitle'].split(' ')[0]].join(' .');
}

function getValueAxisTickLabelsCssSelectorForId(axisId: string) {
  return '.' + [mochartCssClasses['valueAxis'].split(' ')[1] + axisId, mochartCssClasses['axisTickLabels']].join(' .') + ' text';
}

function getValueAxisTitleCssSelectorForId(axisId: string) {
  return '.' + [mochartCssClasses['valueAxis'].split(' ')[1] + axisId, mochartCssClasses['axisTitle']].join(' .') + ' text';
}

function getValueAxisThresholdTitleCssSelectorForId(axisId: string) {
  return '.' + [mochartCssClasses['valueAxisThreshold'].split(' ')[1] + axisId, mochartCssClasses['axisThresholdTitle'].split(' ')[0]].join(' .');
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

export function getDomAccessors(chartElement: Element): ChartDomAccessors {
  return {
    getTitleTextDomElement: () => chartElement.querySelector<SVGGraphicsElement>(getTitleTextCssSelector()),
    getTitleTextRawDomElement: () => chartElement.querySelector<SVGGraphicsElement>(getTitleTextRawCssSelector()),
    getTitlePrefixDomElement: () => chartElement.querySelector<SVGGraphicsElement>(getTitlePrefixCssSelector()),
    getTitleSuffixDomElement: () => chartElement.querySelector<SVGGraphicsElement>(getTitleSuffixCssSelector()),
    getCategoryAxisTicksDomElements: () => chartElement.querySelectorAll<SVGGraphicsElement>(getCategoryAxisTickLabelsCssSelector()),
    getCategoryAxisSizeTickDomElement: () => chartElement.querySelector<SVGGraphicsElement>(getCategoryAxisSizeTickLabelCssSelector()),
    getCategoryAxisTitleDomElement: () => chartElement.querySelector<SVGGraphicsElement>(getCategoryAxisTitleCssSelector()),
    getCategoryAxisThresholdTitleDomElements: () => chartElement.querySelectorAll<SVGGraphicsElement>(getCategoryAxisThresholdTitleCssSelector()),
    getValueAxisTicksDomElementsForId: (axisId: string) => chartElement.querySelectorAll<SVGGraphicsElement>(getValueAxisTickLabelsCssSelectorForId(axisId)),
    getValueAxisTitleDomElementForId: (axisId: string) => chartElement.querySelector<SVGGraphicsElement>(getValueAxisTitleCssSelectorForId(axisId)),
    getValueAxisThresholdTitleDomElementsForId: (axisId: string) => chartElement.querySelectorAll<SVGGraphicsElement>(getValueAxisThresholdTitleCssSelectorForId(axisId)),
    getLegendDomElement: () => chartElement.querySelector<HTMLElement>(getLegendCssSelector()),
    getLegendItemTextDomElements: () => chartElement.querySelectorAll<SVGGraphicsElement>(getLegendItemTextsCssSelector()),
    getLegendItemTextRawDomElements: () => chartElement.querySelectorAll<SVGGraphicsElement>(getLegendItemTextRawsCssSelector()),
    getTooltipDomElement: () => chartElement.querySelector<HTMLElement>(getTooltipCssSelector())
  };
}
import type { ChartDomAccessors } from '../types/chart';
