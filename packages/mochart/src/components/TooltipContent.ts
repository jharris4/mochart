import { Renderer, htmlEl, textEl } from '../render';
import type { El, RendererItem, Slot, TextEl } from '../render';

import { getCategoryFormat, getSeriesFormats } from '../utils/ValueFormat';
import { getSeriesText } from '../utils/TooltipFormat';
import type { PieTooltipValues } from '../utils/TooltipFormat';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { mochartCssClasses } from '../utils/ChartDom';
import { getPieSliceFractionMap } from '../data/PieData';
import { getPieTooltipPercentFormat, pieLabelTypeUsesPercent } from '../data/PieLabel';
import { NONE, CHART_TYPE_PIE } from '../config/core/constants';

import TooltipControls from './TooltipControls';
import SeriesColorIcon from './SeriesColorIcon';
import type { ColorPaletteConfig } from '../types/config';
import type { EnhancedMochartConfig, EnhancedSeriesConfig } from '../types/enhanced';
import type { InternalFocus } from '../types/chart';
import type { FocusPercentage, FocusPercentageMap } from '../types/animation';
import type { CategorySeriesValueObject } from '../data/ChartData';

type LineStyle = Record<string, string | number>;

interface TooltipCategoryLineProps {
  lineStyle: LineStyle;
  categoryLabel: string;
  categoryText: string | number | Date;
  onMouseEnter: (event: Event) => void;
  onMouseLeave: (event: Event) => void;
  onClick: (event: Event) => void;
}

interface TooltipSeriesLineProps {
  mochartConfig: EnhancedMochartConfig;
  seriesConfig: EnhancedSeriesConfig;
  seriesIndex: number;
  seriesIsFocused: boolean;
  seriesIsDefocused: boolean;
  seriesIsFiltered: boolean;
  seriesFocusPercentage: FocusPercentage;
  colorPaletteConfig: ColorPaletteConfig;
  svgUniqueId: string;
  visible: boolean;
  labelText: string;
  valueText: string;
  style: LineStyle;
  onMouseEnter: (event: Event) => void;
  onMouseLeave: (event: Event) => void;
  onClick: (event: Event) => void;
}

interface TooltipContentProps {
  mochartConfig: EnhancedMochartConfig;
  tooltipValueObject: CategorySeriesValueObject;
  categoryCount: number;
  focusedCategoryIndex: number;
  focusedSeriesId: string | null;
  visible: boolean;
  tooltipCategoryIndex: number;
  updateTooltipCategoryIndex: (categoryIndex: number) => void;
  minWidth?: number | null;
  adjustForFiltering?: boolean;
  svgUniqueId: string;
  onFocus: (focus: InternalFocus) => void;
  onSeriesFilter: (seriesId: string) => void;
  onClose: () => void;
  valueAxisFocusPercentages: FocusPercentageMap;
  seriesFocusPercentages: FocusPercentageMap;
}

interface TooltipContentState { mode: typeof MODE_FOCUS | typeof MODE_FILTER }

type AlignedLineEl = El & { leftHandle: El; labelHandle: El; spacerHandle: El; valueHandle: El };
type PlainLineEl = El & { textHandle: El };

const itemPadding = 2;

const MODE_FOCUS = 'focus';
const MODE_FILTER = 'filter';

const baseLineStyle = {
  whiteSpace: 'nowrap',
  padding: itemPadding,
  paddingTop: itemPadding,
  paddingRight: itemPadding,
  paddingLeft: itemPadding
};

const alignedLineStyle = {
  overflow: 'auto',
  whiteSpace: 'nowrap'
};

class TooltipCategoryLine extends Renderer<TooltipCategoryLineProps> {
  root = htmlEl('div');
  text = textEl();

  create() {
    this.root.append(this.text);
    return this.root.node;
  }

  sync() {
    const { lineStyle, categoryLabel, categoryText, onMouseEnter, onMouseLeave, onClick } = this.props;
    this.root.set({ className: mochartCssClasses['tooltipCategoryLine'], style: lineStyle,
      onMouseEnter, onMouseLeave, onClick });
    this.text.set(categoryLabel + String(categoryText));
  }
}

class TooltipSeriesLine extends Renderer<TooltipSeriesLineProps> {
  root = htmlEl('div');
  line = this.elSlot(this.root);
  iconSlot!: Slot;
  labelValue: TextEl | null = null;
  valueValue: TextEl | null = null;

  create() {
    return this.root.node;
  }

