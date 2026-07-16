// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, htmlEl } from '../render';

import TooltipContent from './TooltipContent';

import { mochartCssClasses } from '../utils/ChartDom';

export default class Tooltip extends Renderer {
  root = htmlEl('div');
  sizer = htmlEl('div');
  sizerContent = this.slot(this.sizer);
  tooltip = htmlEl('div');
  tooltipContent = this.slot(this.tooltip);

  create() {
    this.root.append(this.sizer, this.tooltip);
    return this.root.node;
  }

  sync() {
    const { mochartConfig, tooltipVisible, tooltipGroupIndex } = this.props;
    if (mochartConfig.tooltipConfig.visible && tooltipVisible && tooltipGroupIndex >= 0) {
      const { svgUniqueId, groupCount, focusedGroupIndex, tooltipBounds, tooltipValueObject, focusedSeriesId,
        seriesAxisFocusPercentages, seriesFocusPercentages, tooltipLayoutInfo, onClose, updateTooltipGroupIndex, onFocus, onSeriesFilter } = this.props;

      const { tooltipConfig } = mochartConfig;

      const { x, y } = tooltipLayoutInfo;

      const boxShadowStyle = tooltipConfig.dropShadowOffsetX + 'px ' + tooltipConfig.dropShadowOffsetY + 'px ' +
        tooltipConfig.dropShadowBlurRadius + 'px ' + tooltipConfig.dropShadowColor;

      const tooltipSizerStyle = {
        position: 'absolute',
        left: 0,
        top: 0,
        visibility: 'hidden'
      };

      const tooltipStyle = {
        position: 'absolute',
        left: x,
        top: y,
        background: tooltipConfig.backgroundColor,
        borderStyle: 'solid',
        padding: tooltipConfig.padding,
        borderWidth: tooltipConfig.borderWidth,
        borderColor: tooltipConfig.borderColor,
        borderRadius: tooltipConfig.borderRadius,
        boxShadow: boxShadowStyle,
        visibility: tooltipBounds !== null ? 'visible' : 'hidden'
      };

      const sizeForSuppression = tooltipConfig.adjustSizeForSuppression;

      const commonProps = {
        mochartConfig, tooltipValueObject, tooltipGroupIndex, focusedGroupIndex,
        focusedSeriesId, seriesAxisFocusPercentages, seriesFocusPercentages,
        svgUniqueId, updateTooltipGroupIndex,
        onClose, onFocus, onSeriesFilter, groupCount
      };

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['tooltipContainer'] });
      this.sizer.set({ className: mochartCssClasses['tooltipSizer'], style: tooltipSizerStyle });
      this.sizerContent.set(TooltipContent, { ...commonProps, adjustForSuppression: sizeForSuppression, visible: false });
      this.tooltip.set({ className: mochartCssClasses['tooltip'], style: tooltipStyle });
      this.tooltipContent.set(TooltipContent, { ...commonProps, minWidth: tooltipBounds ? tooltipBounds.width : null, visible: true });
    }
    else {
      this.setPresent(false);
    }
  }
}
