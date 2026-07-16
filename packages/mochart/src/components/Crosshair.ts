// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { getClipPathReference } from '../utils/svgUtils';

const emptyPercentages = [];

class Crosshair extends Renderer {
  root = svgEl('g');
  groupLinesGroup = svgEl('g');
  seriesLinesGroup = svgEl('g');
  groupLines = this.elList(this.groupLinesGroup);
  seriesLines = this.elList(this.seriesLinesGroup);

  create() {
    this.root.append(this.groupLinesGroup, this.seriesLinesGroup);
    return this.root.node;
  }

  sync() {
    const { mochartConfig, seriesLayoutInfo, groupPercentages, seriesPercentages, tooltipClipPathUniqueId } = this.props;

    if (mochartConfig.crosshairConfig.visible) {
      const { plotConfig, crosshairConfig } = mochartConfig;

      const { inverted } = plotConfig;

      let minX = seriesLayoutInfo.x;
      let maxX = minX + seriesLayoutInfo.width;
      let minY = seriesLayoutInfo.y;
      let maxY = minY + seriesLayoutInfo.height;

      let clipPath = crosshairConfig.showBehindTooltip ? null : getClipPathReference(tooltipClipPathUniqueId);

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['crosshair'], clipPath });
      this.groupLinesGroup.set({ className: mochartCssClasses['crosshairGroupLines'] });
      this.seriesLinesGroup.set({ className: mochartCssClasses['crosshairSeriesLines'] });

      const lineAdapter = {
        key: (percentage, i) => i,
        create: () => ({ root: svgEl('line') }),
        update: null
      };

      this.groupLines.sync(crosshairConfig.showGroup ? groupPercentages : emptyPercentages, {
        ...lineAdapter,
        update: (handle, groupPercentage) => {
          let groupOffset = groupPercentage * seriesLayoutInfo.groupExtent;
          let groupPosition = (inverted ? minY : minX) + groupOffset;
          let groupX1 = inverted ? minX : groupPosition;
          let groupX2 = inverted ? maxX : groupPosition;
          let groupY1 = inverted ? groupPosition : minY;
          let groupY2 = inverted ? groupPosition : maxY;

          handle.root.set({ className: mochartCssClasses['crosshairLine'],
            x1: groupX1, y1: groupY1, x2: groupX2, y2: groupY2, stroke: crosshairConfig.lineColor,
            strokeWidth: crosshairConfig.lineWidth, strokeDasharray: crosshairConfig.lineDashArray });
        }
      });

      this.seriesLines.sync(crosshairConfig.showSeries ? seriesPercentages : emptyPercentages, {
        ...lineAdapter,
        update: (handle, seriesPercentage) => {
          let seriesOffset = seriesPercentage * seriesLayoutInfo.seriesExtent;
          let seriesPosition = (inverted ? minX : minY) + seriesOffset;
          let seriesX1 = inverted ? seriesPosition : minX;
          let seriesX2 = inverted ? seriesPosition : maxX;
          let seriesY1 = inverted ? minY : seriesPosition;
          let seriesY2 = inverted ? maxY : seriesPosition;

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
