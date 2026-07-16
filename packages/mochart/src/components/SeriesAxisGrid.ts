// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

import AxisGrid from './AxisGrid';

export default class SeriesAxisGrid extends Renderer {
  grid = null;

  create() {
    this.grid = this.slot();
    return null;
  }

  sync() {
    const { plotConfig, seriesAxisConfig, seriesLayoutInfo, axisFocusPercentage, seriesFocusPercentage, seriesCount, seriesAxisData } = this.props;
    if (seriesAxisConfig.alwaysVisible || seriesCount > 0) {
      const axisId = seriesAxisConfig.id;
      this.grid.set(AxisGrid, { vertical: !plotConfig.inverted, axisConfig: seriesAxisConfig, seriesLayoutInfo,
        axisGridClass: mochartCssClasses['seriesAxisGrid'] + axisId,
        axisFocusPercentage, seriesFocusPercentage,
        axisTicks: seriesAxisData.axisTickData[axisId] });
    }
    else {
      this.grid.set(null);
    }
  }
}
