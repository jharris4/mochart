import { Renderer, svgEl, htmlEl } from '../render';
import type { El, ElSlot, Slot } from '../render';

import LinearGradient from './LinearGradient';
import RadialGradient from './RadialGradient';
import SeriesColorGradient from './SeriesColorGradient';

import { AUTO, NONE } from '../config/core/constants';
import { getSeriesColor, getSeriesOpacities, getSeriesGradientColors } from '../utils/SeriesColors';
import { getSymbolGenerator } from '../utils/shapeUtils';
import { translate } from '../utils/utils';
import { getGradientReference } from '../utils/svgUtils';
import { getFocusValue } from '../utils/FocusValue';
import type { ColorPaletteConfig, LegendConfig, SeriesConfig, TooltipConfig } from '../types/config';

interface SeriesColorUniqueIds {
  seriesColorGradientUniqueIds: Record<string, string>;
  gradientIdMap: Record<string, string>;
}

interface SeriesColorIconProps {
  visible?: boolean;
  renderHTML: boolean;
  seriesContextConfig: LegendConfig | TooltipConfig;
  seriesShowColorProperty: 'showColorInLegend' | 'showColorInTooltip';
  seriesConfig: SeriesConfig;
  seriesIndex: number;
  colorPaletteConfig: ColorPaletteConfig;
  seriesIsSuppressed: boolean;
  focused: boolean;
  defocused: boolean;
  focusPercentage: number | null;
  iconClassName?: string | null;
  svgUniqueId?: string;
  uniqueIds?: SeriesColorUniqueIds;
}

// Auto-sized tooltip icons use a stable internal coordinate system while the
// outer SVG viewport follows the inherited font size through `1em`.
const autoIconViewBoxSize = 16;

function getIconGeometrySize(seriesContextConfig: LegendConfig | TooltipConfig): number {
  return seriesContextConfig.iconSize === AUTO ? autoIconViewBoxSize : seriesContextConfig.iconSize;
}

export default class SeriesColorIcon extends Renderer<SeriesColorIconProps> {
  span!: El;
  svg!: El;
  spacer!: El;
  defs: El | null = null;
  defsSlot!: ElSlot;
  shapeSlot!: ElSlot;
  defsGradientSlot!: Slot;

  // renderHTML is decided per call site and never changes for a mounted
  // instance, so the structure is chosen once at create() time.
  create() {
    if (this.props.renderHTML) {
      this.span = htmlEl('span');
      this.svg = svgEl('svg');
      this.defsSlot = this.elSlot(this.svg);
      this.shapeSlot = this.elSlot(this.svg);
      this.defs = null;
      this.spacer = htmlEl('span');
      this.span.append(this.svg, this.spacer);
      return this.span.node;
    }
    this.shapeSlot = this.elSlot();
    return null;
  }

  sync() {
    if (this.props.renderHTML) {
      this.syncHTML();
    }
    else {
      this.syncSVG();
    }
  }

  syncHTML() {
    const { seriesContextConfig, seriesShowColorProperty, seriesConfig, svgUniqueId, iconClassName } = this.props;
    const { showIconColors, showIconPlaceholders } = seriesContextConfig;
    const showSeriesColor = showIconColors && seriesConfig[seriesShowColorProperty];

    if (showSeriesColor || showIconPlaceholders) {
      const { iconSize, iconSpacerSize } = seriesContextConfig;
      const geometrySize = getIconGeometrySize(seriesContextConfig);
      const displaySize = iconSize === AUTO ? '1em' : iconSize;
      const colorStyle = {
        display: 'inline-block',
        width: iconSize === AUTO ? `calc(1em + ${iconSpacerSize}px)` : iconSize + iconSpacerSize,
        verticalAlign: 'middle'
      };
      const spacerStyle = {
        display: 'inline-block',
        width: iconSpacerSize,
        height: displaySize
      };

      const gradientId = svgUniqueId! + '-' + seriesConfig.id;

      this.setPresent(true);
      this.span.set({ className: iconClassName, style: colorStyle });
      this.svg.set({
        xmlns: 'http://www.w3.org/2000/svg',
        width: displaySize,
        height: displaySize,
        viewBox: `0 0 ${geometrySize} ${geometrySize}`
      });
      this.spacer.set({ style: spacerStyle });
      this.syncColorDefs(gradientId);
      this.syncColorContent(showSeriesColor, gradientId, null);
    }
    else {
      this.setPresent(false);
    }
  }

