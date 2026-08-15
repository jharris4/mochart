import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { getValueAxisFocusContexts } from '../utils/FocusValue';
import { accessibilityActive } from '../utils/utils';

import AxisThreshold from './AxisThreshold';
import type { EnhancedMochartConfig } from '../types/enhanced';
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
    const { plot: plotConfig, categoryAxis: categoryAxisConfig, valueAxes: valueAxisConfigs } = mochartConfig;
    const { inverted } = plotConfig;
    const { categoryData, seriesData } = chartData;
    const categoryAxisDomain = categoryData.renderAxisDomain;
    const { axisSeriesCounts } = seriesData;
    const valueAxisRawDomains = seriesData.raw.renderAxisDomains;
    const valueAxisFilteredDomains = seriesData.filtered.renderAxisDomains;

    // threshold titles annotate the geometry rather than name the data, so they stay out of the reading order
    this.root.set({ className: mochartCssClasses['axisThresholdContainer'],
      ariaHidden: accessibilityActive(mochartConfig.accessibility) ? 'true' : null });

    // ascending: a category axis renders ascending, a value axis only when horizontal (inverted); reversed flips either
    this.categoryThreshold.set(AxisThreshold, { front, plotConfig, axisConfig: categoryAxisConfig, axisLayoutInfo: categoryAxisLayoutInfo,
      hidden: false, seriesLayoutInfo, axisDomain: categoryAxisDomain, vertical: inverted, ascending: !categoryAxisConfig.reversed,
      axisFocusPercentage: null, seriesFocusPercentage: null, axisThresholdClass: mochartCssClasses['categoryAxisThreshold'] });

    this.seriesThresholds.sync(getValueAxisFocusContexts(valueAxisConfigs, focusData).map(({ axisConfig, id, key, axisFocusPercentage, seriesFocusPercentage }) => {
      const valueAxisDomain = axisConfig.adjustForFiltering ? valueAxisFilteredDomains[id] : valueAxisRawDomains[id];
      return {
        key,
        ctor: AxisThreshold,
        props: { front, plotConfig, axisConfig, axisLayoutInfo: valueAxisLayoutInfos[id],
          hidden: axisSeriesCounts[id] === 0, seriesLayoutInfo, axisDomain: valueAxisDomain, vertical: !inverted, ascending: inverted !== axisConfig.reversed,
          axisFocusPercentage, seriesFocusPercentage, axisThresholdClass: mochartCssClasses['valueAxisThreshold'] + id }
      };
    }));
  }
}
