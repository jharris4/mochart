import { Renderer, htmlEl } from '../render';

import TooltipContent from './TooltipContent';

import { mochartCssClasses } from '../utils/ChartDom';
import { cssStyleColor } from '../utils/style';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { FocusPercentageMap } from '../types/animation';
import type { SpacingLayoutInfo } from '../types/layout';
import type { Bounds } from '../types/geometry';
import type { CategorySeriesValueObject } from '../data/ChartData';

interface TooltipProps {
  mochartConfig: EnhancedMochartConfig;
  tooltipVisible: boolean;
  tooltipCategoryIndex: number;
  svgUniqueId: string;
  categoryCount: number;
  focusedCategoryIndex: number;
  tooltipBounds: Bounds | null;
  tooltipValueObject: CategorySeriesValueObject;
  focusedSeriesId: string | null;
  valueAxisFocusPercentages: FocusPercentageMap;
  seriesFocusPercentages: FocusPercentageMap;
  tooltipLayoutInfo: SpacingLayoutInfo;
  onClose: () => void;
  updateTooltipCategoryIndex: (categoryIndex: number) => void;
  onFocus: (focus: { categoryIndex?: number | null; seriesId?: string | null }) => void;
  onSeriesFilter: (seriesId: string) => void;
}

export default class Tooltip extends Renderer<TooltipProps> {
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
    const { mochartConfig, tooltipVisible, tooltipCategoryIndex } = this.props;
    if (mochartConfig.tooltip.visible && tooltipVisible && tooltipCategoryIndex >= 0) {
      const { svgUniqueId, categoryCount, focusedCategoryIndex, tooltipBounds, tooltipValueObject, focusedSeriesId,
        valueAxisFocusPercentages, seriesFocusPercentages, tooltipLayoutInfo, onClose, updateTooltipCategoryIndex, onFocus, onSeriesFilter } = this.props;

      const { tooltip: tooltipConfig } = mochartConfig;

      const { x, y } = tooltipLayoutInfo;

      const boxShadowStyle = tooltipConfig.dropShadowOffsetX + 'px ' + tooltipConfig.dropShadowOffsetY + 'px ' +
        tooltipConfig.dropShadowBlurRadius + 'px ' + tooltipConfig.dropShadowColor;

      const tooltipSizerStyle = {
        position: 'absolute',
        left: 0,
        top: 0,
        visibility: 'hidden'
      };

      // the tooltip is html: the fill is the box's background and the stroke its border, and css has
      // nowhere to put a separate opacity, so each opacity is composited into its color
      const { backgroundStyle } = tooltipConfig;

      const tooltipStyle = {
        position: 'absolute',
        left: x,
        top: y,
        background: cssStyleColor(backgroundStyle.fillColor, backgroundStyle.fillOpacity),
        borderStyle: 'solid',
        padding: tooltipConfig.padding,
        borderWidth: backgroundStyle.strokeWidth,
        borderColor: cssStyleColor(backgroundStyle.strokeColor, backgroundStyle.strokeOpacity),
        borderRadius: tooltipConfig.borderRadius,
        boxShadow: boxShadowStyle,
        visibility: tooltipBounds !== null ? 'visible' : 'hidden'
      };

      const sizeForFiltering = tooltipConfig.adjustSizeForFiltering;

      const commonProps = {
        mochartConfig, tooltipValueObject, tooltipCategoryIndex, focusedCategoryIndex,
        focusedSeriesId, valueAxisFocusPercentages, seriesFocusPercentages,
        svgUniqueId, updateTooltipCategoryIndex,
        onClose, onFocus, onSeriesFilter, categoryCount
      };

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['tooltipContainer'] });
      this.sizer.set({ className: mochartCssClasses['tooltipSizer'], style: tooltipSizerStyle });
      this.sizerContent.set(TooltipContent, { ...commonProps, adjustForFiltering: sizeForFiltering, visible: false });
      this.tooltip.set({ className: mochartCssClasses['tooltip'], style: tooltipStyle });
      this.tooltipContent.set(TooltipContent, { ...commonProps, minWidth: tooltipBounds ? tooltipBounds.width : null, visible: true });
    }
    else {
      this.setPresent(false);
    }
  }
}
