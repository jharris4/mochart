import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAggregateSeriesFocusPercentage } from '../utils/FocusValue';

import AxisThreshold from './AxisThreshold';
import type { MochartConfig, SeriesAxisConfig } from '../types/config';
import type { ChartData } from '../types/data';
import type { FocusData } from '../types/animation';
import type { AxisLayoutInfo, GroupAxisLayoutInfo, LayoutInfo } from '../types/layout';

interface AxisThresholdContainerProps {
  front: boolean;
  mochartConfig: MochartConfig;
  groupAxisLayoutInfo: GroupAxisLayoutInfo;
  seriesAxisLayoutInfos: Record<string, AxisLayoutInfo>;
  seriesLayoutInfo: LayoutInfo;
  chartData: ChartData;
  focusData: FocusData;
}

export default class AxisThresholdContainer extends Renderer<AxisThresholdContainerProps> {
  root = svgEl('g');
  groupThreshold = this.slot(this.root);
  seriesThresholds = this.rendererList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { front, mochartConfig, groupAxisLayoutInfo, seriesAxisLayoutInfos, seriesLayoutInfo, chartData, focusData } = this.props;
    const { seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
    const { plotConfig, groupAxisConfig, seriesAxisConfigs } = mochartConfig;
    const { inverted } = plotConfig;
    const { groupData, seriesData } = chartData;
    const groupAxisDomain = groupData.axisDomain;
    const { axisSeriesCounts } = seriesData;
    const seriesAxisRawDomains = seriesData.raw.axisDomains;
    const seriesAxisFilteredDomains = seriesData.filtered.axisDomains;

    this.root.set({ className: mochartCssClasses['axisThresholdContainer'] });

    // The group axis renders ascending in both orientations; a series axis
    // ascends only when horizontal (inverted charts).
    this.groupThreshold.set(AxisThreshold, { front, plotConfig, axisConfig: groupAxisConfig, axisLayoutInfo: groupAxisLayoutInfo,
      hidden: false, seriesLayoutInfo, axisDomain: groupAxisDomain, vertical: inverted, ascending: true,
      axisFocusPercentage: null, seriesFocusPercentage: null, axisThresholdClass: mochartCssClasses['groupAxisThreshold'] });

    this.seriesThresholds.sync(seriesAxisConfigs.map((axisConfig: SeriesAxisConfig) => {
      const { id, seriesConfigs, useSeriesFocus, adjustForSuppression } = axisConfig;
      const axisFocusPercentage = seriesAxisFocusPercentages[id];
      const seriesFocusPercentage = useSeriesFocus ? getAggregateSeriesFocusPercentage(seriesConfigs ?? [], seriesFocusPercentages) : 0;
      const seriesAxisDomain = adjustForSuppression ? seriesAxisFilteredDomains[id] : seriesAxisRawDomains[id];
      return {
        key: 'series-axis-' + id,
        ctor: AxisThreshold,
        props: { front, plotConfig, axisConfig, axisLayoutInfo: seriesAxisLayoutInfos[id],
          hidden: axisSeriesCounts[id] === 0, seriesLayoutInfo, axisDomain: seriesAxisDomain, vertical: !inverted, ascending: inverted,
          axisFocusPercentage, seriesFocusPercentage, axisThresholdClass: mochartCssClasses['seriesAxisThreshold'] + id }
      };
    }));
  }
}
