// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { translate } from '../utils/utils';
import { getAxisFocusColor, getAxisFocusOpacity } from '../utils/FocusValue';
import { NONE } from '../config/core/constants';

export default class AxisBaseLine extends Renderer {
  root = svgEl('g');
  inner = svgEl('g');
  line = svgEl('line');

  create() {
    this.inner.append(this.line);
    this.root.append(this.inner);
    return this.root.node;
  }

  sync() {
    const { seriesAxisConfig, basePercentage, axisBaseLineClass } = this.props;
    const { base, baseLine } = seriesAxisConfig;
    if (base !== NONE && baseLine && basePercentage > 0 && basePercentage < 1) {
      const { plotConfig, seriesLayoutInfo, axisFocusPercentage, seriesFocusPercentage } = this.props;
      const { inverted } = plotConfig;

      const stroke = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, seriesAxisConfig.useSeriesFocus,
        seriesAxisConfig.baseLineColor, seriesAxisConfig.baseLineFocusedColor, seriesAxisConfig.baseLineDefocusedColor);
      const strokeOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, seriesAxisConfig.useSeriesFocus,
        seriesAxisConfig.baseLineOpacity, seriesAxisConfig.baseLineFocusedOpacity, seriesAxisConfig.baseLineDefocusedOpacity);
      const strokeWidth = seriesAxisConfig.baseLineWidth;
      const strokeDashArray = seriesAxisConfig.baseLineDashArray;

      const vertical = !inverted;

      let baseX = 0;
      let baseY = 0;
      if (vertical) {
        baseY = (1 - basePercentage) * seriesLayoutInfo.height;
      }
      else {
        baseX = basePercentage * seriesLayoutInfo.width;
      }

      this.setPresent(true);
      this.root.set({ className: axisBaseLineClass });
      this.inner.set({ className: mochartCssClasses['axisBaseLine'], transform: translate(baseX, baseY) });
      this.line.set({ x1: seriesLayoutInfo.x, y1: seriesLayoutInfo.y,
        x2: vertical ? seriesLayoutInfo.x + seriesLayoutInfo.width : seriesLayoutInfo.x,
        y2: vertical ? seriesLayoutInfo.y : seriesLayoutInfo.y + seriesLayoutInfo.height,
        stroke, strokeOpacity, strokeWidth,
        strokeDasharray: strokeDashArray });
    }
    else {
      this.setPresent(false);
    }
  }
}
