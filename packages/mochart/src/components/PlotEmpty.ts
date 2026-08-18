import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

import Axis from './Axis';
import { getAxisAccessibleLabel } from './AxisContainer';
import { accessibilityActive } from '../utils/utils';
import type { EnhancedMochartConfig, EnhancedValueAxisConfig } from '../types/enhanced';
import type { AxisTick } from '../types/data';
import type { AxisLayoutInfo, CategoryAxisLayoutInfo, SpacingLayoutInfo } from '../types/layout';

const emptyFocusPercentages: number[] = [];
const emptyTicks: AxisTick[] = [];

interface PlotEmptyProps {
  mochartConfig: EnhancedMochartConfig;
  categoryAxisLayoutInfo: CategoryAxisLayoutInfo;
  valueAxisLayoutInfos: Record<string, AxisLayoutInfo>;
  plotLayoutInfo: SpacingLayoutInfo;
  categoryAxisTitleClipPathUniqueId: string;
  categoryAxisTickLabelClipPathUniqueId: string;
  valueAxisTitleClipPathUniqueIds: Record<string, string>;
}

export default class PlotEmpty extends Renderer<PlotEmptyProps> {
  root = svgEl('g');
  categoryAxis = this.slot(this.root);
  valueAxes = this.rendererList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { mochartConfig, categoryAxisLayoutInfo, valueAxisLayoutInfos, plotLayoutInfo,
      categoryAxisTitleClipPathUniqueId, categoryAxisTickLabelClipPathUniqueId, valueAxisTitleClipPathUniqueIds } = this.props;
    const { categoryAxis: categoryAxisConfig, valueAxes: valueAxisConfigs, accessibility: accessibilityConfig } = mochartConfig;

    const commonProps = {
      plotLayoutInfo,
      focusPercentages: emptyFocusPercentages,
      tickSpacing: null,
      axisTicks: emptyTicks,
      accessibility: accessibilityActive(accessibilityConfig)
    };

    this.root.set({ className: mochartCssClasses['plot'] });

    this.categoryAxis.set(Axis, { front: false, axisClass: mochartCssClasses['categoryAxis'], axisConfig: categoryAxisConfig, axisLayoutInfo: categoryAxisLayoutInfo,
      titleClipPathUniqueId: categoryAxisTitleClipPathUniqueId, tickLabelClipPathUniqueId: categoryAxisTickLabelClipPathUniqueId,
      accessibleLabel: getAxisAccessibleLabel(categoryAxisConfig.title, accessibilityConfig.categoryAxisLabel),
      ...commonProps });

    this.valueAxes.sync(valueAxisConfigs.map((axisConfig: EnhancedValueAxisConfig) => {
      const { id } = axisConfig;
      return {
        key: 'value-axis-' + id,
        ctor: Axis,
        props: { front: false, axisClass: mochartCssClasses['valueAxis'] + id, axisId: id, axisConfig,
          axisLayoutInfo: valueAxisLayoutInfos[id], titleClipPathUniqueId: valueAxisTitleClipPathUniqueIds[id],
          accessibleLabel: getAxisAccessibleLabel(axisConfig.title, accessibilityConfig.valueAxisLabel),
          ...commonProps }
      };
    }));
  }
}
