import { Renderer, Slot } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

import Axis from './Axis';
import type { GroupAxisConfig } from '../types/config';
import type { GroupAxisData } from '../types/data';
import type { GroupAxisLayoutInfo, SpacingLayoutInfo } from '../types/layout';

interface GroupAxisProps {
  front: boolean;
  groupAxisConfig: GroupAxisConfig;
  groupAxisLayoutInfo: GroupAxisLayoutInfo;
  plotLayoutInfo: SpacingLayoutInfo;
  focusPercentages: number[];
  groupAxisData: GroupAxisData;
  titleClipPathUniqueId: string;
  tickLabelClipPathUniqueId: string;
}

export default class GroupAxis extends Renderer<GroupAxisProps> {
  axis: Slot | null = null;

  create() {
    this.axis = this.slot();
    return null;
  }

  sync() {
    const { front, groupAxisConfig, groupAxisLayoutInfo, plotLayoutInfo, focusPercentages,
      groupAxisData, titleClipPathUniqueId, tickLabelClipPathUniqueId } = this.props;

    this.axis!.set(Axis, { front, axisClass: mochartCssClasses['groupAxis'], axisConfig: groupAxisConfig, axisLayoutInfo: groupAxisLayoutInfo,
      plotLayoutInfo, axisTicks: groupAxisData.axisTickData,
      focusPercentages, tickSpacing: groupAxisData.maxTickLabelLength,
      titleClipPathUniqueId, tickLabelClipPathUniqueId });
  }
}
