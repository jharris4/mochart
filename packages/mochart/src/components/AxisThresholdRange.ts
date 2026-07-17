import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import type { AxisConfigBase } from '../types/config';
import type { AxisLayoutInfo } from '../types/layout';

interface AxisThresholdRangeProps {
  axisConfig: AxisConfigBase;
  axisLayoutInfo: AxisLayoutInfo;
  focusPercentages: number[];
}

export default class AxisThresholdRange extends Renderer<AxisThresholdRangeProps> {
  root = svgEl('g');
  range = this.elSlot(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { axisConfig } = this.props;
    if (axisConfig.focusRange) {
      const { axisLayoutInfo, focusPercentages } = this.props;
      const { length } = focusPercentages;

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['axisFocusRange'] });

      if (length === 1 || length === 2) {
        const { focusRangeStrokeColor, focusRangeFillColor, focusRangeStrokeOpacity, focusRangeFillOpacity, focusRangeStrokeWidth, focusRangeDashArray } = axisConfig;
        const { vertical, focusRangeLayoutInfo } = axisLayoutInfo;
        let { x, y, width, height } = focusRangeLayoutInfo;
        if (length === 1) {
          const focusPercentage = focusPercentages[0];
          if (vertical) {
            y += focusPercentage * height - 1;
            height = 2;
          }
          else {
            x += focusPercentage * width - 1;
            width = 2;
          }
        }
        else {
          const focusPercentageMin = Math.min(focusPercentages[0], focusPercentages[1]);
          const focusPercentageMax = Math.max(focusPercentages[0], focusPercentages[1]);
          if (vertical) {
            y += focusPercentageMin * height;
            height = (focusPercentageMax - focusPercentageMin) * height;
          }
          else {
            x += focusPercentageMin * width;
            width = (focusPercentageMax - focusPercentageMin) * width;
          }
        }
        this.range.set('rect', () => svgEl('rect'))!.set({ x, y, width, height,
          stroke: focusRangeStrokeColor, strokeOpacity: focusRangeStrokeOpacity,
          fill: focusRangeFillColor, fillOpacity: focusRangeFillOpacity,
          strokeWidth: focusRangeStrokeWidth, strokeDasharray: focusRangeDashArray });
      }
      else {
        this.range.set(null);
      }
    }
    else {
      this.setPresent(false);
    }
  }
}
