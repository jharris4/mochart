import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

import Background from './Background';
import PieSeriesContainer from './PieSeriesContainer';
import type { MochartConfig } from '../types/config';
import type { InternalFocus } from '../types/chart';
import type { ChartData } from '../types/data';
import type { FocusData } from '../types/animation';
import type { LayoutInfo, SpacingLayoutInfo } from '../types/layout';

interface RadialPlotProps {
  mochartConfig: MochartConfig;
  seriesLayoutInfo: LayoutInfo;
  plotLayoutInfo: SpacingLayoutInfo;
  chartData: ChartData;
  focusData: FocusData;
  gradientIdMap: Record<string, string>;
  onFocus: (focus: InternalFocus) => void;
  shapeRef: (element: Element | null) => void;
}

/** The pie/donut counterpart of Plot: background + slices, no axes or crosshair. */
export default class RadialPlot extends Renderer<RadialPlotProps> {
  root = svgEl('g');
  background = this.slot(this.root);
  pieContainer = this.slot(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { mochartConfig, seriesLayoutInfo, plotLayoutInfo, chartData, focusData, gradientIdMap, onFocus, shapeRef } = this.props;
    const { plotConfig } = mochartConfig;

    this.root.set({ className: mochartCssClasses['radialPlot'] });

    this.background.set(Background, { config: plotConfig, classKey: 'plotBackground', spacingRelative: false, spacingLayoutInfo: plotLayoutInfo });

    this.pieContainer.set(PieSeriesContainer, { mochartConfig, seriesLayoutInfo,
      seriesData: chartData.seriesData, focusData, gradientIdMap, onFocus, shapeRef });
  }
}
