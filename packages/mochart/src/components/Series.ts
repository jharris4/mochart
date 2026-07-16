// @ts-nocheck — ported from the vdom implementation; add types when touched
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

import SeriesMarkers from './SeriesMarkers';
import SeriesLabels from './SeriesLabels';

const noOp = () => {};

const barAdapter = {
  key: (bar) => bar.key,
  create: () => ({ root: svgEl('path') }),
  update: (handle, bar) => {
    handle.root.set(bar.attrs);
  }
};

export default class Series extends Renderer {
  root = svgEl('g');
  shape = this.elSlot(this.root);
  markers = this.slot(this.root);
  labels = this.slot(this.root);
  barsGroup = svgEl('g');
  bars = new ElList(this.barsGroup.node, null);

  constructor() {
    super();
    this.state = { onSeriesEnter: noOp, onSeriesLeave: noOp, onSeriesClick: noOp, onGroupEnter: noOp, onGroupLeave: noOp, onGroupClick: noOp };
  }

  willMount() {
    let state = this.computeSeriesPositionData(this.props);
    const { seriesPositionData } = state;
    state = { ...state, ...this.buildEventListeners(this.props, seriesPositionData) };
    this.setState(state);
  }

  willReceiveProps(nextProps) {
    const { groupAxisConfig, seriesConfig, focusData, onFocus, groupValueData, seriesAxisScale, filteredValues } = nextProps;
    let groupFocusChanged = false;
    let seriesFocusChanged = false;
    let { seriesPositionData } = this.state;
    if (focusData !== this.props.focusData) {
      if (focusData === null || this.props.focusData === null) {
        groupFocusChanged = true;
        seriesFocusChanged = true;
      }
      else {
        groupFocusChanged = focusData.focusedGroupIndex !== this.props.focusData.focusedGroupIndex;
        seriesFocusChanged = focusData.focusedSeriesId !== this.props.focusData.focusedSeriesId;
      }
    }
    let oldSeriesAxisScale = this.props.seriesAxisScale;
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

    let state = {};
    let updateState = false;
    if (groupAxisConfig !== this.props.groupAxisConfig || seriesConfig !== this.props.seriesConfig ||
      groupValueData !== this.props.groupValueData || seriesAxisScaleChanged || filteredValues !== this.props.filteredValues) {
      state = this.computeSeriesPositionData(nextProps);
      seriesPositionData = state.seriesPositionData;
      updateState = true;
    }
    if (seriesConfig !== this.props.seriesConfig || groupFocusChanged || seriesFocusChanged || onFocus !== this.props.onFocus) {
      state = { ...state, ...this.buildEventListeners(nextProps, seriesPositionData) };
      updateState = true;
    }
    if (updateState) {
      this.setState(state);
    }
  }

