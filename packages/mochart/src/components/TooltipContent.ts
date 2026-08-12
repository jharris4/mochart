import { Renderer, htmlEl, textEl } from '../render';
import type { El, RendererItem, Slot, TextEl } from '../render';

import { getCategoryFormat, getSeriesFormats } from '../utils/ValueFormat';
import { getSeriesText } from '../utils/TooltipFormat';
import type { PieTooltipValues } from '../utils/TooltipFormat';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { mochartCssClasses } from '../utils/ChartDom';
import { accessibilityActive, focusRestored } from '../utils/utils';
import { getPieSliceFractionMap } from '../data/PieData';
import { getPieTooltipPercentFormat, pieLabelTypeUsesPercent } from '../data/PieLabel';
import { NONE, CHART_TYPE_PIE } from '../config/core/constants';

import TooltipControls, { MODE_FOCUS, MODE_FILTER } from './TooltipControls';
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
  rowKey: string;
  interactive: boolean;
  tabStop: boolean;
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
  rowKey: string;
  interactive: boolean;
  tabStop: boolean;
  /** filtering applies, so the row exposes aria-pressed (pressed = series shown) */
  showsFilterState: boolean;
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
  onEscape?: () => void;
  valueAxisFocusPercentages: FocusPercentageMap;
  seriesFocusPercentages: FocusPercentageMap;
}

interface TooltipContentState { mode: typeof MODE_FOCUS | typeof MODE_FILTER; rovingRowKey: string | null }

type AlignedLineEl = El & { leftHandle: El; labelHandle: El; spacerHandle: El; valueHandle: El };
type PlainLineEl = El & { textHandle: El };

const itemPadding = 2;

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

  onKeyDown = (event: Event) => {
    const { key } = event as KeyboardEvent;
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      this.props.onClick(event);
    }
  }

  // keyboard focus mirrors hover, so the focused row highlights the same way
  onFocusIn = (event: Event) => {
    this.props.onMouseEnter(event);
  }

  onFocusOut = (event: Event) => {
    this.props.onMouseLeave(event);
  }

  create() {
    this.root.append(this.text);
    return this.root.node;
  }

  sync() {
    const { lineStyle, categoryLabel, categoryText, rowKey, interactive, tabStop, onMouseEnter, onMouseLeave, onClick } = this.props;
    this.root.set({ className: mochartCssClasses['tooltipCategoryLine'], style: lineStyle,
      'data-row-key': interactive ? rowKey : null,
      tabindex: interactive ? (tabStop ? '0' : '-1') : null,
      role: interactive ? 'button' : null,
      onMouseEnter, onMouseLeave, onClick,
      onKeyDown: interactive ? this.onKeyDown : null,
      onFocusIn: interactive ? this.onFocusIn : null,
      onFocusOut: interactive ? this.onFocusOut : null });
    this.text.set(categoryLabel + String(categoryText));
  }
}

class TooltipSeriesLine extends Renderer<TooltipSeriesLineProps> {
  root = htmlEl('div');
  line = this.elSlot(this.root);
  iconSlot: Slot | null = null;
  labelValue: TextEl | null = null;
  valueValue: TextEl | null = null;

  // the icon sits in a different host per layout, so the slot is rebuilt when rightAlignValues
  // flips; the outgoing one still holds a mounted SeriesColorIcon and has to be destroyed
  private replaceIconSlot(host: El): void {
    if (this.iconSlot !== null) {
      this.releaseRegion(this.iconSlot);
    }
    this.iconSlot = this.slot(host);
  }

