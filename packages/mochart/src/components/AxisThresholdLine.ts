import { Renderer, svgEl, textEl } from '../render';

import { translate, translateRotate } from '../utils/utils';
import { mochartCssClasses } from '../utils/ChartDom';
import { NONE, SCALE_LINEAR, SIDE_START, TITLE_SIDE_LOW, TYPE_DATE } from '../config/core/constants';
import type { El, TextEl } from '../render';
import type { AxisConfigBase } from '../types/config';
import type { ResolvedThreshold } from '../config/defaults/axisConfig';
import type { DataType, Scale } from '../config/core/constants';
import type { AxisLayoutInfo, LayoutInfo } from '../types/layout';

type ThresholdTitleEl = El & { textHandle: El; valueHandle: TextEl };

export type ThresholdAxisConfig = AxisConfigBase & {
  scale: Scale;
  type: DataType;
  useSeriesFocus?: boolean;
};

export interface AxisThresholdLineProps {
  axisConfig: ThresholdAxisConfig;
  threshold: ResolvedThreshold;
  thresholdIndex: number;
  axisDomain: [number | Date | null, number | Date | null];
  seriesLayoutInfo: LayoutInfo;
  axisLayoutInfo: AxisLayoutInfo;
  axisThresholdLineClass: string;
  stroke: string | null;
  strokeOpacity: number | null;
  strokeWidth: number | null;
  strokeDashArray: string | null;
  vertical: boolean;
  /** Whether the axis's pixel position grows with the value along its direction. */
  ascending: boolean;
  titleStroke: string | null;
  titleStrokeOpacity: number | null;
  titleStrokeWidth: number | null;
  titleFill: string | null;
  titleFillOpacity: number | null;
}

export default class AxisThresholdLine extends Renderer<AxisThresholdLineProps> {
  root = svgEl('g');
  lineGroup = svgEl('g');
  line = svgEl('line');
  title = this.elSlot(this.root);

  create() {
    this.lineGroup.append(this.line);
    this.root.node.insertBefore(this.lineGroup.node, this.root.node.firstChild);
    return this.root.node;
  }

