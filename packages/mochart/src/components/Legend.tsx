// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { layoutInfoExtentChanged } from '../layout/LayoutInfo';
import { prepareTruncation, getTruncatedText, updateTruncation } from '../utils/TextTruncation';
import { translate, translateObject, centerTextY } from '../utils/utils';
import { getClipPathReference } from '../utils/svgUtils';
import { getSeriesTitle } from '../utils/SeriesTitle';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import Background from './Background';
import SeriesColorIcon from './SeriesColorIcon';

const hiddenStyle = { visibility: 'hidden' };

export default class Legend extends PureComponent {
  constructor(props) {
    super(props);
  }

  legendItemMouseEnter = (seriesId) => {
    const { mochartConfig, onFocus } = this.props;
    if (mochartConfig.legendConfig.focusOnMouseOver) {
      onFocus({ seriesId });
    }
  }

  legendItemMouseLeave = (seriesId) => {
    const { mochartConfig, onFocus } = this.props;
    if (mochartConfig.legendConfig.focusOnMouseOver) {
      onFocus({ seriesId: null });
    }
  }

  legendItemClick = (seriesId) => {
    const { mochartConfig, focusedSeriesId, onFocus, onSeriesFilter } = this.props;
    const seriesConfig = mochartConfig.seriesConfigsById[seriesId];
    const legendConfig = mochartConfig.legendConfig;
    if (legendConfig.filterOnClick && seriesConfig.suppressible) {
      onSeriesFilter(seriesId);
    }
    if (legendConfig.focusOnClick) {
      if (focusedSeriesId !== void 0 && focusedSeriesId !== null) {
        onFocus({ seriesId: null });
      }
      else {
        onFocus({ seriesId });
      }
    }
  }

  render() {
    const { mochartConfig, legendLayoutInfo, legendItemTextLayoutInfo, legendItemLayoutInfos,
      legendItemRawLayoutInfos, filteredFlags, uniqueIds, focusedSeriesId, seriesAxisFocusPercentages, seriesFocusPercentages } = this.props;
    const { legendClipPathUniqueId, seriesColorGradientUniqueIds } = uniqueIds;
    const { legendConfig, seriesConfigs } = mochartConfig;
    if (legendConfig.visible) {
      const { seriesConfigs, seriesConfigIndicesById, colorPaletteConfig } = mochartConfig;
      const { truncationEnabled } = legendConfig;
      const transform = translateObject(legendLayoutInfo);

      const clipPath = truncationEnabled ? getClipPathReference(legendClipPathUniqueId) : null;

      return (
        <g className={mochartCssClasses['legend']} transform={transform}>
          <Background config={legendConfig} classKey='legendBackground' spacingRelative={true} spacingLayoutInfo={legendLayoutInfo} />
          {seriesConfigs.map((seriesConfig, i) => {
            const { id, showInLegend } = seriesConfig;
            if (showInLegend) {
              const seriesIndex = seriesConfigIndicesById[id];
              const seriesIsSuppressed = filteredFlags[id] === true;
              const seriesIsFocused = focusedSeriesId === id;
              const seriesIsDefocused = !seriesIsFocused && focusedSeriesId !== null;
              const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, seriesAxisFocusPercentages, seriesFocusPercentages);

              return (
                <LegendItem key={id} legendConfig={legendConfig} seriesConfig={seriesConfig} legendLayoutInfo={legendLayoutInfo}
                  legendItemLayoutInfo={legendItemLayoutInfos[i]}
                  legendItemRawLayoutInfo={legendItemRawLayoutInfos[i]} legendItemTextLayoutInfo={legendItemTextLayoutInfo}
                  uniqueIds={uniqueIds} colorPaletteConfig={colorPaletteConfig} seriesIndex={seriesIndex}
                  seriesIsSuppressed={seriesIsSuppressed} seriesIsFocused={seriesIsFocused} seriesIsDefocused={seriesIsDefocused}
                  seriesFocusPercentage={seriesFocusPercentage} clipPath={clipPath} onClick={this.legendItemClick}
                  onMouseEnter={this.legendItemMouseEnter} onMouseLeave={this.legendItemMouseLeave}/>
              );
            }
            return false;
          })}
        </g>
      );
    }
    return false;
  }
}

class LegendItem extends PureComponent {
  constructor(props) {
    super(props);

    // refs created on render
    this.itemRef = null;

    this.state = { truncationData: null };
    this.truncationData = null;
    this.checkTruncation = props.legendConfig.truncationEnabled;
  }

  onClick = () => {
    const { onClick, seriesConfig } = this.props;
    onClick(seriesConfig.id);
  }

  onMouseEnter = () => {
    const { onMouseEnter, seriesConfig, seriesIsSuppressed } = this.props;
    if (!seriesIsSuppressed) {
      onMouseEnter(seriesConfig.id);
    }
  }

