// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import AxisThresholdLine from './AxisThresholdLine';
import { mochartCssClasses } from '../utils/ChartDom';
import { getAxisFocusColor, getAxisFocusOpacity } from '../utils/FocusValue';

export default class AxisThreshold extends Renderer {
  root = svgEl('g');
  line = this.slot(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { hidden } = this.props;
    if (!hidden) {
      const { axisConfig, axisLayoutInfo, seriesLayoutInfo, axisDomain, vertical, axisFocusPercentage, seriesFocusPercentage, axisThresholdClass, front } = this.props;
      const { threshold, thresholdFront, thresholdWidth, thresholdDashArray,
        thresholdTitle, thresholdTitleBefore, thresholdTitleSnapToValue, thresholdTitleMargin, thresholdTitlePadding,
        thresholdTitleStrokeColor, thresholdTitleFocusedStrokeColor, thresholdTitleDefocusedStrokeColor,
        thresholdTitleFillColor, thresholdTitleFocusedFillColor, thresholdTitleDefocusedFillColor,
        thresholdTitleStrokeOpacity, thresholdTitleFocusedStrokeOpacity, thresholdTitleDefocusedStrokeOpacity,
        thresholdTitleFillOpacity, thresholdTitleFocusedFillOpacity, thresholdTitleDefocusedFillOpacity,
        thresholdColor, thresholdFocusedColor, thresholdDefocusedColor,
        thresholdOpacity, thresholdFocusedOpacity, thresholdDefocusedOpacity,
        useSeriesFocus
      } = axisConfig;

      this.setPresent(true);
      this.root.set({ className: axisThresholdClass });

      if (front !== thresholdFront) {
        this.line.set(null);
      }
      else {
        this.line.set(AxisThresholdLine, { axisConfig, axisLayoutInfo, seriesLayoutInfo, axisThresholdLineClass: mochartCssClasses['axisThreshold'], vertical,
          threshold, axisDomain, thresholdTitle, thresholdTitleBefore, thresholdTitleSnapToValue,
          thresholdTitleMargin, thresholdTitlePadding,
          stroke: getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, thresholdColor, thresholdFocusedColor, thresholdDefocusedColor),
          strokeOpacity: getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, thresholdOpacity, thresholdFocusedOpacity, thresholdDefocusedOpacity),
          strokeWidth: thresholdWidth, strokeDashArray: thresholdDashArray,
          titleStroke: getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, thresholdTitleStrokeColor, thresholdTitleFocusedStrokeColor, thresholdTitleDefocusedStrokeColor),
          titleStrokeOpacity: getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, thresholdTitleStrokeOpacity, thresholdTitleFocusedStrokeOpacity, thresholdTitleDefocusedStrokeOpacity),
          titleFill: getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, thresholdTitleFillColor, thresholdTitleFocusedFillColor, thresholdTitleDefocusedFillColor),
          titleFillOpacity: getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, thresholdTitleFillOpacity, thresholdTitleFocusedFillOpacity, thresholdTitleDefocusedFillOpacity) });
      }
    }
    else {
      this.setPresent(false);
    }
  }
}