  syncSVG() {
    const { seriesContextConfig, seriesShowColorProperty, seriesConfig, uniqueIds, iconClassName } = this.props;
    const { showIconColors, showIconPlaceholders } = seriesContextConfig;
    const showSeriesColor = showIconColors && seriesConfig[seriesShowColorProperty];

    if (showSeriesColor || showIconPlaceholders) {
      const { seriesColorGradientUniqueIds, gradientIdMap } = uniqueIds!;
      const gradientId = seriesConfig.gradient !== NONE ? gradientIdMap[seriesConfig.gradient] : seriesColorGradientUniqueIds[seriesConfig.id];
      this.syncColorContent(showSeriesColor, gradientId, iconClassName);
    }
    else {
      this.shapeSlot.set(null);
    }
  }

  ensureDefsGradientSlot() {
    if (this.defs === null) {
      this.defs = svgEl('defs');
      this.defsGradientSlot = this.slot(this.defs);
    }
    this.defsSlot.set('defs', () => this.defs!);
    return this.defsGradientSlot;
  }

  syncColorDefs(gradientId: string): void {
    const { seriesConfig, visible = true } = this.props;

    if (!visible) {
      this.defsSlot.set(null);
      return;
    }

    const { gradient } = seriesConfig;

    const seriesGradientColors = getSeriesGradientColors(seriesConfig);
    if (gradient !== NONE) {
      const { linearGradientConfig, radialGradientConfig } = seriesConfig;
      const gradientSlot = this.ensureDefsGradientSlot();
      if (linearGradientConfig !== undefined) {
        gradientSlot.set(LinearGradient, { uniqueId: gradientId, linearGradientConfig });
      }
      else {
        gradientSlot.set(RadialGradient, { uniqueId: gradientId, radialGradientConfig });
      }
    }
    else if (seriesGradientColors) {
      this.ensureDefsGradientSlot().set(SeriesColorGradient, { uniqueId: gradientId, seriesConfig });
    }
    else {
      this.defsSlot.set(null);
    }
  }

  syncColorContent(showSeriesColor: boolean, gradientId: string, className: string | null | undefined): void {
    const {
      seriesContextConfig, seriesConfig, seriesIndex, colorPaletteConfig,
      seriesIsSuppressed, focusPercentage, visible = true
    } = this.props;

    if (!visible) {
      this.shapeSlot.set(null);
      return;
    }

    const { iconBorderSize, iconBorderColor, iconUnsuppressedColor, showIconShapes } = seriesContextConfig;
    const iconSize = getIconGeometrySize(seriesContextConfig);
    const { gradient, markerShape } = seriesConfig;

    const { opacity, focusedOpacity, defocusedOpacity } = getSeriesOpacities(seriesConfig);
    const seriesGradientColors = gradient !== NONE || getSeriesGradientColors(seriesConfig);
    const halfBorderSize = iconBorderSize / 2.0;
    const shapeSize = iconSize - iconBorderSize;
    const gradientFillColor = getGradientReference(gradientId);
    const seriesColor = getSeriesColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, iconUnsuppressedColor);

    const stroke = iconBorderColor;
    const strokeWidth = (seriesIsSuppressed ? 1.5 : 1) * iconBorderSize;
    const fill = showSeriesColor ? (seriesGradientColors ? gradientFillColor : seriesColor) : iconUnsuppressedColor;
    const fillOpacity = seriesIsSuppressed ? 0 : getFocusValue(focusPercentage, opacity, focusedOpacity, defocusedOpacity);

    const commonProps = {
      stroke,
      strokeWidth,
      fill,
      fillOpacity,
      className
    };

    if (showIconShapes && markerShape !== NONE) {
      const symbolSize = shapeSize - 3;
      const halfSize = Math.floor(iconSize / 2.0);
      const symbolGenerator = getSymbolGenerator(symbolSize, markerShape);
      const symbolTransform = translate(halfSize, halfSize);
      this.shapeSlot.set('path', () => svgEl('path'))!.set({ d: symbolGenerator(), transform: symbolTransform, ...commonProps });
    }
    else {
      this.shapeSlot.set('rect', () => svgEl('rect'))!.set({ x: halfBorderSize, y: halfBorderSize, width: shapeSize, height: shapeSize, ...commonProps });
    }
  }
}
