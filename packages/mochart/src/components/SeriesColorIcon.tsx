// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import LinearGradient from './LinearGradient';
import RadialGradient from './RadialGradient';
import SeriesColorGradient from './SeriesColorGradient';

import { NONE } from '../config/core/constants';
import { getSeriesColor, getSeriesOpacities, getSeriesGradientColors } from '../utils/SeriesColors';
import { getSymbolGenerator } from '../utils/shapeUtils';
import { translate } from '../utils/utils';
import { getGradientReference } from '../utils/svgUtils';
import { getFocusValue } from '../utils/FocusValue';

export default class SeriesColorIcon extends PureComponent {

  static defaultProps = {
    visible: true
  };

  constructor(props) {
    super(props);
  }

  render() {
    const { renderHTML } = this.props;
    return renderHTML ? this.renderHTML() : this.renderSVG();
  }

  renderHTML() {
    const { seriesContextConfig, seriesShowColorProperty, seriesConfig, svgUniqueId, iconClassName } = this.props;
    const { showIconColors, showIconPlaceholders } = seriesContextConfig;
    const showSeriesColor = showIconColors && seriesConfig[seriesShowColorProperty];

    if (showSeriesColor || showIconPlaceholders) {
      const { iconSize, iconSpacerSize } = seriesContextConfig;
      const colorStyle = {
        display: "inline-block",
        width: iconSize + iconSpacerSize,
        verticalAlign: 'middle'
      };
      const spacerStyle = {
        display: "inline-block",
        width: iconSpacerSize,
        height: iconSize
      };

      const gradientId = svgUniqueId + '-' + seriesConfig.id;

      return (
        <span className={iconClassName} style={colorStyle}>
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize}>
            {this.renderColorDefs()}
            {this.renderColorContent(showSeriesColor, gradientId, null)}
          </svg>
          <span style={spacerStyle}></span>
        </span>
      );
    }
    return false;
  }

  renderSVG() {
    const { seriesContextConfig, seriesShowColorProperty, seriesConfig, uniqueIds, iconClassName } = this.props;
    const { showIconColors, showIconPlaceholders } = seriesContextConfig;
    const showSeriesColor = showIconColors && seriesConfig[seriesShowColorProperty];

    if (showSeriesColor || showIconPlaceholders) {
      const { seriesColorGradientUniqueIds, gradientIdMap } = uniqueIds;
      const gradientId = seriesConfig.gradient !== NONE ? gradientIdMap[seriesConfig.gradient] : seriesColorGradientUniqueIds[seriesConfig.id];
      return this.renderColorContent(showSeriesColor, gradientId, iconClassName)
    }
    return false;
  }

  renderColorDefs() {
    const { seriesConfig, svgUniqueId, visible } = this.props;

    if (!visible) {
      return false;
    }

    const { id, gradient } = seriesConfig;
    const gradientId = svgUniqueId + '-' + id;

    const seriesGradientColors = getSeriesGradientColors(seriesConfig);
    if (gradient !== NONE) {
      const { linearGradientConfig, radialGradientConfig } = seriesConfig;
      return (
        <defs>
          {linearGradientConfig !== void 0 ?
            <LinearGradient uniqueId={gradientId} linearGradientConfig={linearGradientConfig} /> :
            <RadialGradient uniqueId={gradientId} radialGradientConfig={radialGradientConfig} />
          }
        </defs>
      );
    }
    else if (seriesGradientColors) {
      return (
        <defs>
          <SeriesColorGradient uniqueId={gradientId} seriesConfig={seriesConfig} />
        </defs>
      );
    }
    return false;
  }

  renderColorContent(showSeriesColor, gradientId, className) {
    const {
      seriesContextConfig, seriesConfig, seriesIndex, colorPaletteConfig,
      svgUniqueId, seriesIsSuppressed, focused, defocused, focusPercentage, visible
    } = this.props;

    if (!visible) {
      return false;
    }

    const { iconSize, iconSpacerSize, iconBorderSize, iconBorderColor, iconSuppressedColor, iconUnsuppressedColor, showIconShapes } = seriesContextConfig;
    const { id, gradient, markerShape } = seriesConfig;

    const { opacity, focusedOpacity, defocusedOpacity } = getSeriesOpacities(seriesConfig);
    const seriesGradientColors = gradient !== NONE || getSeriesGradientColors(seriesConfig);
    const halfBorderSize = iconBorderSize / 2.0;
    const shapeSize = iconSize - iconBorderSize;
    const gradientFillColor = getGradientReference(gradientId);
    const seriesColor = getSeriesColor(colorPaletteConfig, seriesConfig, seriesIndex, focused, iconUnsuppressedColor);

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
      let symbolGenerator = getSymbolGenerator(symbolSize, seriesConfig.markerShape);
      let symbolTransform = translate(halfSize, halfSize);
      return (
        <path d={symbolGenerator()} transform={symbolTransform} {...commonProps} />
      );
    }
    else {
      return (
        <rect x={halfBorderSize} y={halfBorderSize} width={shapeSize} height={shapeSize} {...commonProps} />
      );
    }
    return false;
  }
}
