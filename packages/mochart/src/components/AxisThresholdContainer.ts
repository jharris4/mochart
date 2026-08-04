import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAggregateSeriesFocusPercentage } from '../utils/FocusValue';

import AxisThreshold from './AxisThreshold';
import type { EnhancedMochartConfig, EnhancedValueAxisConfig } from '../types/enhanced';
import type { ChartData } from '../types/data';
import type { FocusData } from '../types/animation';
import type { AxisLayoutInfo, CategoryAxisLayoutInfo, LayoutInfo } from '../types/layout';

interface AxisThresholdContainerProps {
  front: boolean;
  mochartConfig: EnhancedMochartConfig;
  categoryAxisLayoutInfo: CategoryAxisLayoutInfo;
  valueAxisLayoutInfos: Record<string, AxisLayoutInfo>;
  seriesLayoutInfo: LayoutInfo;
  chartData: ChartData;
  focusData: FocusData;
}

export default class AxisThresholdContainer extends Renderer<AxisThresholdContainerProps> {
  root = svgEl('g');
  categoryThreshold = this.slot(this.root);
  seriesThresholds = this.rendererList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { front, mochartConfig, categoryAxisLayoutInfo, valueAxisLayoutInfos, seriesLayoutInfo, chartData, focusData } = this.props;
    const { valueAxisFocusPercentages, seriesFocusPercentages } = focusData;
    const { plot: plotConfig, categoryAxis: categoryAxisConfig, valueAxes: valueAxisConfigs } = mochartConfig;
    const { inverted } = plotConfig;
    const { categoryData, seriesData } = chartData;
    const categoryAxisDomain = categoryData.axisDomain;
    const { axisSeriesCounts } = seriesData;
    const valueAxisRawDomains = seriesData.raw.axisDomains;
    const valueAxisFilteredDomains = seriesData.filtered.axisDomains;

    this.root.set({ className: mochartCssClasses['axisThresholdContainer'] });

    // The group axis renders ascending in both orientations; a series axis
    // ascends only when horizontal (inverted charts).
    this.categoryThreshold.set(AxisThreshold, { front, plotConfig, axisConfig: categoryAxisConfig, axisLayoutInfo: categoryAxisLayoutInfo,
      hidden: false, seriesLayoutInfo, axisDomain: categoryAxisDomain, vertical: inverted, ascending: true,
      axisFocusPercentage: null, seriesFocusPercentage: null, axisThresholdClass: mochartCssClasses['categoryAxisThreshold'] });

    this.seriesThresholds.sync(valueAxisConfigs.map((axisConfig: EnhancedValueAxisConfig) => {
      const { id, seriesConfigs, useSeriesFocus, adjustForFiltering } = axisConfig;
      const axisFocusPercentage = valueAxisFocusPercentages[id];
      const seriesFocusPercentage = useSeriesFocus ? getAggregateSeriesFocusPercentage(seriesConfigs ?? [], seriesFocusPercentages) : 0;
      const valueAxisDomain = adjustForFiltering ? valueAxisFilteredDomains[id] : valueAxisRawDomains[id];
      return {
        key: 'series-axis-' + id,
        ctor: AxisThreshold,
        props: { front, plotConfig, axisConfig, axisLayoutInfo: valueAxisLayoutInfos[id],
          hidden: axisSeriesCounts[id] === 0, seriesLayoutInfo, axisDomain: valueAxisDomain, vertical: !inverted, ascending: inverted,
          axisFocusPercentage, seriesFocusPercentage, axisThresholdClass: mochartCssClasses['valueAxisThreshold'] + id }
      };
    }));
  }
}
