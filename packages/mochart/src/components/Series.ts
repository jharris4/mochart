import { Renderer, svgEl, ElList } from '../render';

import { getSeriesPositionData } from '../utils/SeriesPositions';
import { getLineGenerator, getAreaGenerator, getColumnGenerator } from '../utils/SeriesShapes';
import { getSeriesColorGenerator } from '../utils/SeriesColors';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { mochartCssClasses } from '../utils/ChartDom';
import { areArraysAndEqual, translateObject } from '../utils/utils';
import { NONE, RENDERER_AREA, RENDERER_LINE, RENDERER_BAR } from '../config/core/constants';
import { COLOR_CATEGORY_INDEX } from '../config/core/constants';
import { getSeriesFillColor, getSeriesStrokeColor } from '../utils/SeriesColors';
import { getGradientReference } from '../utils/svgUtils';
import { getFocusValue, getCategoryFocusPercentage } from '../utils/FocusValue';

import SeriesErrorBars from './SeriesErrorBars';
import SeriesMarkers from './SeriesMarkers';
import SeriesLabels from './SeriesLabels';
import type { El, ElListAdapter } from '../render';
import type { ColorPaletteConfig, CategoryAxisConfig } from '../types/config';
import type { EnhancedSeriesConfig } from '../types/enhanced';
import type { FocusData } from '../types/animation';
import type { AxisScale, CategoryAxisData, NullableDomain, SeriesDomainObject, SeriesPositionData, SeriesValueObject, StackData } from '../types/data';
import type { LayoutInfo } from '../types/layout';

const noOp = () => {};
const noOpGroup = (_categoryIndex: number) => {};

interface SeriesFocusUpdate {
  seriesId?: string | null;
  categoryIndex?: number | null;
}

