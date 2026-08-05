import { Renderer, svgEl, textEl } from '../render';
import type { RendererItem } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { layoutInfoExtentChanged } from '../layout/LayoutInfo';
import { resolveLegendIconSize } from '../layout/LegendLayout';
import { prepareTruncation, getTruncatedText, updateTruncation } from '../utils/TextTruncation';
import { translate, translateObject, centerTextY } from '../utils/utils';
import { getClipPathReference } from '../utils/svgUtils';
import { getSeriesTitle } from '../utils/SeriesTitle';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { styleToAttributes } from '../utils/style';
import Background from './Background';
import SeriesColorIcon from './SeriesColorIcon';
import type { ColorPaletteConfig, LegendConfig } from '../types/config';
import type { EnhancedMochartConfig, EnhancedSeriesConfig } from '../types/enhanced';
import type { SpacingLayoutInfo } from '../types/layout';
import type { TruncationDataValue } from '../utils/TextTruncation';
import type { FocusPercentageMap } from '../types/animation';

interface LegendItemUniqueIds {
  legendClipPathUniqueId: string;
  seriesColorGradientUniqueIds: Record<string, string>;
  gradientIdMap: Record<string, string>;
}

interface LegendProps {
  mochartConfig: EnhancedMochartConfig;
  legendLayoutInfo: SpacingLayoutInfo;
  legendItemTextLayoutInfo: SpacingLayoutInfo;
  legendItemLayoutInfos: SpacingLayoutInfo[];
  legendItemRawLayoutInfos: SpacingLayoutInfo[];
  filteredFlags: Record<string, boolean>;
  uniqueIds: LegendItemUniqueIds;
  focusedSeriesId: string | null;
  valueAxisFocusPercentages: FocusPercentageMap;
  seriesFocusPercentages: FocusPercentageMap;
  onFocus: (focus: { seriesId: string | null }) => void;
  onSeriesFilter: (seriesId: string) => void;
}

interface LegendItemProps {
  legendConfig: LegendConfig;
  seriesConfig: EnhancedSeriesConfig;
  legendLayoutInfo: SpacingLayoutInfo;
  legendItemLayoutInfo: SpacingLayoutInfo;
  legendItemRawLayoutInfo: SpacingLayoutInfo;
  legendItemTextLayoutInfo: SpacingLayoutInfo;
  uniqueIds: LegendItemUniqueIds;
  clipPath: string | null;
  colorPaletteConfig: ColorPaletteConfig;
  seriesIndex: number;
  seriesIsFiltered: boolean;
  seriesIsFocused: boolean;
  seriesIsDefocused: boolean;
  seriesFocusPercentage: number | null;
  onClick: (seriesId: string) => void;
  onMouseEnter: (seriesId: string) => void;
  onMouseLeave: (seriesId: string) => void;
}

interface LegendItemState { truncationData: TruncationDataValue }

const hiddenStyle = { visibility: 'hidden' };

export default class Legend extends Renderer<LegendProps> {
  root = svgEl('g');
  background = this.slot(this.root);
  items = this.rendererList(this.root);

  legendItemMouseEnter = (seriesId: string) => {
    const { mochartConfig, onFocus } = this.props;
    if (mochartConfig.legend.focusOnMouseOver) {
      onFocus({ seriesId });
    }
  }

  legendItemMouseLeave = (_seriesId: string) => {
    const { mochartConfig, onFocus } = this.props;
    if (mochartConfig.legend.focusOnMouseOver) {
      onFocus({ seriesId: null });
    }
  }