  buildAlignedLine(): AlignedLineEl {
    const container = htmlEl('div') as AlignedLineEl;
    const left = htmlEl('span');
    this.iconSlot = this.slot(left);
    const label = htmlEl('span');
    this.labelValue = textEl();
    label.append(this.labelValue);
    left.append(label);
    const spacer = htmlEl('span');
    const value = htmlEl('span');
    this.valueValue = textEl();
    value.append(this.valueValue);
    container.append(left, spacer, value);
    container.leftHandle = left;
    container.labelHandle = label;
    container.spacerHandle = spacer;
    container.valueHandle = value;
    return container;
  }

  buildPlainLine(): PlainLineEl {
    const container = htmlEl('span') as PlainLineEl;
    this.iconSlot = this.slot(container);
    const text = htmlEl('span');
    this.labelValue = textEl();
    text.append(this.labelValue);
    container.append(text);
    container.textHandle = text;
    return container;
  }

  sync() {
    const { mochartConfig, seriesConfig, seriesIndex, seriesIsFocused, seriesIsDefocused, seriesIsFiltered, seriesFocusPercentage,
      colorPaletteConfig, svgUniqueId, visible, labelText, valueText, style, onMouseEnter, onMouseLeave, onClick } = this.props;
    const { tooltip: tooltipConfig } = mochartConfig;

    this.root.set({ className: mochartCssClasses['tooltipSeriesLine'] + seriesConfig.id, style,
      onMouseEnter, onMouseLeave, onClick });

    // html, so this has to be a style: a top-level prop would be written as an attribute, which means nothing here
    const labelStyle = { textDecoration: tooltipConfig.showFilteringOnLabels && seriesIsFiltered ? 'line-through' : null };

    const iconProps = {
      seriesContextConfig: tooltipConfig, seriesConfig, focused: seriesIsFocused, defocused: seriesIsDefocused,
      focusPercentage: seriesFocusPercentage, colorPaletteConfig, seriesIndex,
      svgUniqueId: svgUniqueId + '-tooltip', seriesShowColorProperty: 'showColorInTooltip' as const,
      seriesIsFiltered, iconClassName: mochartCssClasses['tooltipLineIcon'],
      visible, renderHTML: true
    };

    if (tooltipConfig.rightAlignValues) {
      const container = this.line.set('aligned', () => this.buildAlignedLine()) as AlignedLineEl;
      container.set({ style: alignedLineStyle });
      container.leftHandle.set({ style: { float: 'left' } });
      this.iconSlot.set(SeriesColorIcon, iconProps);
      container.labelHandle.set({ className: mochartCssClasses['tooltipLineLabel'], style: labelStyle });
      this.labelValue!.set(labelText);
      container.spacerHandle.set({ style: { float: 'left', width: 2, height: 4 } });
      container.valueHandle.set({ className: mochartCssClasses['tooltipLineValue'], style: { float: 'right' } });
      this.valueValue!.set(valueText);
    }
    else {
      const container = this.line.set('plain', () => this.buildPlainLine()) as PlainLineEl;
      container.set({ className: mochartCssClasses['tooltipLineIcon'] });
      this.iconSlot.set(SeriesColorIcon, iconProps);
      // label and value share one text node here, so the strike-through covers both
      container.textHandle.set({ className: mochartCssClasses['tooltipLineText'], style: labelStyle });
      this.labelValue!.set(labelText + valueText);
    }
  }
}

export default class TooltipContent extends Renderer<TooltipContentProps, TooltipContentState> {
  root = htmlEl('div');
  controlsContainer = htmlEl('div');
  controls = this.slot(this.controlsContainer);
  linesContainer = htmlEl('div');
  lines = this.rendererList(this.linesContainer);

  constructor() {
    super();
    this.state = { mode: MODE_FILTER };
  }

  toggleMode = () => {
    let { mode } = this.state;
    if (mode === MODE_FILTER) {
      mode = MODE_FOCUS;
    }
    else if (mode === MODE_FOCUS) {
      mode = MODE_FILTER;
    }
    this.setState({ mode });
  }

  onCategoryMouseEnter = (_event: Event) => {
    const { mochartConfig, tooltipCategoryIndex, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltip: tooltipConfig } = mochartConfig;
    const { showControls, focusCategoryOnMouseOver } = tooltipConfig;
    const shouldFocus = focusCategoryOnMouseOver && (showControls ? mode === MODE_FILTER : true);
    if (shouldFocus) {
      onFocus({ categoryIndex: tooltipCategoryIndex });
    }
  }

  onCategoryMouseLeave = (_event: Event) => {
    const { mochartConfig, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltip: tooltipConfig } = mochartConfig;
    const { showControls, focusCategoryOnMouseOver } = tooltipConfig;
    const shouldFocus = focusCategoryOnMouseOver && (showControls ? mode === MODE_FILTER : true);
    if (shouldFocus) {
      onFocus({ categoryIndex: null });
    }
  }