  onMouseLeave = () => {
    const { onMouseLeave, seriesConfig, seriesIsSuppressed } = this.props;
    if (!seriesIsSuppressed) {
      onMouseLeave(seriesConfig.id);
    }
  }

  componentWillReceiveProps(nextProps, nextState) {
    const { legendConfig, seriesConfig, legendLayoutInfo, legendItemLayoutInfo, legendItemRawLayoutInfo } = nextProps;
    const truncationEnabled = legendConfig.truncationEnabled;
    const truncationChanged = truncationEnabled &&
      (layoutInfoExtentChanged(this.props.legendItemLayoutInfo, legendItemLayoutInfo) || layoutInfoExtentChanged(this.props.legendItemRawLayoutInfo, legendItemRawLayoutInfo));
    const seriesTitleChanged = this.props.seriesConfig.title !== seriesConfig.title;
    const truncationFinished = legendItemLayoutInfo.width === legendItemRawLayoutInfo.width && legendLayoutInfo.default !== true;
    if (seriesTitleChanged || truncationFinished) {
      this.truncationData = null;
    }
    const { checkTruncation, truncationData } = prepareTruncation(truncationEnabled, truncationChanged, this.truncationData);
    this.setState({ truncationData });
    this.truncationData = truncationData;
    if (this.checkTruncation === false && checkTruncation === true) {
      this.checkTruncation = true;
    }
  }

  setItemRef = (ref) => {
    this.itemRef = ref;
  }

  render() {
    const { legendConfig, seriesConfig, legendItemLayoutInfo, uniqueIds, clipPath, colorPaletteConfig,
      seriesIndex, seriesIsSuppressed, seriesIsFocused, seriesIsDefocused, seriesFocusPercentage } = this.props;
    const { margin, padding, itemMargin, itemPadding, iconSize, iconSpacerSize, truncationEnabled, truncationValue } = legendConfig;
    const { truncationData } = this.state;
    const seriesLabel = getSeriesTitle(seriesConfig);
    const seriesLabelText = getTruncatedText(truncationEnabled, truncationValue, seriesLabel, truncationData);
    const { width, height, paddingRelativeBounds } = legendItemLayoutInfo;
    const { x, y } = paddingRelativeBounds;
    const itemInnerHeight = paddingRelativeBounds.height;
    const iconWidth = iconSize + iconSpacerSize;
    const iconHeight = iconSize;
    const halfHeight = itemInnerHeight / 2.0;
    const halfIconOffset = iconHeight < itemInnerHeight ? (itemInnerHeight - iconHeight) / 2.0 : 0;

    const transform = translateObject(legendItemLayoutInfo);
    const iconTransform = translate(x, y + halfIconOffset);

    const { dy, transform: textTransform } = centerTextY({ x: x + iconWidth, y, height: itemInnerHeight });

    return (
      <g className={mochartCssClasses['legendItem'] + seriesConfig.id} transform={transform} ref={this.setItemRef}
         onClick={this.onClick} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <Background config={legendConfig} configStyleKey={'itemBackgroundStyle'} classKey='legendItemBackground' spacingRelative={true} spacingLayoutInfo={legendItemLayoutInfo} />
        <g className={mochartCssClasses['legendItemIcon']} transform={iconTransform}>
          <SeriesColorIcon seriesContextConfig={legendConfig} seriesConfig={seriesConfig} focused={seriesIsFocused} defocused={seriesIsDefocused}
            focusPercentage={seriesFocusPercentage} colorPaletteConfig={colorPaletteConfig} seriesIndex={seriesIndex}
            seriesShowColorProperty='showColorInLegend' uniqueIds={uniqueIds}
            seriesIsSuppressed={seriesIsSuppressed} renderHTML={false}/>
        </g>
        <g className={mochartCssClasses['legendItemText']} clipPath={clipPath}>
          <text transform={textTransform} dy={dy}>{seriesLabelText}</text>
        </g>
        <g className={mochartCssClasses['legendItemTextRaw']} style={hiddenStyle}>
          <text transform={textTransform} dy={dy}>{seriesLabel}</text>
        </g>
      </g>
    );
  }

  componentDidUpdate() {
    if (this.checkTruncation && this.itemRef) {
      const domElement = this.itemRef.querySelector(getLegendItemTextCssSelector());
      const { legendConfig, seriesConfig, legendItemTextLayoutInfo } = this.props;
      const { width } = legendItemTextLayoutInfo;
      const { truncationValue } = legendConfig;
      const title = getSeriesTitle(seriesConfig);
      const maxLength = Math.max(width, 0);
      const { checkTruncation, truncationData } = updateTruncation(truncationValue, this.state.truncationData, title, maxLength, domElement);
      if (checkTruncation) {
        this.setState({ truncationData });
        this.truncationData = truncationData;
      }
      this.checkTruncation = checkTruncation;
    }
  }
}

function getLegendItemTextCssSelector() {
  return '.' + mochartCssClasses['legendItemText'] + ' text';
}