  legendItemClick = (seriesId: string) => {
    const { mochartConfig, focusedSeriesId, onFocus, onSeriesFilter } = this.props;
    const seriesConfig = mochartConfig.seriesById[seriesId];
    const legendConfig = mochartConfig.legend;
    if (legendConfig.filterOnClick && seriesConfig.filterable) {
      onSeriesFilter(seriesId);
    }
    if (legendConfig.focusOnClick) {
      // toggle per series like the other click-to-focus sites: clicking the
      // focused item clears, clicking any other item moves the focus
      onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId });
    }
  }

  create() {
    return this.root.node;
  }

  sync() {
    const { mochartConfig, legendLayoutInfo, legendItemTextLayoutInfo, legendItemLayoutInfos,
      legendItemRawLayoutInfos, filteredFlags, uniqueIds, focusedSeriesId, valueAxisFocusPercentages, seriesFocusPercentages } = this.props;
    const { legendClipPathUniqueId } = uniqueIds;
    const { legend: legendConfig } = mochartConfig;
    if (legendConfig.visible) {
      const { series: seriesConfigs, seriesIndicesById: seriesConfigIndicesById, colorPalette: colorPaletteConfig } = mochartConfig;
      const { truncationEnabled } = legendConfig;
      const transform = translateObject(legendLayoutInfo);

      const clipPath = truncationEnabled ? getClipPathReference(legendClipPathUniqueId) : null;

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['legend'], transform });
      this.background.set(Background, { config: legendConfig, classKey: 'legendBackground', spacingRelative: true, spacingLayoutInfo: legendLayoutInfo });

      const items: RendererItem<LegendItemProps>[] = [];
      // The measured bounds and layout infos only cover showInLegend series,
      // so items index into them by legend position, not raw series index.
      let itemIndex = 0;
      seriesConfigs.forEach((seriesConfig: EnhancedSeriesConfig) => {
        const { id, showInLegend } = seriesConfig;
        if (showInLegend) {
          const i = itemIndex++;
          const seriesIndex = seriesConfigIndicesById[id];
          const seriesIsFiltered = filteredFlags[id] === true;
          const seriesIsFocused = focusedSeriesId === id;
          const seriesIsDefocused = !seriesIsFocused && focusedSeriesId !== null;
          const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, valueAxisFocusPercentages, seriesFocusPercentages);

          items.push({
            key: id,
            ctor: LegendItem,
            props: { legendConfig, seriesConfig, legendLayoutInfo,
              legendItemLayoutInfo: legendItemLayoutInfos[i],
              legendItemRawLayoutInfo: legendItemRawLayoutInfos[i], legendItemTextLayoutInfo,
              uniqueIds, colorPaletteConfig, seriesIndex,
              seriesIsFiltered, seriesIsFocused, seriesIsDefocused,
              seriesFocusPercentage, clipPath, onClick: this.legendItemClick,
              onMouseEnter: this.legendItemMouseEnter, onMouseLeave: this.legendItemMouseLeave }
          });
        }
      });
      this.items.sync(items);
    }
    else {
      this.setPresent(false);
    }
  }
}

class LegendItem extends Renderer<LegendItemProps, LegendItemState> {
  root = svgEl('g');
  background = this.slot(this.root);
  iconGroup = svgEl('g');
  icon = this.slot(this.iconGroup);
  textGroup = svgEl('g');
  text = svgEl('text');
  textValue = textEl();
  textRawGroup = svgEl('g');
  textRaw = svgEl('text');
  textRawValue = textEl();
  truncationData: TruncationDataValue = null;
  checkTruncation = false;

  constructor() {
    super();
    this.state = { truncationData: null };
    this.truncationData = null;
    this.checkTruncation = false;
  }

  onClick = () => {
    const { onClick, seriesConfig } = this.props;
    onClick(seriesConfig.id);
  }

  // leave mirrors the enter that actually fired: the filtered flag can flip
  // mid-hover (legend click, controlled filter), so it can't gate the leave
  hoverActive = false;

  onMouseEnter = () => {
    const { onMouseEnter, seriesConfig, seriesIsFiltered } = this.props;
    if (!seriesIsFiltered) {
      this.hoverActive = true;
      onMouseEnter(seriesConfig.id);
    }
  }

  onMouseLeave = () => {
    const { onMouseLeave, seriesConfig } = this.props;
    if (this.hoverActive) {
      this.hoverActive = false;
      onMouseLeave(seriesConfig.id);
    }
  }

  derive(props: LegendItemProps, _state: LegendItemState, prevProps: LegendItemProps | null): Partial<LegendItemState> | null {
    if (prevProps === null) {
      this.checkTruncation = props.legendConfig.truncationEnabled;
      return null;
    }
    const { legendConfig, seriesConfig, legendLayoutInfo, legendItemLayoutInfo, legendItemRawLayoutInfo } = props;
    const truncationEnabled = legendConfig.truncationEnabled;
    const truncationChanged = truncationEnabled &&
      (layoutInfoExtentChanged(prevProps.legendItemLayoutInfo, legendItemLayoutInfo) || layoutInfoExtentChanged(prevProps.legendItemRawLayoutInfo, legendItemRawLayoutInfo));
    const seriesTitleChanged = prevProps.seriesConfig.title !== seriesConfig.title;
    const truncationFinished = legendItemLayoutInfo.width === legendItemRawLayoutInfo.width && legendLayoutInfo.default !== true;
    if (seriesTitleChanged || truncationFinished) {
      this.truncationData = null;
    }
    const { checkTruncation, truncationData } = prepareTruncation(truncationEnabled, truncationChanged, this.truncationData);
    this.truncationData = truncationData;
    if (this.checkTruncation === false && checkTruncation === true) {
      this.checkTruncation = true;
    }
    return { truncationData };
  }