  onCategoryClick = (event: Event) => {
    const { mochartConfig, tooltipCategoryIndex, focusedCategoryIndex, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltip: tooltipConfig } = mochartConfig;
    const { showControls, focusCategoryOnClick } = tooltipConfig;
    const shouldFocus = showControls ? mode === MODE_FOCUS : focusCategoryOnClick;
    if (shouldFocus) {
      event.stopPropagation();
      onFocus({ categoryIndex: focusedCategoryIndex === tooltipCategoryIndex ? -1 : tooltipCategoryIndex });
    }
  }

  onSeriesMouseEnter = (_event: Event, seriesId: string) => {
    const { mochartConfig, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltip: tooltipConfig } = mochartConfig;
    const { showControls, focusSeriesOnMouseOver } = tooltipConfig;
    const shouldFocus = focusSeriesOnMouseOver && (showControls ? mode === MODE_FILTER : true);
    if (shouldFocus) {
      onFocus({ seriesId });
    }
  }

  onSeriesMouseLeave = (_event: Event) => {
    const { mochartConfig, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltip: tooltipConfig } = mochartConfig;
    const { showControls, focusSeriesOnMouseOver } = tooltipConfig;
    const shouldFocus = focusSeriesOnMouseOver && (showControls ? mode === MODE_FILTER : true);
    if (shouldFocus) {
      onFocus({ seriesId: null });
    }
  }

