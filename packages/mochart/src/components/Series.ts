import { Renderer, svgEl, ElList } from '../render';

import { getSeriesPositionData } from '../utils/SeriesPositions';
import { getLineGenerator, getAreaGenerator, getColumnGenerator } from '../utils/SeriesShapes';
import { getSeriesColorGenerator } from '../utils/SeriesColors';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { mochartCssClasses } from '../utils/ChartDom';
import { areArraysAndEqual, translateObject } from '../utils/utils';
import { NONE, RENDERER_AREA, RENDERER_LINE, RENDERER_BAR } from '../config/core/constants';
import { COLOR_GROUP_INDEX } from '../config/core/constants';
import { getSeriesFillColor, getSeriesStrokeColor } from '../utils/SeriesColors';
import { getGradientReference } from '../utils/svgUtils';
import { getFocusValue, getGroupFocusPercentage } from '../utils/FocusValue';

import SeriesErrorBars from './SeriesErrorBars';
import SeriesMarkers from './SeriesMarkers';
import SeriesLabels from './SeriesLabels';
import type { El, ElListAdapter } from '../render';
import type { ColorPaletteConfig, GroupAxisConfig, SeriesConfig } from '../types/config';
import type { FocusData } from '../types/animation';
import type { AxisScale, GroupAxisData, NullableDomain, SeriesDomainObject, SeriesPositionData, SeriesValueObject, StackData } from '../types/data';
import type { LayoutInfo } from '../types/layout';

const noOp = () => {};
const noOpGroup = (_groupIndex: number) => {};

interface SeriesFocusUpdate {
  seriesId?: string | null;
  groupIndex?: number | null;
}

interface SeriesProps {
  groupAxisConfig: GroupAxisConfig;
  colorPaletteConfig: ColorPaletteConfig;
  seriesConfig: SeriesConfig;
  seriesIndex: number;
  stackData: StackData;
  seriesLayoutInfo: LayoutInfo;
  focusData: FocusData | null;
  groupValueData: GroupAxisData['valueData'];
  seriesAxisScale: AxisScale;
  rawSeriesAxisDomain: NullableDomain;
  rawDomains: SeriesDomainObject;
  filteredValues: SeriesValueObject;
  gradientIdMap: Record<string, string>;
  onFocus: (focus: SeriesFocusUpdate) => void;
}

interface SeriesState {
  seriesPositionData: SeriesPositionData | null;
  onSeriesEnter: () => void;
  onSeriesLeave: () => void;
  onSeriesClick: () => void;
  onGroupEnter: (groupIndex: number) => void;
  onGroupLeave: (groupIndex: number) => void;
  onGroupClick: (groupIndex: number) => void;
}

interface BarData { key: string; attrs: Record<string, unknown> }
interface BarHandle { root: El }

const barAdapter: ElListAdapter<BarData, BarHandle> = {
  key: (bar: BarData) => bar.key,
  create: () => ({ root: svgEl('path') }),
  update: (handle: BarHandle, bar: BarData) => {
    handle.root.set(bar.attrs);
  }
};

export default class Series extends Renderer<SeriesProps, SeriesState> {
  root = svgEl('g');
  shape = this.elSlot(this.root);
  errorBars = this.slot(this.root); // declaration order fixes DOM order: shape, then error bars, then markers/labels above them
  markers = this.slot(this.root);
  labels = this.slot(this.root);
  barsGroup = svgEl('g');
  bars = new ElList<BarData, BarHandle>(this.barsGroup.node, null);

  constructor() {
    super();
    this.state = { seriesPositionData: null, onSeriesEnter: noOp, onSeriesLeave: noOp, onSeriesClick: noOp,
      onGroupEnter: noOpGroup, onGroupLeave: noOpGroup, onGroupClick: noOpGroup };
  }