  create() {
    this.textGroup.append(this.text);
    this.text.append(this.textValue);
    this.textRawGroup.append(this.textRaw);
    this.textRaw.append(this.textRawValue);
    this.root.append(this.iconGroup, this.textGroup, this.textRawGroup);
    return this.root.node;
  }

  sync() {
    const { legendConfig, seriesConfig, legendItemLayoutInfo, legendItemTextLayoutInfo, uniqueIds, clipPath, colorPaletteConfig,
      seriesIndex, seriesIsFiltered, seriesIsFocused, seriesIsDefocused, seriesFocusPercentage } = this.props;
    const { iconSpacerSize, truncationEnabled, truncationValue, itemTextStyle, showFilteringOnLabels } = legendConfig;
    const itemTextAttributes = styleToAttributes(itemTextStyle);
    // a camelCase prop, not a style: the dom layer kebab-cases it into the svg attribute, and null leaves it off
    const textDecoration = showFilteringOnLabels && seriesIsFiltered ? 'line-through' : null;
    const iconSize = resolveLegendIconSize(legendConfig, legendItemTextLayoutInfo);
    const { truncationData } = this.state;
    const seriesLabel = getSeriesTitle(seriesConfig);
    const seriesLabelText = getTruncatedText(truncationEnabled, truncationValue, seriesLabel, truncationData);
    const { paddingRelativeBounds } = legendItemLayoutInfo;
    const { x, y } = paddingRelativeBounds;
    const itemInnerHeight = paddingRelativeBounds.height;
    const iconWidth = iconSize + iconSpacerSize;
    const iconHeight = iconSize;
    const halfIconOffset = iconHeight < itemInnerHeight ? (itemInnerHeight - iconHeight) / 2.0 : 0;

    const transform = translateObject(legendItemLayoutInfo);
    const iconTransform = translate(x, y + halfIconOffset);

    const { dy, transform: textTransform } = centerTextY({ x: x + iconWidth, y, height: itemInnerHeight });

    this.root.set({ className: mochartCssClasses['legendItem'] + seriesConfig.id, transform,
      onClick: this.onClick, onMouseEnter: this.onMouseEnter, onMouseLeave: this.onMouseLeave });
    this.background.set(Background, { config: legendConfig, configStyleKey: 'itemBackgroundStyle', classKey: 'legendItemBackground', spacingRelative: true, spacingLayoutInfo: legendItemLayoutInfo });
    this.iconGroup.set({ className: mochartCssClasses['legendItemIcon'], transform: iconTransform });
    this.icon.set(SeriesColorIcon, { seriesContextConfig: legendConfig, seriesConfig, focused: seriesIsFocused, defocused: seriesIsDefocused,
      focusPercentage: seriesFocusPercentage, colorPaletteConfig, seriesIndex,
      seriesShowColorProperty: 'showColorInLegend', uniqueIds,
      seriesIsFiltered, renderHTML: false, resolvedIconSize: iconSize });
    this.textGroup.set({ className: mochartCssClasses['legendItemText'], clipPath });
    this.text.set({ ...itemTextAttributes, textDecoration, transform: textTransform, dy });
    this.textValue.set(seriesLabelText);
    this.textRawGroup.set({ className: mochartCssClasses['legendItemTextRaw'], style: hiddenStyle });
    // the hidden measurement text carries the same style so its metrics match the visible text
    this.textRaw.set({ ...itemTextAttributes, textDecoration, transform: textTransform, dy });
    this.textRawValue.set(seriesLabel);
  }

  measure(prevProps: LegendItemProps | null) {
    if (prevProps === null) {
      // truncation is only rechecked after updates; the initial sync renders untruncated
      return;
    }
    if (this.checkTruncation) {
      const domElement = this.root.node.querySelector<SVGTextContentElement>(getLegendItemTextCssSelector());
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
