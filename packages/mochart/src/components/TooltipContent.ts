import { Renderer, htmlEl, textEl } from '../render';
import type { El, RendererItem, Slot, TextEl } from '../render';

import { getGroupFormat, getSeriesFormats } from '../utils/ValueFormat';
import { getSeriesText } from '../utils/TooltipFormat';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { mochartCssClasses } from '../utils/ChartDom';
import { NONE } from '../config/core/constants';

import TooltipControls from './TooltipControls';
import SeriesColorIcon from './SeriesColorIcon';
import type { ColorPaletteConfig, MochartConfig, SeriesConfig } from '../types/config';
import type { InternalFocus } from '../types/chart';
import type { FocusPercentage, FocusPercentageMap } from '../types/animation';
import type { GroupSeriesValueObject } from '../data/ChartData';

type LineStyle = Record<string, string | number>;

interface TooltipGroupLineProps {
  lineStyle: LineStyle;
  groupLabel: string;
  groupText: string | number | Date;
  onMouseEnter: (event: Event) => void;
  onMouseLeave: (event: Event) => void;
  onClick: (event: Event) => void;
}

interface TooltipSeriesLineProps {
  mochartConfig: MochartConfig;
  seriesConfig: SeriesConfig;
  seriesIndex: number;
  seriesIsFocused: boolean;
  seriesIsDefocused: boolean;
  seriesIsSuppressed: boolean;
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
  mochartConfig: MochartConfig;
  tooltipValueObject: GroupSeriesValueObject;
  groupCount: number;
  focusedGroupIndex: number;
  focusedSeriesId: string | null;
  visible: boolean;
  tooltipGroupIndex: number;
  updateTooltipGroupIndex: (groupIndex: number) => void;
  minWidth?: number | null;
  adjustForSuppression?: boolean;
  svgUniqueId: string;
  onFocus: (focus: InternalFocus) => void;
  onSeriesFilter: (seriesId: string) => void;
  onClose: () => void;
  seriesAxisFocusPercentages: FocusPercentageMap;
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

class TooltipGroupLine extends Renderer<TooltipGroupLineProps> {
  root = htmlEl('div');
  text = textEl();

  create() {
    this.root.append(this.text);
    return this.root.node;
  }

