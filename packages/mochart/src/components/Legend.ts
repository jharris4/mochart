import { Renderer, svgEl, textEl } from '../render';
import type { RendererItem } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { layoutInfoExtentChanged } from '../layout/LayoutInfo';
import { prepareTruncation, getTruncatedText, updateTruncation } from '../utils/TextTruncation';
import { translate, translateObject, centerTextY } from '../utils/utils';
import { getClipPathReference } from '../utils/svgUtils';
import { getSeriesTitle } from '../utils/SeriesTitle';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import Background from './Background';
import SeriesColorIcon from './SeriesColorIcon';
import type { ColorPaletteConfig, LegendConfig, MochartConfig, SeriesConfig } from '../types/config';
import type { SpacingLayoutInfo } from '../types/layout';
import type { TruncationDataValue } from '../utils/TextTruncation';
import type { FocusPercentageMap } from '../types/animation';

interface LegendItemUniqueIds {
  legendClipPathUniqueId: string;
  seriesColorGradientUniqueIds: Record<string, string>;
  gradientIdMap: Record<string, string>;
}

interface LegendProps {
  mochartConfig: MochartConfig;
  legendLayoutInfo: SpacingLayoutInfo;
  legendItemTextLayoutInfo: SpacingLayoutInfo;
  legendItemLayoutInfos: SpacingLayoutInfo[];
  legendItemRawLayoutInfos: SpacingLayoutInfo[];
  filteredFlags: Record<string, boolean>;
  uniqueIds: LegendItemUniqueIds;
  focusedSeriesId: string | null;
  seriesAxisFocusPercentages: FocusPercentageMap;
  seriesFocusPercentages: FocusPercentageMap;
  onFocus: (focus: { seriesId: string | null }) => void;
  onSeriesFilter: (seriesId: string) => void;
}

interface LegendItemProps {
  legendConfig: LegendConfig;
  seriesConfig: SeriesConfig;
  legendLayoutInfo: SpacingLayoutInfo;
  legendItemLayoutInfo: SpacingLayoutInfo;
  legendItemRawLayoutInfo: SpacingLayoutInfo;
  legendItemTextLayoutInfo: SpacingLayoutInfo;
  uniqueIds: LegendItemUniqueIds;
  clipPath: string | null;
  colorPaletteConfig: ColorPaletteConfig;
  seriesIndex: number;
  seriesIsSuppressed: boolean;
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
    if (mochartConfig.legendConfig.focusOnMouseOver) {
      onFocus({ seriesId });
    }
  }

  legendItemMouseLeave = (seriesId: string) => {
    const { mochartConfig, onFocus } = this.props;
    if (mochartConfig.legendConfig.focusOnMouseOver) {
      onFocus({ seriesId: null });
    }
  }

  legendItemClick = (seriesId: string) => {
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

  create() {
    return this.root.node;
  }

  sync() {
    const { mochartConfig, legendLayoutInfo, legendItemTextLayoutInfo, legendItemLayoutInfos,
      legendItemRawLayoutInfos, filteredFlags, uniqueIds, focusedSeriesId, seriesAxisFocusPercentages, seriesFocusPercentages } = this.props;
    const { legendClipPathUniqueId } = uniqueIds;
    const { legendConfig } = mochartConfig;
    if (legendConfig.visible) {
      const { seriesConfigs, seriesConfigIndicesById, colorPaletteConfig } = mochartConfig;
      const { truncationEnabled } = legendConfig;
      const transform = translateObject(legendLayoutInfo);

      const clipPath = truncationEnabled ? getClipPathReference(legendClipPathUniqueId) : null;

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['legend'], transform });
      this.background.set(Background, { config: legendConfig, classKey: 'legendBackground', spacingRelative: true, spacingLayoutInfo: legendLayoutInfo });

      const items: RendererItem<LegendItemProps>[] = [];
      seriesConfigs.forEach((seriesConfig: SeriesConfig, i: number) => {
        const { id, showInLegend } = seriesConfig;
        if (showInLegend) {
          const seriesIndex = seriesConfigIndicesById[id];
          const seriesIsSuppressed = filteredFlags[id] === true;
          const seriesIsFocused = focusedSeriesId === id;
          const seriesIsDefocused = !seriesIsFocused && focusedSeriesId !== null;
          const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, seriesAxisFocusPercentages, seriesFocusPercentages);

          items.push({
            key: id,
            ctor: LegendItem,
            props: { legendConfig, seriesConfig, legendLayoutInfo,
              legendItemLayoutInfo: legendItemLayoutInfos[i],
              legendItemRawLayoutInfo: legendItemRawLayoutInfos[i], legendItemTextLayoutInfo,
              uniqueIds, colorPaletteConfig, seriesIndex,
              seriesIsSuppressed, seriesIsFocused, seriesIsDefocused,
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

  willMount() {
    this.checkTruncation = this.props.legendConfig.truncationEnabled;
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

  willReceiveProps(nextProps: LegendItemProps): void {
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

  create() {
    this.textGroup.append(this.text);
    this.text.append(this.textValue);
    this.textRawGroup.append(this.textRaw);
    this.textRaw.append(this.textRawValue);
    this.root.append(this.iconGroup, this.textGroup, this.textRawGroup);
    return this.root.node;
  }

  sync() {
    const { legendConfig, seriesConfig, legendItemLayoutInfo, uniqueIds, clipPath, colorPaletteConfig,
      seriesIndex, seriesIsSuppressed, seriesIsFocused, seriesIsDefocused, seriesFocusPercentage } = this.props;
    const { iconSize, iconSpacerSize, truncationEnabled, truncationValue } = legendConfig;
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
      seriesIsSuppressed, renderHTML: false });
    this.textGroup.set({ className: mochartCssClasses['legendItemText'], clipPath });
    this.text.set({ transform: textTransform, dy });
    this.textValue.set(seriesLabelText);
    this.textRawGroup.set({ className: mochartCssClasses['legendItemTextRaw'], style: hiddenStyle });
    this.textRaw.set({ transform: textTransform, dy });
    this.textRawValue.set(seriesLabel);
  }

  didUpdate() {
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
