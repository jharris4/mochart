// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

import Axis from './Axis';

export default class GroupAxis extends Renderer {
  axis = null;

  create() {
    this.axis = this.slot();
    return null;
  }

  sync() {
    const { front, groupAxisConfig, groupAxisLayoutInfo, plotLayoutInfo, focusPercentages,
      groupAxisData, titleClipPathUniqueId, tickLabelClipPathUniqueId } = this.props;

    this.axis.set(Axis, { front, axisClass: mochartCssClasses['groupAxis'], axisConfig: groupAxisConfig, axisLayoutInfo: groupAxisLayoutInfo,
      plotLayoutInfo, axisTicks: groupAxisData.axisTickData,
      focusPercentages, tickSpacing: groupAxisData.maxTickLabelLength,
      titleClipPathUniqueId, tickLabelClipPathUniqueId });
  }
}