  sync() {
    const { lineStyle, groupLabel, groupText, onMouseEnter, onMouseLeave, onClick } = this.props;
    this.root.set({ className: mochartCssClasses['tooltipGroupLine'], style: lineStyle,
      onMouseEnter, onMouseLeave, onClick });
    this.text.set(groupLabel + String(groupText));
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
    const { mochartConfig, seriesConfig, seriesIndex, seriesIsFocused, seriesIsDefocused, seriesIsSuppressed, seriesFocusPercentage,
      colorPaletteConfig, svgUniqueId, visible, labelText, valueText, style, onMouseEnter, onMouseLeave, onClick } = this.props;
    const { tooltipConfig } = mochartConfig;

    this.root.set({ className: mochartCssClasses['tooltipSeriesLine'] + seriesConfig.id, style,
      onMouseEnter, onMouseLeave, onClick });

    const iconProps = {
      seriesContextConfig: tooltipConfig, seriesConfig, focused: seriesIsFocused, defocused: seriesIsDefocused,
      focusPercentage: seriesFocusPercentage, colorPaletteConfig, seriesIndex,
      svgUniqueId: svgUniqueId + '-tooltip', seriesShowColorProperty: 'showColorInTooltip' as const,
      seriesIsSuppressed, iconClassName: mochartCssClasses['tooltipLineIcon'],
      visible, renderHTML: true
    };

    if (tooltipConfig.alignValues) {
      const container = this.line.set('aligned', () => this.buildAlignedLine()) as AlignedLineEl;
      container.set({ style: alignedLineStyle });
      container.leftHandle.set({ style: { float: 'left' } });
      this.iconSlot.set(SeriesColorIcon, iconProps);
      container.labelHandle.set({ className: mochartCssClasses['tooltipLineLabel'] });
      this.labelValue!.set(labelText);
      container.spacerHandle.set({ style: { float: 'left', width: 2, height: 4 } });
      container.valueHandle.set({ className: mochartCssClasses['tooltipLineValue'], style: { float: 'right' } });
      this.valueValue!.set(valueText);
    }
    else {
      const container = this.line.set('plain', () => this.buildPlainLine()) as PlainLineEl;
      container.set({ className: mochartCssClasses['tooltipLineIcon'] });
      this.iconSlot.set(SeriesColorIcon, iconProps);
      container.textHandle.set({ className: mochartCssClasses['tooltipLineText'] });
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

  onGroupMouseEnter = (_event: Event) => {
    const { mochartConfig, tooltipGroupIndex, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltipConfig } = mochartConfig;
    const { showControls, focusOnGroupMouseOver } = tooltipConfig;
    let shouldFocus = focusOnGroupMouseOver && (showControls ? mode === MODE_FILTER : true);
    if (shouldFocus) {
      onFocus({ groupIndex: tooltipGroupIndex });
    }
  }

  onGroupMouseLeave = (_event: Event) => {
    const { mochartConfig, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltipConfig } = mochartConfig;
    const { showControls, focusOnGroupMouseOver } = tooltipConfig;
    let shouldFocus = focusOnGroupMouseOver && (showControls ? mode === MODE_FILTER : true);
    if (shouldFocus) {
      onFocus({ groupIndex: null });
    }
  }

  onGroupClick = (event: Event) => {
    const { mochartConfig, tooltipGroupIndex, focusedGroupIndex, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltipConfig } = mochartConfig;
    const { showControls, focusOnGroupClick } = tooltipConfig;
    let shouldFocus = showControls ? mode === MODE_FOCUS : focusOnGroupClick;
    if (shouldFocus) {
      event.stopPropagation();
      onFocus({ groupIndex: focusedGroupIndex === tooltipGroupIndex ? -1 : tooltipGroupIndex });
    }
  }

  onSeriesMouseEnter = (_event: Event, seriesId: string) => {
    const { mochartConfig, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltipConfig } = mochartConfig;
    const { showControls, focusOnSeriesMouseOver } = tooltipConfig;
    const shouldFocus = focusOnSeriesMouseOver && (showControls ? mode === MODE_FILTER : true);
    if (shouldFocus) {
      onFocus({ seriesId });
    }
  }

  onSeriesMouseLeave = (_event: Event) => {
    const { mochartConfig, onFocus } = this.props;
    const { mode } = this.state;
    const { tooltipConfig } = mochartConfig;
    const { showControls, focusOnSeriesMouseOver } = tooltipConfig;
    let shouldFocus = focusOnSeriesMouseOver && (showControls ? mode === MODE_FILTER : true);
    if (shouldFocus) {
      onFocus({ seriesId: null });
    }
  }

  onSeriesClick = (event: Event, seriesId: string) => {
    const { mode } = this.state;
    const { mochartConfig, focusedSeriesId, onFocus, onSeriesFilter } = this.props;
    const { tooltipConfig } = mochartConfig;
    const { showControls, focusOnSeriesClick, filterOnSeriesClick } = tooltipConfig;
    let shouldFocus = showControls ? mode === MODE_FOCUS : focusOnSeriesClick;
    let shouldFilter = showControls ? mode === MODE_FILTER : filterOnSeriesClick;
    if (shouldFocus || shouldFilter) {
      event.stopPropagation();
      if (shouldFocus) {
        if (focusedSeriesId !== undefined && focusedSeriesId !== null) {
          onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId });
        }
        else {
          onFocus({ seriesId });
        }
      }
      if (shouldFilter) {
        onSeriesFilter(seriesId);
      }
    }
  }

