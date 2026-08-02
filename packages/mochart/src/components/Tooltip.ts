import { Renderer, htmlEl } from '../render';

import TooltipContent from './TooltipContent';

import { mochartCssClasses } from '../utils/ChartDom';
import { cssStyleColor } from '../utils/style';
import type { MochartConfig } from '../types/config';
import type { FocusPercentageMap } from '../types/animation';
import type { SpacingLayoutInfo } from '../types/layout';
import type { Bounds } from '../types/geometry';
import type { GroupSeriesValueObject } from '../data/ChartData';

interface TooltipProps {
  mochartConfig: MochartConfig;
  tooltipVisible: boolean;
  tooltipGroupIndex: number;
  svgUniqueId: string;
  groupCount: number;
  focusedGroupIndex: number;
  tooltipBounds: Bounds | null;
  tooltipValueObject: GroupSeriesValueObject;
  focusedSeriesId: string | null;
  seriesAxisFocusPercentages: FocusPercentageMap;
  seriesFocusPercentages: FocusPercentageMap;
  tooltipLayoutInfo: SpacingLayoutInfo;
  onClose: () => void;
  updateTooltipGroupIndex: (groupIndex: number) => void;
  onFocus: (focus: { groupIndex?: number | null; seriesId?: string | null }) => void;
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
