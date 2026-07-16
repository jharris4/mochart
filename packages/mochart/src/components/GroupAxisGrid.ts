// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

import AxisGrid from './AxisGrid';

export default class GroupAxisGrid extends Renderer {
  grid = null;

  create() {
    this.grid = this.slot();
    return null;
  }

  sync() {
    const { plotConfig, groupAxisConfig, seriesLayoutInfo, groupAxisData } = this.props;

    this.grid.set(AxisGrid, { vertical: plotConfig.inverted, axisConfig: groupAxisConfig, seriesLayoutInfo,
      axisGridClass: mochartCssClasses['groupAxisGrid'], axisTicks: groupAxisData.axisTickData });
  }
}