  onClick = (event: Event) => {
    const { mochartConfig, onClose } = this.props;
    const { tooltipConfig } = mochartConfig;
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
    const { mochartConfig, tooltipValueObject, groupCount, focusedGroupIndex, focusedSeriesId, visible, tooltipGroupIndex, updateTooltipGroupIndex,
      minWidth = null, adjustForSuppression = true, svgUniqueId, onFocus, seriesAxisFocusPercentages, seriesFocusPercentages } = this.props;
    const { mode } = this.state;

    const { tooltipConfig, groupAxisConfig, seriesAxisConfigs, seriesConfigs, seriesConfigIndicesById, colorPaletteConfig } = mochartConfig;

    const { group, series } = tooltipValueObject;
    const { raw, filteredFlags } = series;
    const { axisDomains } = raw;

    this.root.set({ className: mochartCssClasses['tooltipContent'], onClick: this.onClick });
    this.controlsContainer.set({ className: mochartCssClasses['tooltipControls'] });
    this.controls.set(TooltipControls, { mochartConfig, groupCount, updateTooltipGroupIndex,
      tooltipGroupIndex, focusedGroupIndex,
      onFocus, mode, toggleMode: this.toggleMode, minWidth });
    this.linesContainer.set({ className: mochartCssClasses['tooltipLines'], style: { clear: 'both' } });

    const lastLineStyle = minWidth !== null ? { ...baseLineStyle, minWidth } : baseLineStyle;
    const lineStyle = {
      ...lastLineStyle, paddingBottom: tooltipConfig.linePadding
    };

    const tooltipLines: RendererItem[] = [];

    // pie charts render a single group, so its value is chart-level noise in the tooltip
    if (tooltipConfig.showGroup) {
      const groupText = group.values.parsed;
      const groupFormat = getGroupFormat(groupAxisConfig);
      const groupLabel = groupAxisConfig.valueLabel !== NONE ? groupAxisConfig.valueLabel + ": " : "";
      tooltipLines.push({
        key: 'group',
        ctor: TooltipGroupLine,
        props: { lineStyle, groupLabel, groupText: groupFormat(groupText!),
          onMouseEnter: (event: Event) => this.onGroupMouseEnter(event),
          onMouseLeave: (event: Event) => this.onGroupMouseLeave(event),
          onClick: (event: Event) => this.onGroupClick(event) }
      });
    }

    const valueFormats = getSeriesFormats(seriesConfigs, seriesAxisConfigs, axisDomains);
    for (let seriesConfig of seriesConfigs) {
      if (!seriesConfig.showInTooltip) {
        continue;
      }
      const { id: seriesId } = seriesConfig;
      const seriesIndex = seriesConfigIndicesById[seriesId];
      // a follower series (followSeries) focuses and filters as its leader,
      // so a candlestick range row acts on the whole candle
      const focusSeriesId = seriesConfig.followSeries ?? seriesId;
      const seriesIsSuppressed = filteredFlags[seriesId];
      const seriesIsFocused = focusSeriesId === focusedSeriesId;
      const seriesIsDefocused = !seriesIsFocused && focusedSeriesId !== null;
      const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, seriesAxisFocusPercentages, seriesFocusPercentages);
      if (!adjustForSuppression || !(seriesIsSuppressed && tooltipConfig.hideSuppressed)) {
        let valueFormat = valueFormats[seriesId];
        let { labelText, valueText } = getSeriesText(tooltipConfig, seriesConfig, valueFormat, series, adjustForSuppression);
        if (valueText !== null) {
          tooltipLines.push({
            key: 'series-' + seriesId,
            ctor: TooltipSeriesLine,
            props: { mochartConfig, seriesConfig, seriesIndex, seriesIsFocused, seriesIsDefocused, seriesIsSuppressed, seriesFocusPercentage,
              colorPaletteConfig, svgUniqueId, visible, labelText, valueText,
              style: seriesIndex === seriesConfigs.length - 1 ? lastLineStyle : lineStyle,
              onMouseEnter: (event: Event) => this.onSeriesMouseEnter(event, focusSeriesId),
              onMouseLeave: (event: Event) => this.onSeriesMouseLeave(event),
              onClick: (event: Event) => this.onSeriesClick(event, focusSeriesId) }
          });
        }
      }
    }

    this.lines.sync(tooltipLines);
  }
}
