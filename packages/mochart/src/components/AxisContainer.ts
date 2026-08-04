import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAggregateSeriesFocusPercentage } from '../utils/FocusValue';

import CategoryAxis from './CategoryAxis';
import ValueAxis from './ValueAxis';
import type { EnhancedValueAxisConfig } from '../types/enhanced';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { AxisData, CategoryAxisData, ValueAxisData, SeriesData } from '../types/data';
import type { FocusData } from '../types/animation';
import type { AxisLayoutInfo, CategoryAxisLayoutInfo, SpacingLayoutInfo } from '../types/layout';

interface AxisContainerProps {
  front: boolean;
  mochartConfig: EnhancedMochartConfig;
  categoryAxisLayoutInfo: CategoryAxisLayoutInfo;
  valueAxisLayoutInfos: Record<string, AxisLayoutInfo>;
  plotLayoutInfo: SpacingLayoutInfo;
  seriesData: SeriesData;
  focusData: FocusData;
  axisData: AxisData & { group: CategoryAxisData; series: ValueAxisData };
  categoryAxisTitleClipPathUniqueId: string;
  categoryAxisTickLabelClipPathUniqueId: string;
  valueAxisTitleClipPathUniqueIds: Record<string, string>;
  onFocus: (focus: { valueAxisId: string | null }) => void;
}

export default class AxisContainer extends Renderer<AxisContainerProps> {
  root = svgEl('g');
  categoryAxis = this.slot(this.root);
  valueAxes = this.rendererList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { front, mochartConfig, categoryAxisLayoutInfo, valueAxisLayoutInfos, plotLayoutInfo,
      seriesData, focusData, axisData, categoryAxisTitleClipPathUniqueId,
      categoryAxisTickLabelClipPathUniqueId, valueAxisTitleClipPathUniqueIds, onFocus } = this.props;
    const { categoryFocusDomainPercentages = [], valueAxisComputedFocusDomainPercentages = {},
      valueAxisFocusPercentages, seriesFocusPercentages } = focusData;
    const { group: categoryAxisData, series: valueAxisData } = axisData;

    const { categoryAxis: categoryAxisConfig, valueAxes: valueAxisConfigs } = mochartConfig;

    this.root.set({ className: mochartCssClasses['axisContainer'] });

    this.categoryAxis.set(CategoryAxis, { front, categoryAxisConfig, categoryAxisLayoutInfo,
      focusPercentages: categoryFocusDomainPercentages, categoryAxisData,
      titleClipPathUniqueId: categoryAxisTitleClipPathUniqueId,
      tickLabelClipPathUniqueId: categoryAxisTickLabelClipPathUniqueId,
      plotLayoutInfo });

    this.valueAxes.sync(valueAxisConfigs.map((axisConfig: EnhancedValueAxisConfig) => {
      const { id, seriesConfigs, useSeriesFocus } = axisConfig;
      const axisFocusPercentage = valueAxisFocusPercentages[id];
      const seriesFocusPercentage = useSeriesFocus ? getAggregateSeriesFocusPercentage(seriesConfigs ?? [], seriesFocusPercentages) : null;
      return {
        key: 'series-axis-' + id,
        ctor: ValueAxis,
        props: { front, valueAxisConfig: axisConfig,
          valueAxisLayoutInfo: valueAxisLayoutInfos[id], seriesCount: seriesData.axisSeriesCounts[id],
          focusPercentages: valueAxisComputedFocusDomainPercentages[id] ?? [], valueAxisData,
          axisFocusPercentage, seriesFocusPercentage,
          titleClipPathUniqueId: valueAxisTitleClipPathUniqueIds[id],
          plotLayoutInfo, onFocus }
      };
    }));
  }
}
