import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { translate } from '../utils/utils';
import { getAxisFocusColor, getAxisFocusOpacity } from '../utils/FocusValue';
import type { AxisTick } from '../types/data';
import type { AxisConfigBase } from '../types/config';
import type { LayoutInfo } from '../types/layout';

const hiddenStyle = {
  visibility: 'hidden'
};

export interface AxisGridProps {
  vertical: boolean;
  axisConfig: AxisConfigBase & { useSeriesFocus?: boolean };
  seriesLayoutInfo: LayoutInfo;
  axisFocusPercentage?: number | null;
  seriesFocusPercentage?: number | null;
  axisGridClass: string;
  axisTicks: AxisTick[];
}

interface GridLineHandle {
  root: ReturnType<typeof svgEl>;
  line: ReturnType<typeof svgEl>;
}

export default class AxisGrid extends Renderer<AxisGridProps> {
  root = svgEl('g');
  lines = this.elList<AxisTick, GridLineHandle>(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { vertical, axisConfig, seriesLayoutInfo, axisFocusPercentage, seriesFocusPercentage, axisGridClass, axisTicks } = this.props;
    if (axisConfig.visible && axisConfig.gridLines) {
      let tickX = 0;
      let tickY = 0;

      const stroke = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus ?? false,
        axisConfig.gridLineColor, axisConfig.gridLineFocusedColor, axisConfig.gridLineDefocusedColor);
      const strokeOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus ?? false,
        axisConfig.gridLineOpacity, axisConfig.gridLineFocusedOpacity, axisConfig.gridLineDefocusedOpacity);
      const strokeWidth = axisConfig.gridLineWidth;
      const strokeDashArray = axisConfig.gridLineDashArray;

      this.setPresent(true);
      this.root.set({ className: axisGridClass });
      this.lines.sync(axisTicks, {
        key: (_tick, i) => 'gridLine-' + i,
        create: () => {
          const root = svgEl('g');
          const line = svgEl('line');
          root.append(line);
          return { root, line };
        },
        update: (handle, tick, i) => {
          if (vertical) {
            tickY = tick.position;
          }
          else {
            tickX = tick.position;
          }
          handle.root.set({ className: mochartCssClasses['axisGridLine'] + i, transform: translate(tickX, tickY) });
          handle.line.set({ x1: seriesLayoutInfo.x, y1: seriesLayoutInfo.y, style: tick.hidden ? hiddenStyle : null,
            x2: vertical ? seriesLayoutInfo.x + seriesLayoutInfo.width : seriesLayoutInfo.x,
            y2: vertical ? seriesLayoutInfo.y : seriesLayoutInfo.y + seriesLayoutInfo.height,
            stroke, strokeOpacity, strokeWidth,
            strokeDasharray: strokeDashArray });
        }
      });
    }
    else {
      this.setPresent(false);
    }
  }
}
