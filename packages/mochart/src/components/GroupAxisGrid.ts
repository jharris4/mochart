import { Renderer, Slot } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

import AxisGrid from './AxisGrid';
import type { GroupAxisConfig, PlotConfig } from '../types/config';
import type { GroupAxisData } from '../types/data';
import type { LayoutInfo } from '../types/layout';

interface GroupAxisGridProps {
  plotConfig: PlotConfig;
  groupAxisConfig: GroupAxisConfig;
  seriesLayoutInfo: LayoutInfo;
  groupAxisData: GroupAxisData;
}

export default class GroupAxisGrid extends Renderer<GroupAxisGridProps> {
  grid: Slot | null = null;

  create() {
    this.grid = this.slot();
    return null;
  }

  sync() {
    const { plotConfig, groupAxisConfig, seriesLayoutInfo, groupAxisData } = this.props;

    this.grid!.set(AxisGrid, { vertical: plotConfig.inverted, axisConfig: groupAxisConfig, seriesLayoutInfo,
      axisGridClass: mochartCssClasses['groupAxisGrid'], axisTicks: groupAxisData.axisTickData });
  }
}