interface SeriesProps {
  categoryAxisConfig: CategoryAxisConfig;
  colorPaletteConfig: ColorPaletteConfig;
  seriesConfig: EnhancedSeriesConfig;
  seriesIndex: number;
  stackData: StackData;
  seriesLayoutInfo: LayoutInfo;
  focusData: FocusData | null;
  categoryValueData: CategoryAxisData['valueData'];
  valueAxisScale: AxisScale;
  rawValueAxisDomain: NullableDomain;
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
  onCategoryEnter: (categoryIndex: number) => void;
  onCategoryLeave: (categoryIndex: number) => void;
  onCategoryClick: (categoryIndex: number) => void;
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
      onCategoryEnter: noOpGroup, onCategoryLeave: noOpGroup, onCategoryClick: noOpGroup };
  }

  derive(props: SeriesProps, state: SeriesState, prevProps: SeriesProps | null): Partial<SeriesState> | null {
    if (prevProps === null) {
      const initial = this.computeSeriesPositionData(props);
      const { seriesPositionData } = initial;
      return { ...initial, ...this.buildEventListeners(props, seriesPositionData) };
    }
    const { categoryAxisConfig, seriesConfig, focusData, onFocus, categoryValueData, valueAxisScale, filteredValues } = props;
    let categoryFocusChanged = false;
    let seriesFocusChanged = false;
    let { seriesPositionData } = state;
    if (focusData !== prevProps.focusData) {
      if (focusData === null || prevProps.focusData === null) {
        categoryFocusChanged = true;
        seriesFocusChanged = true;
      }
      else {
        categoryFocusChanged = focusData.focusedCategoryIndex !== prevProps.focusData.focusedCategoryIndex;
        seriesFocusChanged = focusData.focusedSeriesId !== prevProps.focusData.focusedSeriesId;
      }
    }
    const oldValueAxisScale = prevProps.valueAxisScale;
    let valueAxisScaleChanged = false;
    if (valueAxisScale !== oldValueAxisScale) {
      if (valueAxisScale === null || oldValueAxisScale === null) {
        valueAxisScaleChanged = true;
      }
      else {
        valueAxisScaleChanged = !areArraysAndEqual(valueAxisScale.domain(), oldValueAxisScale.domain()) ||
                                 !areArraysAndEqual(valueAxisScale.range(), oldValueAxisScale.range());
      }
    }

    let delta: Partial<SeriesState> = {};
    let updateState = false;
    let positionsChanged = false;
    if (categoryAxisConfig !== prevProps.categoryAxisConfig || seriesConfig !== prevProps.seriesConfig ||
      categoryValueData !== prevProps.categoryValueData || valueAxisScaleChanged || filteredValues !== prevProps.filteredValues) {
      delta = this.computeSeriesPositionData(props);
      seriesPositionData = delta.seriesPositionData ?? null;
      positionsChanged = true;
      updateState = true;
    }
    // positionsChanged: the group-index listeners close over skipCategoryIndexMap
    if (positionsChanged || categoryFocusChanged || seriesFocusChanged || onFocus !== prevProps.onFocus) {
      delta = { ...delta, ...this.buildEventListeners(props, seriesPositionData) };
      updateState = true;
    }
    return updateState ? delta : null;
  }

  buildEventListeners(props: SeriesProps, seriesPositionData: SeriesPositionData | null): Pick<SeriesState, 'onSeriesEnter' | 'onSeriesLeave' | 'onSeriesClick' | 'onCategoryEnter' | 'onCategoryLeave' | 'onCategoryClick'> {
    const { seriesConfig, focusData, onFocus } = props;
    // a follower series (followSeries) focuses as its leader, so clicking a
    // candlestick wick focuses (and toggles) the whole candle
    const seriesId = seriesConfig.followSeries ?? seriesConfig.id;
    const focusedCategoryIndex = focusData ? focusData.focusedCategoryIndex : -1;
    const focusedSeriesId = focusData ? focusData.focusedSeriesId : null;
    const skipCategoryIndexMap = seriesPositionData ? seriesPositionData.skipCategoryIndexMap : {};
    const getCategoryIndex = seriesPositionData?.skipped ? (categoryIndex: number) => skipCategoryIndexMap[categoryIndex] : (categoryIndex: number) => categoryIndex;

    let onSeriesEnter = noOp;
    let onSeriesLeave = noOp;
    let onSeriesClick = noOp;
    let onCategoryEnter = noOpGroup;
    let onCategoryLeave = noOpGroup;
    let onCategoryClick = noOpGroup;

    if (seriesConfig.focusOnMouseOver) {
      onSeriesEnter = () => { onFocus({ seriesId }); };
      onSeriesLeave = () => { onFocus({ seriesId: null }); };
      if (seriesConfig.focusCategoryOnMouseOver) {
        onCategoryEnter = (categoryIndex: number) => { onFocus({ seriesId, categoryIndex: getCategoryIndex(categoryIndex) }); };
        onCategoryLeave = (_categoryIndex: number) => { onFocus({ seriesId: null, categoryIndex: null }); };
      }
      else {
        onCategoryEnter = (_categoryIndex: number) => { onFocus({ seriesId }); };
        onCategoryLeave = (_categoryIndex: number) => { onFocus({ seriesId: null }); };
      }
    }
    else if (seriesConfig.focusCategoryOnMouseOver) {
      onCategoryEnter = (categoryIndex: number) => { onFocus({ categoryIndex: getCategoryIndex(categoryIndex) }); };
      onCategoryLeave = (_categoryIndex: number) => { onFocus({ categoryIndex: null }); };
    }
    if (seriesConfig.focusOnClick) {
      onSeriesClick = () => { onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId }); };
      if (seriesConfig.focusCategoryOnClick) {
        onCategoryClick = (categoryIndex: number) => { onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId, categoryIndex: getCategoryIndex(categoryIndex) === focusedCategoryIndex ? -1 : getCategoryIndex(categoryIndex) }); };
      }
      else {
        onCategoryClick = (_categoryIndex: number) => { onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId }); };
      }
    }
    else if (seriesConfig.focusCategoryOnClick) {
      onCategoryClick = (categoryIndex: number) => { onFocus({ categoryIndex: getCategoryIndex(categoryIndex) === focusedCategoryIndex ? -1 : getCategoryIndex(categoryIndex) }); };
    }

    return { onSeriesEnter, onSeriesLeave, onSeriesClick, onCategoryEnter, onCategoryLeave, onCategoryClick };
  }

  computeSeriesPositionData(props: SeriesProps): Pick<SeriesState, 'seriesPositionData'> {
    const { categoryAxisConfig, seriesConfig, categoryValueData, valueAxisScale, filteredValues, seriesLayoutInfo } = props;
    const seriesPositionData = filteredValues.plain !== null ? getSeriesPositionData(categoryAxisConfig, seriesConfig, categoryValueData, valueAxisScale, filteredValues, seriesLayoutInfo) : null;
    return {
      seriesPositionData
    };
  }

  create() {
    return this.root.node;
  }

  sync() {
    const { colorPaletteConfig, seriesConfig, seriesIndex, stackData, seriesLayoutInfo, focusData, valueAxisScale, rawValueAxisDomain, filteredValues, rawDomains, gradientIdMap } = this.props;
    const { seriesPositionData, onSeriesEnter, onSeriesLeave, onSeriesClick, onCategoryEnter, onCategoryLeave, onCategoryClick } = this.state;

    const seriesId = seriesConfig.id;

    if (filteredValues.plain !== null && seriesPositionData !== null && focusData !== null) {
      const { inverted } = seriesLayoutInfo;
      const { categoryFocusPercentages, valueAxisFocusPercentages, seriesFocusPercentages } = focusData;
      const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, valueAxisFocusPercentages, seriesFocusPercentages);

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
        const hasDifferentStrokeColors = shapeNormal.strokeColor === COLOR_CATEGORY_INDEX;
        const hasDifferentFillColors = shapeNormal.fillColor === COLOR_CATEGORY_INDEX;
        const hasDifferentColors = hasDifferentStrokeColors || hasDifferentFillColors;
        let focusPercentage;
        const { skipped, skipCategoryIndexMap } = seriesPositionData;

        for (let i = 0; i < seriesPositionData.length; i++) {
          if (seriesPositionData.getDefined(null, i)) {
            // Positions may be compacted, but focus and color values stay
            // indexed by the raw group index.
            const skipI = skipped ? skipCategoryIndexMap[i] : i;
            focusPercentage = getCategoryFocusPercentage(categoryFocusPercentages[skipI], seriesFocusPercentage);
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
                onMouseEnter: () => onCategoryEnter(i),
                onMouseLeave: () => onCategoryLeave(i),
                onClick: () => onCategoryClick(i),
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
        seriesPositionData, valueAxisScale, filteredValues, inverted, focusData });
      this.markers.set(SeriesMarkers, { colorPaletteConfig, seriesConfig, seriesPositionData,
        filteredValues, rawDomains, inverted, seriesIndex,
        focusData, onCategoryEnter, onCategoryLeave, onCategoryClick });
      this.labels.set(SeriesLabels, { colorPaletteConfig, seriesConfig, valueAxisScale,
        rawValueAxisDomain, seriesPositionData, filteredValues, inverted,
        focusData, onCategoryEnter, onCategoryLeave, onCategoryClick, seriesIndex });
    }
    else {
      this.setPresent(false);
    }
  }
}
