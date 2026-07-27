import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

import Axis from './Axis';
import type { MochartConfig, SeriesAxisConfig } from '../types/config';
import type { AxisTick } from '../types/data';
import type { AxisLayoutInfo, GroupAxisLayoutInfo, SpacingLayoutInfo } from '../types/layout';

const emptyFocusPercentages: number[] = [];
const emptyTicks: AxisTick[] = [];

interface PlotEmptyProps {
  mochartConfig: MochartConfig;
  groupAxisLayoutInfo: GroupAxisLayoutInfo;
  seriesAxisLayoutInfos: Record<string, AxisLayoutInfo>;
  plotLayoutInfo: SpacingLayoutInfo;
  groupAxisTitleClipPathUniqueId: string;
  groupAxisTickLabelClipPathUniqueId: string;
  seriesAxisTitleClipPathUniqueIds: Record<string, string>;
}

export default class PlotEmpty extends Renderer<PlotEmptyProps> {
  root = svgEl('g');
  groupAxis = this.slot(this.root);
  seriesAxes = this.rendererList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { mochartConfig, groupAxisLayoutInfo, seriesAxisLayoutInfos, plotLayoutInfo,
      groupAxisTitleClipPathUniqueId, groupAxisTickLabelClipPathUniqueId, seriesAxisTitleClipPathUniqueIds } = this.props;
    const { groupAxisConfig, seriesAxisConfigs } = mochartConfig;

    const commonProps = {
      plotLayoutInfo,
      focusPercentages: emptyFocusPercentages,
      tickSpacing: null,
      axisTicks: emptyTicks
    };

    this.root.set({ className: mochartCssClasses['plot'] });

    this.groupAxis.set(Axis, { front: false, axisClass: mochartCssClasses['groupAxis'], axisConfig: groupAxisConfig, axisLayoutInfo: groupAxisLayoutInfo,
      titleClipPathUniqueId: groupAxisTitleClipPathUniqueId, tickLabelClipPathUniqueId: groupAxisTickLabelClipPathUniqueId,
      ...commonProps });

    this.seriesAxes.sync(seriesAxisConfigs.map((axisConfig: SeriesAxisConfig) => {
      const { id } = axisConfig;
      return {
        key: 'series-axis-' + id,
        ctor: Axis,
        props: { front: false, axisClass: mochartCssClasses['seriesAxis'] + id, axisConfig,
          axisLayoutInfo: seriesAxisLayoutInfos[id], titleClipPathUniqueId: seriesAxisTitleClipPathUniqueIds[id],
          ...commonProps }
      };
    }));
  }
}