  derive(props: SeriesProps, state: SeriesState, prevProps: SeriesProps | null): Partial<SeriesState> | null {
    if (prevProps === null) {
      const initial = this.computeSeriesPositionData(props);
      const { seriesPositionData } = initial;
      return { ...initial, ...this.buildEventListeners(props, seriesPositionData) };
    }
    const { groupAxisConfig, seriesConfig, focusData, onFocus, groupValueData, seriesAxisScale, filteredValues } = props;
    let groupFocusChanged = false;
    let seriesFocusChanged = false;
    let { seriesPositionData } = state;
    if (focusData !== prevProps.focusData) {
      if (focusData === null || prevProps.focusData === null) {
        groupFocusChanged = true;
        seriesFocusChanged = true;
      }
      else {
        groupFocusChanged = focusData.focusedGroupIndex !== prevProps.focusData.focusedGroupIndex;
        seriesFocusChanged = focusData.focusedSeriesId !== prevProps.focusData.focusedSeriesId;
      }
    }
    const oldSeriesAxisScale = prevProps.seriesAxisScale;
    let seriesAxisScaleChanged = false;
    if (seriesAxisScale !== oldSeriesAxisScale) {
      if (seriesAxisScale === null || oldSeriesAxisScale === null) {
        seriesAxisScaleChanged = true;
      }
      else {
        seriesAxisScaleChanged = !areArraysAndEqual(seriesAxisScale.domain(), oldSeriesAxisScale.domain()) ||
                                 !areArraysAndEqual(seriesAxisScale.range(), oldSeriesAxisScale.range());
      }
    }

    let delta: Partial<SeriesState> = {};
    let updateState = false;
    let positionsChanged = false;
    if (groupAxisConfig !== prevProps.groupAxisConfig || seriesConfig !== prevProps.seriesConfig ||
      groupValueData !== prevProps.groupValueData || seriesAxisScaleChanged || filteredValues !== prevProps.filteredValues) {
      delta = this.computeSeriesPositionData(props);
      seriesPositionData = delta.seriesPositionData ?? null;
      positionsChanged = true;
      updateState = true;
    }
    // positionsChanged: the group-index listeners close over skipGroupIndexMap
    if (positionsChanged || groupFocusChanged || seriesFocusChanged || onFocus !== prevProps.onFocus) {
      delta = { ...delta, ...this.buildEventListeners(props, seriesPositionData) };
      updateState = true;
    }
    return updateState ? delta : null;
  }

