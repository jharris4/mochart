import { scaleLinear, scaleSqrt } from 'd3-scale';

import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { NONE, MARKER_SIZE_SCALE_SQRT } from '../config/core/constants';
import { translate } from '../utils/utils';
import { getSymbolGenerator } from '../utils/shapeUtils';
import { getSeriesMarkerFillColor, getSeriesMarkerStrokeColor } from '../utils/SeriesColors';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { getFocusValue, getFocusStrokeWidth, getFocusStrokeDashArray, getCategoryFocusPercentage } from '../utils/FocusValue';
import type { ElListAdapter, ElProps } from '../render';
import type { ColorPaletteConfig } from '../types/config';
import type { EnhancedSeriesConfig } from '../types/enhanced';
import type { FocusData } from '../types/animation';
import type { SeriesDomainObject, SeriesPositionData, SeriesValueObject } from '../types/data';

interface MarkerItem {
  key: string;
  attrs: ElProps;
}

const markerAdapter: ElListAdapter<MarkerItem, { root: ReturnType<typeof svgEl> }> = {
  key: (marker) => marker.key,
  create: () => ({ root: svgEl('path') }),
  update: (handle, marker) => {
    handle.root.set(marker.attrs);
  }
};

interface SeriesMarkersProps {
  colorPaletteConfig: ColorPaletteConfig;
  seriesConfig: EnhancedSeriesConfig;
  seriesIndex: number;
  seriesPositionData: SeriesPositionData;
  filteredValues: SeriesValueObject;
  rawDomains: SeriesDomainObject;
  inverted: boolean;
  focusData: FocusData;
  onCategoryEnter: (categoryIndex: number) => void;
  onCategoryLeave: (categoryIndex: number) => void;
  onCategoryClick: (categoryIndex: number) => void;
}

export default class SeriesMarkers extends Renderer<SeriesMarkersProps> {
  root = svgEl('g');
  markers = this.elList<MarkerItem>(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { colorPaletteConfig, seriesConfig, seriesIndex, seriesPositionData, filteredValues, rawDomains, inverted, focusData,
      onCategoryEnter, onCategoryLeave, onCategoryClick } = this.props;

    if (seriesConfig.markerShape !== NONE) {
      const { categoryFocusPercentages, valueAxisFocusPercentages, seriesFocusPercentages } = focusData;
      const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, valueAxisFocusPercentages, seriesFocusPercentages);
      let markerFillColor, markerStrokeColor, markerStrokeOpacity, markerFillOpacity, markerStrokeWidth;
      const { markerShape, missingValueMarkers, markerSize, markerMinSize, markerSizeScale } = seriesConfig;
      const { normal: markerNormal, focused: markerFocused, defocused: markerDefocused } = seriesConfig.markerStyle;
      const markers: MarkerItem[] = [];
      let markerSizes: Array<number | undefined> | null = null;
      if (seriesConfig.markerProperty !== NONE) {
        markerSizes = [];
        const markerValues = filteredValues.marker!;
        const markerDomain = rawDomains.marker;
        const sizeScale = (markerSizeScale === MARKER_SIZE_SCALE_SQRT ? scaleSqrt() : scaleLinear())
          .domain([markerDomain[0]!, markerDomain[1]!])
          .range([markerMinSize, markerSize])
          .clamp(true);
        // Raw-indexed: marker values can be missing in a different pattern than
        // the main values, so this must not follow the position compaction.
        const count = markerValues.length;
        for (let m = 0; m < count; m++) {
          const markerValue = markerValues[m];
          markerSizes.push(markerValue !== undefined ? sizeScale(markerValue) : undefined);
        }
      }

      const symbolGenerator = getSymbolGenerator(markerSize, markerShape);
      const globalSymbol = symbolGenerator();

      const max = filteredValues.max!;

      let focusPercentage;

      const { length, getDefined, getSeriesPosition, getCategoryPosition, skipped, skipCategoryIndexMap } = seriesPositionData;

      for (let i = 0; i < length; i++) {
        const skipI = skipped ? skipCategoryIndexMap[i] : i;
        if (getDefined(null, i) && (missingValueMarkers || max[skipI] !== undefined)) {
          focusPercentage = getCategoryFocusPercentage(categoryFocusPercentages[skipI], seriesFocusPercentage);
          markerFillColor = getSeriesMarkerFillColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, null, skipI);
          markerStrokeColor = getSeriesMarkerStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, null, skipI);
          markerStrokeWidth = getFocusStrokeWidth(focusPercentage, markerNormal.strokeWidth, markerFocused.strokeWidth, markerDefocused.strokeWidth);
          const markerStrokeDashArray = getFocusStrokeDashArray(focusPercentage, markerNormal.strokeDashArray, markerFocused.strokeDashArray, markerDefocused.strokeDashArray);
          markerStrokeOpacity = getFocusValue(focusPercentage, markerNormal.strokeOpacity!, markerFocused.strokeOpacity!, markerDefocused.strokeOpacity!);
          markerFillOpacity = getFocusValue(focusPercentage, markerNormal.fillOpacity!, markerFocused.fillOpacity!, markerDefocused.fillOpacity!);
          let cx, cy;
          if (inverted) {
            cx = getSeriesPosition(null, i)!;
            cy = getCategoryPosition(null, i)!;
          }
          else {
            cx = getCategoryPosition(null, i)!;
            cy = getSeriesPosition(null, i)!;
          }
          let theSymbol = globalSymbol;
          let currentMarkerSize: number | undefined = markerSize;
          if (markerSizes !== null) {
            currentMarkerSize = markerSizes[skipI];
            if (currentMarkerSize !== undefined) {
              theSymbol = symbolGenerator.size(currentMarkerSize * currentMarkerSize)();
            }
          }
          if (currentMarkerSize !== undefined) {
            markers.push({
              key: 'marker-' + i,
              attrs: { className: mochartCssClasses['seriesMarker'] + i, d: theSymbol, transform: translate(cx, cy),
                stroke: markerStrokeColor, fill: markerFillColor, strokeWidth: markerStrokeWidth, strokeDasharray: markerStrokeDashArray, strokeOpacity: markerStrokeOpacity, fillOpacity: markerFillOpacity,
                onMouseEnter: () => onCategoryEnter(i), onMouseLeave: () => onCategoryLeave(i), onClick: () => onCategoryClick(i) }
            });
          }
        }
      }
      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['seriesMarkers'] });
      this.markers.sync(markers, markerAdapter);
    }
    else {
      this.setPresent(false);
    }
  }
}
