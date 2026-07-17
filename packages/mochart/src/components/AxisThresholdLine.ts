import { Renderer, svgEl, textEl } from '../render';

import { translate, translateRotate } from '../utils/utils';
import { NONE, SCALE_LINEAR, TYPE_NUMBER, TYPE_DATE } from '../config/core/constants';
import type { El, TextEl } from '../render';
import type { AxisConfigBase } from '../types/config';
import type { DataType, Scale } from '../config/core/constants';
import type { AxisLayoutInfo, LayoutInfo } from '../types/layout';
import type { MarginPadding } from '../types/geometry';

type ThresholdTitleEl = El & { textHandle: El; valueHandle: TextEl };

export type ThresholdAxisConfig = AxisConfigBase & {
  scale: Scale;
  type: DataType;
  useSeriesFocus?: boolean;
};

interface AxisThresholdLineProps {
  axisConfig: ThresholdAxisConfig;
  threshold: number | null;
  axisDomain: [number | Date | null, number | Date | null];
  seriesLayoutInfo: LayoutInfo;
  axisLayoutInfo: AxisLayoutInfo;
  axisThresholdLineClass: string;
  stroke: string;
  strokeOpacity: number;
  strokeWidth: number;
  strokeDashArray: string | null;
  vertical: boolean;
  thresholdTitle: string | null;
  thresholdTitleBefore: boolean;
  thresholdTitleSnapToValue: boolean;
  thresholdTitleMargin: MarginPadding;
  thresholdTitlePadding: MarginPadding;
  titleStroke: string;
  titleStrokeOpacity: number;
  titleFill: string;
  titleFillOpacity: number;
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
    const thresholdValue = type === TYPE_DATE && threshold !== null ? new Date(threshold) : threshold;
    const domainMin = axisDomain[0]?.valueOf();
    const domainMax = axisDomain[1]?.valueOf();
    const numericThreshold = thresholdValue?.valueOf();
    if (scale === SCALE_LINEAR && threshold !== NONE && numericThreshold !== undefined && domainMin !== undefined && domainMax !== undefined && domainMin !== domainMax && numericThreshold >= domainMin && numericThreshold <= domainMax) {
      const { seriesLayoutInfo, axisThresholdLineClass, stroke, strokeOpacity, strokeWidth, strokeDashArray, vertical } = this.props;
      const thresholdPercentage = (numericThreshold - domainMin) / (domainMax - domainMin);

      let thresholdX = seriesLayoutInfo.x;
      let thresholdY = seriesLayoutInfo.y;
      if (vertical) {
        thresholdY += (1 - thresholdPercentage) * seriesLayoutInfo.height;
      }
      else {
        thresholdX += thresholdPercentage * seriesLayoutInfo.width;
      }

      const { thresholdTitle } = this.props;
      if (thresholdTitle !== NONE) {
        const { before } = axisConfig;
        const { axisLayoutInfo, thresholdTitleBefore, thresholdTitleSnapToValue, titleStroke, titleStrokeOpacity, titleFill, titleFillOpacity } = this.props;
        const { thresholdTitleLayoutInfo } = axisLayoutInfo;
        let titleX = thresholdX;
        let titleY = thresholdY;
        let hidden = false;
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
          hidden = height > seriesLayoutInfo.height;
          if (before) {
            // left
          }
          else {
            // right
            titleX += seriesLayoutInfo.width - width;
          }
          if (thresholdTitleBefore) {
            // below
            titleY = Math.min(thresholdY, seriesLayoutInfo.y + seriesLayoutInfo.height - height);
          }
          else {
            // above
            titleY = Math.max(thresholdY - height, seriesLayoutInfo.y);
          }
          if (thresholdTitleSnapToValue) {
            if (thresholdTitleBefore && titleY < thresholdY) {
              if (thresholdY - height >= seriesLayoutInfo.y) {
                titleY = thresholdY - height;
              }
              else {
                hidden = true;
              }
            }
            else if (!thresholdTitleBefore && titleY > (thresholdY - height)) {
              if (thresholdY + height <= seriesLayoutInfo.y + seriesLayoutInfo.height) {
                titleY = thresholdY;
              }
              else {
                hidden = true;
              }
            }
          }
        }
        else {
          paddingX += paddingHeight / 2.0;
          hidden = width > seriesLayoutInfo.width;
          if (before) {
            // below
          }
          else {
            // above
            titleY += seriesLayoutInfo.height - height;
          }
          if (thresholdTitleBefore) {
            // left
            titleX = Math.max(thresholdX - width, seriesLayoutInfo.x);
          }
          else {
            // right
            titleX = Math.min(thresholdX, seriesLayoutInfo.x + seriesLayoutInfo.width - width);
          }
          if (thresholdTitleSnapToValue) {
            if (thresholdTitleBefore && titleX > (thresholdX - width)) {
              if (thresholdX + width <= seriesLayoutInfo.x + seriesLayoutInfo.width) {
                titleX = thresholdX;
              }
              else {
                hidden = true;
              }
            }
            else if (!thresholdTitleBefore && titleX < (thresholdX + width)) {
              if (thresholdX - width >= seriesLayoutInfo.x) {
                titleX = thresholdX - width;
              }
              else {
                hidden = true;
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
        titleGroup.set({ transform: translate(titleX, titleY) });
        titleGroup.textHandle.set({ transform: translateRotate(paddingX, paddingY, vertical ? 0 : 90),
          fill: titleFill, fillOpacity: titleFillOpacity,
          stroke: titleStroke, strokeOpacity: titleStrokeOpacity, dy: '0.35em' });
        titleGroup.valueHandle.set(thresholdTitle);
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
