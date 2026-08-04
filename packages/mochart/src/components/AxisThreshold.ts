import { Renderer, svgEl } from '../render';

import AxisThresholdLine from './AxisThresholdLine';
import { mochartCssClasses } from '../utils/ChartDom';
import { getAxisFocusStyle } from '../utils/FocusValue';
import { styleToAttributes } from '../utils/style';
import type { ThresholdAxisConfig } from './AxisThresholdLine';
import type { AxisLayoutInfo, LayoutInfo } from '../types/layout';
import type { PlotConfig } from '../types/config';

interface AxisThresholdProps {
  hidden: boolean;
  front: boolean;
  plotConfig: PlotConfig;
  axisConfig: ThresholdAxisConfig;
  axisLayoutInfo: AxisLayoutInfo;
  seriesLayoutInfo: LayoutInfo;
  axisDomain: [number | Date | null, number | Date | null];
  vertical: boolean;
  ascending: boolean;
  axisFocusPercentage: number | null;
  seriesFocusPercentage: number | null;
  axisThresholdClass: string;
}

export default class AxisThreshold extends Renderer<AxisThresholdProps> {
  root = svgEl('g');
  line = this.slot(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { hidden } = this.props;
    if (!hidden) {
      const { axisConfig, axisLayoutInfo, seriesLayoutInfo, axisDomain, vertical, ascending, axisFocusPercentage, seriesFocusPercentage, axisThresholdClass, front } = this.props;
      const { threshold, thresholdFront,
        thresholdTitle, thresholdTitleBefore, thresholdTitleSnapToValue, thresholdTitleMargin, thresholdTitlePadding,
        thresholdStyle, thresholdTitleTextStyle,
        useSeriesFocus = false
      } = axisConfig;

      this.setPresent(true);
      this.root.set({ className: axisThresholdClass });

      if (front !== thresholdFront) {
        this.line.set(null);
      }
      else {
        const line = styleToAttributes(getAxisFocusStyle(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, thresholdStyle));
        const title = styleToAttributes(getAxisFocusStyle(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, thresholdTitleTextStyle));
        this.line.set(AxisThresholdLine, { axisConfig, axisLayoutInfo, seriesLayoutInfo, axisThresholdLineClass: mochartCssClasses['axisThreshold'], vertical, ascending,
          threshold, axisDomain, thresholdTitle, thresholdTitleBefore, thresholdTitleSnapToValue,
          thresholdTitleMargin, thresholdTitlePadding,
          stroke: line.stroke ?? null, strokeOpacity: line.strokeOpacity ?? null,
          strokeWidth: line.strokeWidth ?? null, strokeDashArray: line.strokeDasharray ?? null,
          titleStroke: title.stroke ?? null, titleStrokeOpacity: title.strokeOpacity ?? null, titleStrokeWidth: title.strokeWidth ?? null,
          titleFill: title.fill ?? null, titleFillOpacity: title.fillOpacity ?? null });
      }
    }
    else {
      this.setPresent(false);
    }
  }
}