  sync() {
    const { axisConfig, threshold, axisDomain } = this.props;
    const { scale, type } = axisConfig;
    const rawValue = threshold.value;
    const thresholdValue = type === TYPE_DATE ? new Date(rawValue) : (typeof rawValue === 'number' ? rawValue : Number(rawValue));
    const domainMin = axisDomain[0]?.valueOf();
    const domainMax = axisDomain[1]?.valueOf();
    const numericThreshold = thresholdValue?.valueOf();
    const validThreshold = typeof numericThreshold === 'number' && !Number.isNaN(numericThreshold) ? numericThreshold : undefined;
    if (scale === SCALE_LINEAR && validThreshold !== undefined && domainMin !== undefined && domainMax !== undefined && domainMin !== domainMax && validThreshold >= domainMin && validThreshold <= domainMax) {
      const { seriesLayoutInfo, axisThresholdLineClass, stroke, strokeOpacity, strokeWidth, strokeDashArray, vertical, ascending } = this.props;
      const thresholdPercentage = (validThreshold - domainMin) / (domainMax - domainMin);
      const positionPercentage = ascending ? thresholdPercentage : 1 - thresholdPercentage;

      let thresholdX = seriesLayoutInfo.x;
      let thresholdY = seriesLayoutInfo.y;
      if (vertical) {
        thresholdY += positionPercentage * seriesLayoutInfo.height;
      }
      else {
        thresholdX += positionPercentage * seriesLayoutInfo.width;
      }

      if (threshold.title !== NONE) {
        const start = axisConfig.side === SIDE_START;
        const titleLow = threshold.titleSide === TITLE_SIDE_LOW;
        const { titleSnapToValue } = threshold;
        const { axisLayoutInfo, thresholdIndex, titleStroke, titleStrokeOpacity, titleStrokeWidth, titleFill, titleFillOpacity } = this.props;
        const thresholdTitleLayoutInfo = axisLayoutInfo.thresholdTitleLayoutInfos[thresholdIndex] ?? { x: 0, y: 0, width: 0, height: 0 };
        let titleX = thresholdX;
        let titleY = thresholdY;
        const paddingRelativeBounds = 'paddingRelativeBounds' in thresholdTitleLayoutInfo
          ? thresholdTitleLayoutInfo.paddingRelativeBounds
          : thresholdTitleLayoutInfo;
        let { width, height } = thresholdTitleLayoutInfo;
        let { x: paddingX, y: paddingY, height: paddingHeight } = paddingRelativeBounds;

        if (!vertical) {
          let temp;

          temp = width;
          width = height;
          height = temp;

          temp = paddingX;
          paddingX = paddingY;
          paddingY = temp;
        }

        if (vertical) {
          paddingY += paddingHeight / 2.0;
          if (start) {
            // left
          }
          else {
            // right
            titleX += seriesLayoutInfo.width - width;
          }
          if (titleLow) {
            // below
            titleY = Math.min(thresholdY, seriesLayoutInfo.y + seriesLayoutInfo.height - height);
          }
          else {
            // above
            titleY = Math.max(thresholdY - height, seriesLayoutInfo.y);
          }
          if (titleSnapToValue) {
            if (titleLow && titleY < thresholdY) {
              if (thresholdY - height >= seriesLayoutInfo.y) {
                titleY = thresholdY - height;
              }

            }
            else if (!titleLow && titleY > (thresholdY - height)) {
              if (thresholdY + height <= seriesLayoutInfo.y + seriesLayoutInfo.height) {
                titleY = thresholdY;
              }

            }
          }
        }
        else {
          paddingX += paddingHeight / 2.0;
          if (start) {
            // below
          }
          else {
            // above
            titleY += seriesLayoutInfo.height - height;
          }
          if (titleLow) {
            // left
            titleX = Math.max(thresholdX - width, seriesLayoutInfo.x);
          }
          else {
            // right
            titleX = Math.min(thresholdX, seriesLayoutInfo.x + seriesLayoutInfo.width - width);
          }
          if (titleSnapToValue) {
            if (titleLow && titleX > (thresholdX - width)) {
              if (thresholdX + width <= seriesLayoutInfo.x + seriesLayoutInfo.width) {
                titleX = thresholdX;
              }

            }
            else if (!titleLow && titleX < (thresholdX + width)) {
              if (thresholdX - width >= seriesLayoutInfo.x) {
                titleX = thresholdX - width;
              }

            }
          }
        }
        const titleGroup = this.title.set('title', () => {
          const group = svgEl('g') as ThresholdTitleEl;
          const text = svgEl('text');
          const value = textEl();
          text.append(value);
          group.append(text);
          group.textHandle = text;
          group.valueHandle = value;
          return group;
        }) as ThresholdTitleEl;
        titleGroup.set({ className: mochartCssClasses['axisThresholdTitle'] + thresholdIndex, transform: translate(titleX, titleY) });
        titleGroup.textHandle.set({ transform: translateRotate(paddingX, paddingY, vertical ? 0 : 90),
          fill: titleFill, fillOpacity: titleFillOpacity,
          stroke: titleStroke, strokeOpacity: titleStrokeOpacity, strokeWidth: titleStrokeWidth, dy: '0.35em' });
        titleGroup.valueHandle.set(threshold.title);
      }
      else {
        this.title.set(null);
      }

      this.setPresent(true);
      this.root.set({ className: axisThresholdLineClass });
      this.lineGroup.set({ transform: translate(thresholdX, thresholdY) });
      this.line.set({ x1: 0, y1: 0,
        x2: vertical ? seriesLayoutInfo.width : 0,
        y2: vertical ? 0 : seriesLayoutInfo.height,
        stroke, strokeOpacity, strokeWidth,
        strokeDasharray: strokeDashArray });
    }
    else {
      this.setPresent(false);
    }
  }
}