  buildEventListeners(props: SeriesProps, seriesPositionData: SeriesPositionData | null): Pick<SeriesState, 'onSeriesEnter' | 'onSeriesLeave' | 'onSeriesClick' | 'onGroupEnter' | 'onGroupLeave' | 'onGroupClick'> {
    const { seriesConfig, focusData, onFocus } = props;
    // a follower series (followSeries) focuses as its leader, so clicking a
    // candlestick wick focuses (and toggles) the whole candle
    const seriesId = seriesConfig.followSeries ?? seriesConfig.id;
    const focusedGroupIndex = focusData ? focusData.focusedGroupIndex : -1;
    const focusedSeriesId = focusData ? focusData.focusedSeriesId : null;
    const skipGroupIndexMap = seriesPositionData ? seriesPositionData.skipGroupIndexMap : {};
    const getGroupIndex = seriesPositionData?.skipped ? (groupIndex: number) => skipGroupIndexMap[groupIndex] : (groupIndex: number) => groupIndex;

    let onSeriesEnter = noOp;
    let onSeriesLeave = noOp;
    let onSeriesClick = noOp;
    let onGroupEnter = noOpGroup;
    let onGroupLeave = noOpGroup;
    let onGroupClick = noOpGroup;

    if (seriesConfig.focusOnMouseOver) {
      onSeriesEnter = () => { onFocus({ seriesId }); };
      onSeriesLeave = () => { onFocus({ seriesId: null }); };
      if (seriesConfig.focusGroupOnMouseOver) {
        onGroupEnter = (groupIndex: number) => { onFocus({ seriesId, groupIndex: getGroupIndex(groupIndex) }); };
        onGroupLeave = (_groupIndex: number) => { onFocus({ seriesId: null, groupIndex: null }); };
      }
      else {
        onGroupEnter = (_groupIndex: number) => { onFocus({ seriesId }); };
        onGroupLeave = (_groupIndex: number) => { onFocus({ seriesId: null }); };
      }
    }
    else if (seriesConfig.focusGroupOnMouseOver) {
      onGroupEnter = (groupIndex: number) => { onFocus({ groupIndex: getGroupIndex(groupIndex) }); };
      onGroupLeave = (_groupIndex: number) => { onFocus({ groupIndex: null }); };
    }
    if (seriesConfig.focusOnClick) {
      onSeriesClick = () => { onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId }); };
      if (seriesConfig.focusGroupOnClick) {
        onGroupClick = (groupIndex: number) => { onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId, groupIndex: getGroupIndex(groupIndex) === focusedGroupIndex ? -1 : getGroupIndex(groupIndex) }); };
      }
      else {
        onGroupClick = (_groupIndex: number) => { onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId }); };
      }
    }
    else if (seriesConfig.focusGroupOnClick) {
      onGroupClick = (groupIndex: number) => { onFocus({ groupIndex: getGroupIndex(groupIndex) === focusedGroupIndex ? -1 : getGroupIndex(groupIndex) }); };
    }

    return { onSeriesEnter, onSeriesLeave, onSeriesClick, onGroupEnter, onGroupLeave, onGroupClick };
  }

  computeSeriesPositionData(props: SeriesProps): Pick<SeriesState, 'seriesPositionData'> {
    const { groupAxisConfig, seriesConfig, groupValueData, seriesAxisScale, filteredValues, seriesLayoutInfo } = props;
    const seriesPositionData = filteredValues.plain !== null ? getSeriesPositionData(groupAxisConfig, seriesConfig, groupValueData, seriesAxisScale, filteredValues, seriesLayoutInfo) : null;
    return {
      seriesPositionData
    };
  }

  create() {
    return this.root.node;
  }

  sync() {
    const { colorPaletteConfig, seriesConfig, seriesIndex, stackData, seriesLayoutInfo, focusData, seriesAxisScale, rawSeriesAxisDomain, filteredValues, rawDomains, gradientIdMap } = this.props;
    const { seriesPositionData, onSeriesEnter, onSeriesLeave, onSeriesClick, onGroupEnter, onGroupLeave, onGroupClick } = this.state;

    const seriesId = seriesConfig.id;

    if (filteredValues.plain !== null && seriesPositionData !== null && focusData !== null) {
      const { inverted } = seriesLayoutInfo;
      const { groupFocusPercentages, seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
      const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, seriesAxisFocusPercentages, seriesFocusPercentages);

      const { normal: shapeNormal, focused: shapeFocused, defocused: shapeDefocused } = seriesConfig.shapeStyle;
      const seriesStrokeColor = getSeriesStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, seriesFocusPercentage);
      let seriesFillColor = seriesConfig.renderer === RENDERER_LINE ? 'none' : getSeriesFillColor(colorPaletteConfig, seriesConfig, seriesIndex, seriesFocusPercentage);
      let seriesColorGenerator = null;
      if (seriesConfig.colorProperty !== NONE) {
        seriesColorGenerator = getSeriesColorGenerator(seriesConfig, seriesFocusPercentage, rawDomains, filteredValues);
      }
      const seriesStrokeWidth = getFocusValue(seriesFocusPercentage, shapeNormal.strokeWidth!, shapeFocused.strokeWidth!, shapeDefocused.strokeWidth!);
      const seriesStrokeOpacity = getFocusValue(seriesFocusPercentage, shapeNormal.strokeOpacity!, shapeFocused.strokeOpacity!, shapeDefocused.strokeOpacity!);
      const seriesFillOpacity = getFocusValue(seriesFocusPercentage, shapeNormal.fillOpacity!, shapeFocused.fillOpacity!, shapeDefocused.fillOpacity!);

      if (seriesConfig.renderer === RENDERER_LINE) { // TODO - consider drawing a second line for range series...
        const lineGenerator = getLineGenerator(seriesConfig, seriesPositionData, inverted);
        this.shape.set('line', () => svgEl('path'))!.set({
          d: lineGenerator(), className: mochartCssClasses['seriesLine'], strokeWidth: seriesStrokeWidth,
          stroke: seriesStrokeColor, strokeOpacity: seriesStrokeOpacity, fill: seriesFillColor,
          onMouseEnter: onSeriesEnter, onMouseLeave: onSeriesLeave, onClick: onSeriesClick });
      }
      else if (seriesConfig.renderer === RENDERER_AREA) {
        if (seriesConfig.gradient !== NONE) {
          seriesFillColor = getGradientReference(gradientIdMap[seriesConfig.gradient]);
        }
        const areaGenerator = getAreaGenerator(seriesConfig, seriesPositionData, inverted);
        this.shape.set('area', () => svgEl('path'))!.set({
          d: areaGenerator(), className: mochartCssClasses['seriesArea'], strokeWidth: seriesStrokeWidth,
          stroke: seriesStrokeColor, strokeOpacity: seriesStrokeOpacity, fill: seriesFillColor, fillOpacity: seriesFillOpacity,
          onMouseEnter: onSeriesEnter, onMouseLeave: onSeriesLeave, onClick: onSeriesClick });
      }
      else if (seriesConfig.renderer === RENDERER_BAR) {
        const bars: BarData[] = [];
        const columnGenerator = getColumnGenerator(seriesConfig, seriesPositionData, inverted, stackData);
        let barStrokeColor = seriesStrokeColor;
        let barFillColor = seriesFillColor;
        if (seriesConfig.gradient !== NONE) {
          barFillColor = getGradientReference(gradientIdMap[seriesConfig.gradient]);
        }
        let barStrokeOpacity = seriesStrokeOpacity;
        let barFillOpacity = seriesFillOpacity;
        let barStrokeWidth = seriesStrokeWidth;
        const hasDifferentStrokeColors = shapeNormal.strokeColor === COLOR_GROUP_INDEX;
        const hasDifferentFillColors = shapeNormal.fillColor === COLOR_GROUP_INDEX;
        const hasDifferentColors = hasDifferentStrokeColors || hasDifferentFillColors;
        let focusPercentage;
        const { skipped, skipGroupIndexMap } = seriesPositionData;

        for (let i = 0; i < seriesPositionData.length; i++) {
          if (seriesPositionData.getDefined(null, i)) {
            // Positions may be compacted, but focus and color values stay
            // indexed by the raw group index.
            const skipI = skipped ? skipGroupIndexMap[i] : i;
            focusPercentage = getGroupFocusPercentage(groupFocusPercentages[skipI], seriesFocusPercentage);
            if (seriesColorGenerator !== null) {
              barStrokeColor = seriesColorGenerator(skipI);
              barFillColor = barStrokeColor;
            }
            else if (hasDifferentColors) {
              if (hasDifferentStrokeColors) {
                barStrokeColor = getSeriesStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, null, skipI);
              }
              if (hasDifferentFillColors) {
                barFillColor = getSeriesFillColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, null, skipI);
              }
            }
            else if (focusPercentage !== seriesFocusPercentage) {
              barStrokeColor = getSeriesStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage);
              if (seriesConfig.gradient === NONE) {
                barFillColor = getSeriesFillColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage);
              }
            }
            else {
              barStrokeColor = seriesStrokeColor;
              if (seriesConfig.gradient === NONE) {
                barFillColor = seriesFillColor;
              }
            }
            barStrokeWidth = getFocusValue(focusPercentage, shapeNormal.strokeWidth!, shapeFocused.strokeWidth!, shapeDefocused.strokeWidth!);
            barStrokeOpacity = getFocusValue(focusPercentage, shapeNormal.strokeOpacity!, shapeFocused.strokeOpacity!, shapeDefocused.strokeOpacity!);
            barFillOpacity = getFocusValue(focusPercentage, shapeNormal.fillOpacity!, shapeFocused.fillOpacity!, shapeDefocused.fillOpacity!);
            bars.push({
              key: 'bar-' + i,
              attrs: { d: columnGenerator(i), className: mochartCssClasses['seriesBar'] + i,
                onMouseEnter: () => onGroupEnter(i),
                onMouseLeave: () => onGroupLeave(i),
                onClick: () => onGroupClick(i),
                stroke: barStrokeColor, strokeWidth: barStrokeWidth, strokeOpacity: barStrokeOpacity,
                fill: barFillColor, fillOpacity: barFillOpacity }
            });
          }
        }
        this.shape.set('bars', () => this.barsGroup);
        this.bars.sync(bars, barAdapter);
      }
      else {
        // RENDERER_NONE (or anything unrecognized) renders no shape
        this.shape.set(null);
      }

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['series'] + seriesId,
        transform: translateObject(seriesLayoutInfo) });
      this.errorBars.set(SeriesErrorBars, { colorPaletteConfig, seriesConfig, seriesIndex,
        seriesPositionData, seriesAxisScale, filteredValues, inverted, focusData });
      this.markers.set(SeriesMarkers, { colorPaletteConfig, seriesConfig, seriesPositionData,
        filteredValues, rawDomains, inverted, seriesIndex,
        focusData, onGroupEnter, onGroupLeave, onGroupClick });
      this.labels.set(SeriesLabels, { colorPaletteConfig, seriesConfig, seriesAxisScale,
        rawSeriesAxisDomain, seriesPositionData, filteredValues, inverted,
        focusData, onGroupEnter, onGroupLeave, onGroupClick, seriesIndex });
    }
    else {
      this.setPresent(false);
    }
  }
}