  buildEventListeners(props, seriesPositionData) {
    const { seriesConfig, focusData, onFocus } = props;
    const seriesId = seriesConfig.id;
    const focusedGroupIndex = focusData ? focusData.focusedGroupIndex : -1;
    const focusedSeriesId = focusData ? focusData.focusedSeriesId : null;
    const skipGroupIndexMap = seriesPositionData ? seriesPositionData.skipGroupIndexMap : {};
    const getGroupIndex = seriesConfig.skipMissing ? groupIndex => skipGroupIndexMap[groupIndex] : groupIndex => groupIndex;

    let onSeriesEnter = noOp;
    let onSeriesLeave = noOp;
    let onSeriesClick = noOp;
    let onGroupEnter = noOp;
    let onGroupLeave = noOp;
    let onGroupClick = noOp;

    if (seriesConfig.focusOnMouseOver) {
      onSeriesEnter = () => { onFocus({ seriesId }); };
      onSeriesLeave = () => { onFocus({ seriesId: null }); };
      if (seriesConfig.focusGroupOnMouseOver) {
        onGroupEnter = (groupIndex) => { onFocus({ seriesId, groupIndex: getGroupIndex(groupIndex) }); };
        onGroupLeave = (groupIndex) => { onFocus({ seriesId: null, groupIndex: null }); };
      }
      else {
        onGroupEnter = (groupIndex) => { onFocus({ seriesId }); };
        onGroupLeave = (groupIndex) => { onFocus({ seriesId: null }); };
      }
    }
    else if (seriesConfig.focusGroupOnMouseOver) {
      onGroupEnter = (groupIndex) => { onFocus({ groupIndex: getGroupIndex(groupIndex) }); };
      onGroupLeave = (groupIndex) => { onFocus({ groupIndex: null }); };
    }
    if (seriesConfig.focusOnClick) {
      onSeriesClick = () => { onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId }); };
      if (seriesConfig.focusGroupOnClick) {
        onGroupClick = (groupIndex) => { onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId, groupIndex: getGroupIndex(groupIndex) === focusedGroupIndex ? -1 : getGroupIndex(groupIndex) }); };
      }
      else {
        onGroupClick = (groupIndex) => { onFocus({ seriesId: seriesId === focusedSeriesId ? null : seriesId }); };
      }
    }
    else if (seriesConfig.focusGroupOnClick) {
      onGroupClick = (groupIndex) => { onFocus({ groupIndex: getGroupIndex(groupIndex) === focusedGroupIndex ? -1 : getGroupIndex(groupIndex) }); };
    }

    return { onSeriesEnter, onSeriesLeave, onSeriesClick, onGroupEnter, onGroupLeave, onGroupClick };
  }

  computeSeriesPositionData(props) {
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

    if (filteredValues.plain !== null) {
      const { inverted } = seriesLayoutInfo;
      let { groupFocusPercentages, seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
      const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, seriesAxisFocusPercentages, seriesFocusPercentages);

      let seriesStrokeColor = getSeriesStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, seriesFocusPercentage);
      let seriesFillColor = seriesConfig.renderer === RENDERER_LINE ? 'none' : getSeriesFillColor(colorPaletteConfig, seriesConfig, seriesIndex, seriesFocusPercentage);
      let seriesColorGenerator = null;
      if (seriesConfig.colorProperty !== NONE) {
        seriesColorGenerator = getSeriesColorGenerator(seriesConfig, seriesFocusPercentage, rawDomains, filteredValues);
      }
      let seriesStrokeWidth = getFocusValue(seriesFocusPercentage, seriesConfig.strokeWidth, seriesConfig.focusedStrokeWidth, seriesConfig.defocusedStrokeWidth);
      let seriesStrokeOpacity = getFocusValue(seriesFocusPercentage, seriesConfig.strokeOpacity, seriesConfig.focusedStrokeOpacity, seriesConfig.defocusedStrokeOpacity);
      let seriesFillOpacity = getFocusValue(seriesFocusPercentage, seriesConfig.fillOpacity, seriesConfig.focusedFillOpacity, seriesConfig.defocusedFillOpacity);

      if (seriesConfig.renderer === RENDERER_LINE) { // TODO - consider drawing a second line for range series...
        let lineGenerator = getLineGenerator(seriesConfig, seriesPositionData, inverted);
        this.shape.set('line', () => svgEl('path')).set({
          d: lineGenerator(), className: mochartCssClasses['seriesLine'], strokeWidth: seriesStrokeWidth,
          stroke: seriesStrokeColor, strokeOpacity: seriesStrokeOpacity, fill: seriesFillColor,
          onMouseEnter: onSeriesEnter, onMouseLeave: onSeriesLeave, onClick: onSeriesClick });
      }
      else if (seriesConfig.renderer === RENDERER_AREA) {
        if (seriesConfig.gradient !== NONE) {
          seriesFillColor = getGradientReference(gradientIdMap[seriesConfig.gradient]);
        }
        let areaGenerator = getAreaGenerator(seriesConfig, seriesPositionData, inverted);
        this.shape.set('area', () => svgEl('path')).set({
          d: areaGenerator(), className: mochartCssClasses['seriesArea'], strokeWidth: seriesStrokeWidth,
          stroke: seriesStrokeColor, strokeOpacity: seriesStrokeOpacity, fill: seriesFillColor, fillOpacity: seriesFillOpacity,
          onMouseEnter: onSeriesEnter, onMouseLeave: onSeriesLeave, onClick: onSeriesClick });
      }
      else if (seriesConfig.renderer === RENDERER_BAR) {
        let bars = [];
        let columnGenerator = getColumnGenerator(seriesConfig, seriesPositionData, inverted, stackData);
        let barStrokeColor = seriesStrokeColor;
        let barFillColor = seriesFillColor;
        if (seriesConfig.gradient !== NONE) {
          barFillColor = getGradientReference(gradientIdMap[seriesConfig.gradient]);
        }
        let barStrokeOpacity = seriesStrokeOpacity;
        let barFillOpacity = seriesFillOpacity;
        let barStrokeWidth = seriesStrokeWidth;
        let hasDifferentStrokeColors = seriesConfig.strokeColor === COLOR_GROUP_INDEX;
        let hasDifferentFillColors = seriesConfig.fillColor === COLOR_GROUP_INDEX;
        let hasDifferentColors = hasDifferentStrokeColors || hasDifferentFillColors;
        let focusPercentage;

        for (let i = 0; i < seriesPositionData.length; i++) {
          if (seriesPositionData.getDefined(null, i)) {
            focusPercentage = getGroupFocusPercentage(groupFocusPercentages[i], seriesFocusPercentage);
            if (seriesColorGenerator !== null) {
              barStrokeColor = seriesColorGenerator(i);
              barFillColor = barStrokeColor;
            }
            else if (hasDifferentColors) {
              if (hasDifferentStrokeColors) {
                barStrokeColor = getSeriesStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, null, i);
              }
              if (hasDifferentFillColors) {
                barFillColor = getSeriesFillColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, null, i);
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
            barStrokeWidth = getFocusValue(focusPercentage, seriesConfig.strokeWidth, seriesConfig.focusedStrokeWidth, seriesConfig.defocusedStrokeWidth);
            barStrokeOpacity = getFocusValue(focusPercentage, seriesConfig.strokeOpacity, seriesConfig.focusedStrokeOpacity, seriesConfig.defocusedStrokeOpacity);
            barFillOpacity = getFocusValue(focusPercentage, seriesConfig.fillOpacity, seriesConfig.focusedFillOpacity, seriesConfig.defocusedFillOpacity);
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
