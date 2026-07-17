import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAxisFocusColor, getAxisFocusOpacity } from '../utils/FocusValue';
import type { AxisConfigBase } from '../types/config';
import type { AxisLayoutInfo } from '../types/layout';

interface AxisLineProps {
  axisConfig: AxisConfigBase & { useSeriesFocus?: boolean };
  axisLayoutInfo: AxisLayoutInfo;
  axisFocusPercentage: number | null;
  seriesFocusPercentage: number | null;
}

export default class AxisLine extends Renderer<AxisLineProps> {
  root = svgEl('g');
  line = svgEl('line');

  create() {
    this.root.append(this.line);
    return this.root.node;
  }

  sync() {
    const { axisConfig } = this.props;
    if (axisConfig.axisLine === true) {
      const { axisLayoutInfo, axisFocusPercentage, seriesFocusPercentage } = this.props;
      const { axisLineX1, axisLineY1, axisLineX2, axisLineY2 } = axisLayoutInfo;

      const stroke = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus ?? false,
        axisConfig.axisLineColor, axisConfig.axisLineFocusedColor, axisConfig.axisLineDefocusedColor);
      const strokeOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus ?? false,
        axisConfig.axisLineOpacity, axisConfig.axisLineFocusedOpacity, axisConfig.axisLineDefocusedOpacity);

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['axisLine'] });
      this.line.set({ x1: axisLineX1, y1: axisLineY1, x2: axisLineX2, y2: axisLineY2,
        stroke, strokeOpacity, strokeWidth: axisConfig.axisLineWidth,
        strokeDasharray: axisConfig.axisLineDashArray });
    }
    else {
      this.setPresent(false);
    }
  }
}
