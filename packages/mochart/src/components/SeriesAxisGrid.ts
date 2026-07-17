import { Renderer, Slot } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

import AxisGrid from './AxisGrid';
import type { PlotConfig, SeriesAxisConfig } from '../types/config';
import type { SeriesAxisData } from '../types/data';
import type { LayoutInfo } from '../types/layout';

interface SeriesAxisGridProps {
  plotConfig: PlotConfig;
  seriesAxisConfig: SeriesAxisConfig;
  seriesLayoutInfo: LayoutInfo;
  axisFocusPercentage: number | null;
  seriesFocusPercentage: number | null;
  seriesCount: number;
  seriesAxisData: SeriesAxisData;
}

export default class SeriesAxisGrid extends Renderer<SeriesAxisGridProps> {
  grid: Slot | null = null;

  create() {
    this.grid = this.slot();
    return null;
  }

  sync() {
    const { plotConfig, seriesAxisConfig, seriesLayoutInfo, axisFocusPercentage, seriesFocusPercentage, seriesCount, seriesAxisData } = this.props;
    if (seriesAxisConfig.alwaysVisible || seriesCount > 0) {
      const axisId = seriesAxisConfig.id;
      this.grid!.set(AxisGrid, { vertical: !plotConfig.inverted, axisConfig: seriesAxisConfig, seriesLayoutInfo,
        axisGridClass: mochartCssClasses['seriesAxisGrid'] + axisId,
        axisFocusPercentage, seriesFocusPercentage,
        axisTicks: seriesAxisData.axisTickData[axisId] });
    }
    else {
      this.grid!.set(null);
    }
  }
}
