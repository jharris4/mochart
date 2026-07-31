import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { getClipPathReference } from '../utils/svgUtils';
import type { MochartConfig } from '../types/config';
import type { LayoutInfo } from '../types/layout';

const emptyPercentages: number[] = [];

interface CrosshairProps {
  mochartConfig: MochartConfig;
  seriesLayoutInfo: LayoutInfo;
  groupPercentages: number[];
  seriesPercentages: number[];
  tooltipClipPathUniqueId: string;
}

class Crosshair extends Renderer<CrosshairProps> {
  root = svgEl('g');
  groupLinesGroup = svgEl('g');
  seriesLinesGroup = svgEl('g');
  groupLines = this.elList<number>(this.groupLinesGroup);
  seriesLines = this.elList<number>(this.seriesLinesGroup);

  create() {
    this.root.append(this.groupLinesGroup, this.seriesLinesGroup);
    return this.root.node;
  }

  sync() {
    const { mochartConfig, seriesLayoutInfo, groupPercentages, seriesPercentages, tooltipClipPathUniqueId } = this.props;

    if (mochartConfig.crosshairConfig.visible) {
      const { plotConfig, crosshairConfig } = mochartConfig;

      const { inverted } = plotConfig;

      const minX = seriesLayoutInfo.x;
      const maxX = minX + seriesLayoutInfo.width;
      const minY = seriesLayoutInfo.y;
      const maxY = minY + seriesLayoutInfo.height;

      const clipPath = crosshairConfig.showBehindTooltip ? null : getClipPathReference(tooltipClipPathUniqueId);

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['crosshair'], clipPath });
      this.groupLinesGroup.set({ className: mochartCssClasses['crosshairGroupLines'] });
      this.seriesLinesGroup.set({ className: mochartCssClasses['crosshairSeriesLines'] });

      const lineAdapter = {
        key: (_percentage: number, i: number) => i,
        create: () => ({ root: svgEl('line') }),
        update: null
      };

      this.groupLines.sync(crosshairConfig.showGroup ? groupPercentages : emptyPercentages, {
        ...lineAdapter,
        update: (handle, groupPercentage) => {
          const groupOffset = groupPercentage * seriesLayoutInfo.groupExtent;
          const groupPosition = (inverted ? minY : minX) + groupOffset;
          const groupX1 = inverted ? minX : groupPosition;
          const groupX2 = inverted ? maxX : groupPosition;
          const groupY1 = inverted ? groupPosition : minY;
          const groupY2 = inverted ? groupPosition : maxY;

          handle.root.set({ className: mochartCssClasses['crosshairLine'],
            x1: groupX1, y1: groupY1, x2: groupX2, y2: groupY2, stroke: crosshairConfig.lineColor,
            strokeWidth: crosshairConfig.lineWidth, strokeDasharray: crosshairConfig.lineDashArray });
        }
      });

      this.seriesLines.sync(crosshairConfig.showSeries ? seriesPercentages : emptyPercentages, {
        ...lineAdapter,
        update: (handle, seriesPercentage) => {
          const seriesOffset = seriesPercentage * seriesLayoutInfo.seriesExtent;
          const seriesPosition = (inverted ? minX : minY) + seriesOffset;
          const seriesX1 = inverted ? seriesPosition : minX;
          const seriesX2 = inverted ? seriesPosition : maxX;
          const seriesY1 = inverted ? minY : seriesPosition;
          const seriesY2 = inverted ? maxY : seriesPosition;

          handle.root.set({ className: mochartCssClasses['crosshairLine'],
            x1: seriesX1, y1: seriesY1, x2: seriesX2, y2: seriesY2, stroke: crosshairConfig.lineColor,
            strokeWidth: crosshairConfig.lineWidth, strokeDasharray: crosshairConfig.lineDashArray });
        }
      });
    }
    else {
      this.setPresent(false);
    }
  }
}

export default Crosshair;