  onKeyDown = (event: Event) => {
    const { key } = event as KeyboardEvent;
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      this.props.onClick(event);
    }
  }

  // keyboard focus mirrors hover, so the focused row highlights its series
  onFocusIn = (event: Event) => {
    this.props.onMouseEnter(event);
  }

  onFocusOut = (event: Event) => {
    this.props.onMouseLeave(event);
  }

  create() {
    return this.root.node;
  }

  buildAlignedLine(): AlignedLineEl {
    const container = htmlEl('div') as AlignedLineEl;
    const left = htmlEl('span');
    this.replaceIconSlot(left);
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
    this.replaceIconSlot(container);
    const text = htmlEl('span');
    this.labelValue = textEl();
    text.append(this.labelValue);
    container.append(text);
    container.textHandle = text;
    return container;
  }

  sync() {
    const { mochartConfig, seriesConfig, seriesIndex, seriesIsFocused, seriesIsDefocused, seriesIsFiltered, seriesFocusPercentage,
      colorPaletteConfig, svgUniqueId, visible, labelText, valueText, style, rowKey, interactive, tabStop, showsFilterState,
      onMouseEnter, onMouseLeave, onClick } = this.props;
    const { tooltip: tooltipConfig } = mochartConfig;

    this.root.set({ className: mochartCssClasses['tooltipSeriesLine'] + seriesConfig.id, style,
      'data-row-key': interactive ? rowKey : null,
      tabindex: interactive ? (tabStop ? '0' : '-1') : null,
      role: interactive ? 'button' : null,
      // pressed = series shown; toggling filters it out
      'aria-pressed': showsFilterState ? String(!seriesIsFiltered) : null,
      onMouseEnter, onMouseLeave, onClick,
      onKeyDown: interactive ? this.onKeyDown : null,
      onFocusIn: interactive ? this.onFocusIn : null,
      onFocusOut: interactive ? this.onFocusOut : null });

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
      this.iconSlot!.set(SeriesColorIcon, iconProps);
      container.labelHandle.set({ className: mochartCssClasses['tooltipLineLabel'], style: labelStyle });
      this.labelValue!.set(labelText);
      container.spacerHandle.set({ style: { float: 'left', width: 2, height: 4 } });
      container.valueHandle.set({ className: mochartCssClasses['tooltipLineValue'], style: { float: 'right' } });
      this.valueValue!.set(valueText);
    }
    else {
      const container = this.line.set('plain', () => this.buildPlainLine()) as PlainLineEl;
      container.set({ className: mochartCssClasses['tooltipLineIcon'] });
      this.iconSlot!.set(SeriesColorIcon, iconProps);
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
    this.state = { mode: MODE_FILTER, rovingRowKey: null };
  }

  private interactiveRowNodes(): HTMLElement[] {
    return Array.from(this.linesContainer.node.querySelectorAll<HTMLElement>('[data-row-key]'));
  }

  /** any focus landing on a row (Tab, arrows, mouse) makes it the roving tab stop */
  linesFocusIn = (event: Event) => {
    const rowKey = (event.target as Element).getAttribute('data-row-key');
    if (rowKey !== null && rowKey !== this.state.rovingRowKey) {
      this.setState({ rovingRowKey: rowKey });
    }
  }

  linesKeyDown = (event: Event) => {
    const { key } = event as KeyboardEvent;
    const rowNodes = this.interactiveRowNodes();
    const index = rowNodes.indexOf(event.target as HTMLElement);
    if (index === -1) {
      return;
    }
    let nextIndex: number;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      nextIndex = Math.min(index + 1, rowNodes.length - 1);
    }
    else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      nextIndex = Math.max(index - 1, 0);
    }
    else if (key === 'Home') {
      nextIndex = 0;
    }
    else if (key === 'End') {
      nextIndex = rowNodes.length - 1;
    }
    else {
      return;
    }
    event.preventDefault();
    if (nextIndex !== index) {
      rowNodes[nextIndex].focus();
    }
  }

  onRootKeyDown = (event: Event) => {
    if ((event as KeyboardEvent).key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.props.onEscape?.();
    }
  }

  /** filtering with hideFiltered unmounts the acted-on row synchronously; keep focus inside the tooltip */
  private restoreRowFocus(activeElement: Element | null): void {
    if (activeElement !== null && activeElement !== document.body && !activeElement.isConnected) {
      const fallback = this.interactiveRowNodes()[0] ?? this.controlsContainer.node.querySelector('button');
      focusRestored(fallback);
    }
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

  // the category row's hover-focus stays opt-in (focusCategoryOnMouseOver):
  // its mouseleave clears the category focus, which would silently break the
  // applyFocus pin whenever the pointer crosses the open tooltip
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
    const { mochartConfig, tooltipValueObject, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltip: tooltipConfig } = mochartConfig;
    const { showControls, focusSeriesOnMouseOver } = tooltipConfig;
    const shouldFocus = showControls ? mode === MODE_FILTER : focusSeriesOnMouseOver;
    // a filtered series has nothing visible to highlight, like the legend
    if (shouldFocus && tooltipValueObject.series.filteredFlags[seriesId] !== true) {
      this.hoverActive = true;
      onFocus({ seriesId });
    }
  }

  // leave mirrors the enter that actually fired: the filtered flag can flip mid-hover, so it
  // cannot gate the leave, and clearing unconditionally wipes focus set elsewhere
  hoverActive = false;

  onSeriesMouseLeave = (_event: Event) => {
    const { onFocus } = this.props;
    if (this.hoverActive) {
      this.hoverActive = false;
      onFocus({ seriesId: null });
    }
  }

  onSeriesClick = (event: Event, seriesId: string) => {
    const { mode } = this.state;
    const { mochartConfig, focusedSeriesId, onFocus, onSeriesFilter } = this.props;
    const { tooltip: tooltipConfig } = mochartConfig;
    const { showControls, focusSeriesOnClick, filterSeriesOnClick } = tooltipConfig;
    const shouldFocus = showControls ? mode === MODE_FOCUS : focusSeriesOnClick;
    // filterable gates filtering like the legend; the row acts on its leader
    // (followSeries), so the leader's filterable decides
    const shouldFilter = (showControls ? mode === MODE_FILTER : filterSeriesOnClick) &&
      mochartConfig.seriesById[seriesId].filterable;
    if (shouldFocus || shouldFilter) {
      event.stopPropagation();
      const activeElement = document.activeElement;
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
      this.restoreRowFocus(activeElement);
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
    // render domains: tickFormat precision needs a real extent, which a collapsed domain lacks
    const { renderAxisDomains } = raw;

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

    const accessibility = accessibilityActive(mochartConfig.accessibility);
    // a row is a tab stop only when clicking it would do something (the same
    // conditions the click handlers apply), and only on the shown copy — the
    // hidden sizer copy must not carry tab stops
    const a11yRows = accessibility && visible;
    const categoryRowInteractive = a11yRows && (tooltipConfig.showControls ? mode === MODE_FOCUS : tooltipConfig.focusCategoryOnClick);
    const seriesRowFocuses = tooltipConfig.showControls ? mode === MODE_FOCUS : tooltipConfig.focusSeriesOnClick;
    const seriesRowFilters = tooltipConfig.showControls ? mode === MODE_FILTER : tooltipConfig.filterSeriesOnClick;
    const interactiveRowKeys: string[] = [];

    this.root.set({ className: mochartCssClasses['tooltipContent'], onClick: this.onClick,
      onKeyDown: accessibility && visible ? this.onRootKeyDown : null });
    this.controlsContainer.set({ className: mochartCssClasses['tooltipControls'] });
    this.controls.set(TooltipControls, { mochartConfig, categoryCount, updateTooltipCategoryIndex,
      tooltipCategoryIndex, focusedCategoryIndex,
      onFocus, mode, toggleMode: this.toggleMode, minWidth });

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
      if (categoryRowInteractive) {
        interactiveRowKeys.push('category');
      }
      tooltipLines.push({
        key: 'category',
        ctor: TooltipCategoryLine,
        props: { lineStyle, categoryLabel, categoryText: categoryFormat(categoryText!),
          rowKey: 'category', interactive: categoryRowInteractive, tabStop: false,
          onMouseEnter: (event: Event) => this.onCategoryMouseEnter(event),
          onMouseLeave: (event: Event) => this.onCategoryMouseLeave(event),
          onClick: (event: Event) => this.onCategoryClick(event) }
      });
    }

    const valueFormats = getSeriesFormats(seriesConfigs, valueAxisConfigs, renderAxisDomains);
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
          const rowKey = 'series-' + seriesId;
          // filtering acts on the leader (followSeries), so its filterable decides
          const rowFilters = seriesRowFilters && mochartConfig.seriesById[focusSeriesId].filterable;
          const rowInteractive = a11yRows && (seriesRowFocuses || rowFilters);
          if (rowInteractive) {
            interactiveRowKeys.push(rowKey);
          }
          tooltipLines.push({
            key: rowKey,
            ctor: TooltipSeriesLine,
            props: { mochartConfig, seriesConfig, seriesIndex, seriesIsFocused, seriesIsDefocused, seriesIsFiltered, seriesFocusPercentage,
              colorPaletteConfig, svgUniqueId, visible, labelText, valueText,
              style: lineStyle,
              rowKey, interactive: rowInteractive, tabStop: false,
              showsFilterState: a11yRows && rowFilters,
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

    // the remembered roving row keeps the tab stop while it exists; otherwise the first takes it
    const { rovingRowKey } = this.state;
    const effectiveRovingKey = rovingRowKey !== null && interactiveRowKeys.indexOf(rovingRowKey) !== -1
      ? rovingRowKey : interactiveRowKeys[0] ?? null;
    if (effectiveRovingKey !== null) {
      const rovingLine = tooltipLines.find(line => line.key === effectiveRovingKey);
      (rovingLine!.props as { tabStop: boolean }).tabStop = true;
    }

    const anyInteractiveRows = interactiveRowKeys.length > 0;
    this.linesContainer.set({ className: mochartCssClasses['tooltipLines'], style: { clear: 'both' },
      onKeyDown: anyInteractiveRows ? this.linesKeyDown : null,
      onFocusIn: anyInteractiveRows ? this.linesFocusIn : null });

    this.lines.sync(tooltipLines);
  }
}