  onSeriesClick = (event: Event, seriesId: string) => {
    const { mode } = this.state;
    const { mochartConfig, focusedSeriesId, onFocus, onSeriesFilter } = this.props;
    const { tooltip: tooltipConfig } = mochartConfig;
    const { showControls, focusSeriesOnClick, filterSeriesOnClick } = tooltipConfig;
    const shouldFocus = showControls ? mode === MODE_FOCUS : focusSeriesOnClick;
    const shouldFilter = showControls ? mode === MODE_FILTER : filterSeriesOnClick;
    if (shouldFocus || shouldFilter) {
      event.stopPropagation();
      // filter before focus, like the legend click: an explicit focus request
      // must land after the filter toggle's derived focus clear
      if (shouldFilter) {
        onSeriesFilter(seriesId);
      }
      if (shouldFocus) {
        if (focusedSeriesId !== undefined && focusedSeriesId !== null) {
          onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId });
        }
        else {
          onFocus({ seriesId });
        }
      }
    }
  }

  onClick = (event: Event) => {
    const { mochartConfig, onClose } = this.props;
    const { tooltip: tooltipConfig } = mochartConfig;
    if (tooltipConfig.closeOnClick) {
      event.preventDefault();
      onClose();
    }
    else {
      event.stopPropagation();
    }
  }

  create() {
    this.root.append(this.controlsContainer, this.linesContainer);
    return this.root.node;
  }

  sync() {
    const { mochartConfig, tooltipValueObject, categoryCount, focusedCategoryIndex, focusedSeriesId, visible, tooltipCategoryIndex, updateTooltipCategoryIndex,
      minWidth = null, adjustForFiltering = true, svgUniqueId, onFocus, valueAxisFocusPercentages, seriesFocusPercentages } = this.props;
    const { mode } = this.state;

    const { chart: chartConfig, pie: pieConfig, tooltip: tooltipConfig, categoryAxis: categoryAxisConfig, valueAxes: valueAxisConfigs, series: seriesConfigs, seriesIndicesById: seriesConfigIndicesById, colorPalette: colorPaletteConfig } = mochartConfig;

    const { category, series } = tooltipValueObject;
    const { raw, filtered, filteredFlags } = series;
    const { axisDomains } = raw;

    // Percent tooltip values are derived from the slice shares, normalized the
    // same way the slices and their labels are (see getPieSliceFractions), so
    // the numbers cannot drift apart. The maps are built once per tooltip, not
    // once per row. Filtering follows tooltipConfig.adjustForFiltering: on
    // (the default) the percentages renormalize against the unfiltered slices
    // like the slice labels do, off freezes them at the full-total shares.
    const pieTooltipValues = pieConfig.tooltipValues;
    let piePercentFormat: ((fraction: number) => string) | null = null;
    let rawFractions: Record<string, number> = Object.create(null);
    let adjustedFractions: Record<string, number> = Object.create(null);
    if (chartConfig.type === CHART_TYPE_PIE && pieLabelTypeUsesPercent(pieTooltipValues)) {
      piePercentFormat = getPieTooltipPercentFormat(pieConfig);
      rawFractions = getPieSliceFractionMap(seriesConfigs, seriesId => raw.values[seriesId]?.plain);
      adjustedFractions = adjustForFiltering && tooltipConfig.adjustForFiltering ?
        getPieSliceFractionMap(seriesConfigs, seriesId => filtered.values[seriesId]?.plain) : rawFractions;
    }

    this.root.set({ className: mochartCssClasses['tooltipContent'], onClick: this.onClick });
    this.controlsContainer.set({ className: mochartCssClasses['tooltipControls'] });
    this.controls.set(TooltipControls, { mochartConfig, categoryCount, updateTooltipCategoryIndex,
      tooltipCategoryIndex, focusedCategoryIndex,
      onFocus, mode, toggleMode: this.toggleMode, minWidth });
    this.linesContainer.set({ className: mochartCssClasses['tooltipLines'], style: { clear: 'both' } });

    const lastLineStyle = minWidth !== null ? { ...baseLineStyle, minWidth } : baseLineStyle;
    const lineStyle = {
      ...lastLineStyle, paddingBottom: tooltipConfig.linePadding
    };

    const tooltipLines: RendererItem[] = [];

    // pie charts render a single category, so its value is chart-level noise in the tooltip
    if (tooltipConfig.showCategory) {
      const categoryText = category.values.parsed;
      const categoryFormat = getCategoryFormat(categoryAxisConfig);
      const categoryLabel = categoryAxisConfig.valueLabel !== NONE ? categoryAxisConfig.valueLabel + ": " : "";
      tooltipLines.push({
        key: 'category',
        ctor: TooltipCategoryLine,
        props: { lineStyle, categoryLabel, categoryText: categoryFormat(categoryText!),
          onMouseEnter: (event: Event) => this.onCategoryMouseEnter(event),
          onMouseLeave: (event: Event) => this.onCategoryMouseLeave(event),
          onClick: (event: Event) => this.onCategoryClick(event) }
      });
    }

    const valueFormats = getSeriesFormats(seriesConfigs, valueAxisConfigs, axisDomains);
    let lastSeriesLineIndex = -1;
    for (const seriesConfig of seriesConfigs) {
      if (!seriesConfig.showInTooltip) {
        continue;
      }
      const { id: seriesId } = seriesConfig;
      const seriesIndex = seriesConfigIndicesById[seriesId];
      // a follower series (followSeries) focuses and filters as its leader,
      // so a candlestick range row acts on the whole candle
      const focusSeriesId = seriesConfig.followSeries ?? seriesId;
      const seriesIsFiltered = filteredFlags[seriesId];
      const seriesIsFocused = focusSeriesId === focusedSeriesId;
      const seriesIsDefocused = !seriesIsFocused && focusedSeriesId !== null;
      const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, valueAxisFocusPercentages, seriesFocusPercentages);
      if (!adjustForFiltering || !(seriesIsFiltered && tooltipConfig.hideFiltered)) {
        const valueFormat = valueFormats[seriesId];
        const pieValues: PieTooltipValues | undefined = piePercentFormat === null ? undefined : {
          tooltipValues: pieTooltipValues, percentFormat: piePercentFormat,
          fraction: adjustedFractions[seriesId] ?? 0, rawFraction: rawFractions[seriesId] ?? 0,
          filtered: seriesIsFiltered
        };
        const { labelText, valueText } = getSeriesText(tooltipConfig, seriesConfig, valueFormat, series, adjustForFiltering, pieValues);
        if (valueText !== null) {
          lastSeriesLineIndex = tooltipLines.length;
          tooltipLines.push({
            key: 'series-' + seriesId,
            ctor: TooltipSeriesLine,
            props: { mochartConfig, seriesConfig, seriesIndex, seriesIsFocused, seriesIsDefocused, seriesIsFiltered, seriesFocusPercentage,
              colorPaletteConfig, svgUniqueId, visible, labelText, valueText,
              style: lineStyle,
              onMouseEnter: (event: Event) => this.onSeriesMouseEnter(event, focusSeriesId),
              onMouseLeave: (event: Event) => this.onSeriesMouseLeave(event),
              onClick: (event: Event) => this.onSeriesClick(event, focusSeriesId) }
          });
        }
      }
    }

    // the last rendered row drops the bottom padding, not the last config
    if (lastSeriesLineIndex !== -1) {
      (tooltipLines[lastSeriesLineIndex].props as { style: unknown }).style = lastLineStyle;
    }

    this.lines.sync(tooltipLines);
  }
}
