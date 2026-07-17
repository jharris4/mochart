import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAggregateSeriesFocusPercentage } from '../utils/FocusValue';

import GroupAxis from './GroupAxis';
import SeriesAxis from './SeriesAxis';
import type { SeriesAxisConfig } from '../types/config';
import type { MochartConfig } from '../types/config';
import type { AxisData, GroupAxisData, SeriesAxisData, SeriesData } from '../types/data';
import type { FocusData } from '../types/animation';
import type { AxisLayoutInfo, GroupAxisLayoutInfo, SpacingLayoutInfo } from '../types/layout';
import type { Bounds } from '../types/geometry';

interface AxisContainerProps {
  front: boolean;
  mochartConfig: MochartConfig;
  groupAxisLayoutInfo: GroupAxisLayoutInfo;
  seriesAxisLayoutInfos: Record<string, AxisLayoutInfo | Bounds>;
  plotLayoutInfo: SpacingLayoutInfo;
  seriesData: SeriesData;
  focusData: FocusData;
  axisData: AxisData & { group: GroupAxisData; series: SeriesAxisData };
  groupAxisTitleClipPathUniqueId: string;
  groupAxisTickLabelClipPathUniqueId: string;
  seriesAxisTitleClipPathUniqueIds: Record<string, string>;
  onFocus: (focus: { seriesAxisId: string | null }) => void;
}

export default class AxisContainer extends Renderer<AxisContainerProps> {
  root = svgEl('g');
  groupAxis = this.slot(this.root);
  seriesAxes = this.rendererList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { front, mochartConfig, groupAxisLayoutInfo, seriesAxisLayoutInfos, plotLayoutInfo,
      seriesData, focusData, axisData, groupAxisTitleClipPathUniqueId,
      groupAxisTickLabelClipPathUniqueId, seriesAxisTitleClipPathUniqueIds, onFocus } = this.props;
    const { groupFocusDomainPercentages = [], seriesAxisComputedFocusDomainPercentages = {},
      seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
    const { group: groupAxisData, series: seriesAxisData } = axisData;

    const { groupAxisConfig, seriesAxisConfigs } = mochartConfig;

    this.root.set({ className: mochartCssClasses['axisContainer'] });

    this.groupAxis.set(GroupAxis, { front, groupAxisConfig, groupAxisLayoutInfo,
      focusPercentages: groupFocusDomainPercentages, groupAxisData,
      titleClipPathUniqueId: groupAxisTitleClipPathUniqueId,
      tickLabelClipPathUniqueId: groupAxisTickLabelClipPathUniqueId,
      plotLayoutInfo });

    this.seriesAxes.sync(seriesAxisConfigs.map((axisConfig: SeriesAxisConfig) => {
      const { id, seriesConfigs, useSeriesFocus } = axisConfig;
      const axisFocusPercentage = seriesAxisFocusPercentages[id];
      const seriesFocusPercentage = useSeriesFocus ? getAggregateSeriesFocusPercentage(seriesConfigs ?? [], seriesFocusPercentages) : null;
      return {
        key: 'series-axis-' + id,
        ctor: SeriesAxis,
        props: { front, seriesAxisConfig: axisConfig,
          seriesAxisLayoutInfo: seriesAxisLayoutInfos[id] as AxisLayoutInfo, seriesCount: seriesData.axisSeriesCounts[id],
          focusPercentages: seriesAxisComputedFocusDomainPercentages[id] ?? [], seriesAxisData,
          axisFocusPercentage, seriesFocusPercentage,
          titleClipPathUniqueId: seriesAxisTitleClipPathUniqueIds[id],
          plotLayoutInfo, onFocus }
      };
    }));
  }
}
