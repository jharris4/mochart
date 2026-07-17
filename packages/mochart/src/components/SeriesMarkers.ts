import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { NONE } from '../config/core/constants';
import { translate } from '../utils/utils';
import { getSymbolGenerator } from '../utils/shapeUtils';
import { getSeriesMarkerFillColor, getSeriesMarkerStrokeColor } from '../utils/SeriesColors';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { getFocusValue, getGroupFocusPercentage } from '../utils/FocusValue';
import type { ElListAdapter, ElProps } from '../render';
import type { ColorPaletteConfig, SeriesConfig } from '../types/config';
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
  seriesConfig: SeriesConfig;
  seriesIndex: number;
  seriesPositionData: SeriesPositionData;
  filteredValues: SeriesValueObject;
  rawDomains: SeriesDomainObject;
  inverted: boolean;
  focusData: FocusData;
  onGroupEnter: (groupIndex: number) => void;
  onGroupLeave: (groupIndex: number) => void;
  onGroupClick: (groupIndex: number) => void;
}

export default class SeriesMarkers extends Renderer<SeriesMarkersProps> {
  root = svgEl('g');
  markers = this.elList<MarkerItem>(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { colorPaletteConfig, seriesConfig, seriesIndex, seriesPositionData, filteredValues, rawDomains, inverted, focusData,
      onGroupEnter, onGroupLeave, onGroupClick } = this.props;

    if (seriesConfig.markerShape !== NONE) {
      const { groupFocusPercentages, seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
      const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, seriesAxisFocusPercentages, seriesFocusPercentages);
      let markerFillColor, markerStrokeColor, markerStrokeOpacity, markerFillOpacity, markerStrokeWidth;
      const { skipMissing, markerShape, markerShowMissing, markerSize, minMarkerSize } = seriesConfig;
      let markers: MarkerItem[] = [];
      let markerSizes: Array<number | undefined> | null = null;
      if (seriesConfig.markerProperty !== NONE) {
        markerSizes = [];
        let markerValues = filteredValues.marker!;
        let markerDomain = rawDomains.marker;
        // TODO - should use a linear scale here...
        let markerMin = markerDomain[0]!;
        let markerMax = markerDomain[1]!;
        let markerExtent = Math.max(1, (markerMax - markerMin));
        let markerSizeExtent = markerSize - minMarkerSize;
        let count = markerValues.length;
        for (let m = 0; m < count; m++) {
          const markerValue = markerValues[m];
          if (markerValue !== void 0) {
            markerSizes.push(minMarkerSize + (markerValue - markerMin) / markerExtent * markerSizeExtent);
          }
          else if (!skipMissing) {
            markerSizes.push(void 0);
          }
        }
      }

      let symbolGenerator = getSymbolGenerator(markerSize, markerShape);
      let globalSymbol = symbolGenerator();

      const max = filteredValues.max!;

      let focusPercentage;

      const { length, getDefined, getSeriesPosition, getGroupPosition, skipGroupIndexMap } = seriesPositionData;

      for (let i = 0; i < length; i++) {
        let skipI = skipMissing ? skipGroupIndexMap[i] : i;
        if (getDefined(null, i) && (markerShowMissing || max[skipI] !== void 0)) {
          focusPercentage = getGroupFocusPercentage(groupFocusPercentages[skipI], seriesFocusPercentage);
          markerFillColor = getSeriesMarkerFillColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, null, i);
          markerStrokeColor = getSeriesMarkerStrokeColor(colorPaletteConfig, seriesConfig, seriesIndex, focusPercentage, null, i);
          markerStrokeWidth = getFocusValue(focusPercentage, seriesConfig.markerStrokeWidth, seriesConfig.markerFocusedStrokeWidth, seriesConfig.markerDefocusedStrokeWidth);
          markerStrokeOpacity = getFocusValue(focusPercentage, seriesConfig.markerStrokeOpacity, seriesConfig.markerFocusedStrokeOpacity, seriesConfig.markerDefocusedStrokeOpacity);
          markerFillOpacity = getFocusValue(focusPercentage, seriesConfig.markerFillOpacity, seriesConfig.markerFocusedFillOpacity, seriesConfig.markerDefocusedFillOpacity);
          let cx, cy;
          if (inverted) {
            cx = getSeriesPosition(null, i)!;
            cy = getGroupPosition(null, i)!;
          }
          else {
            cx = getGroupPosition(null, i)!;
            cy = getSeriesPosition(null, i)!;
          }
          let theSymbol = globalSymbol;
          let currentMarkerSize: number | undefined = markerSize;
          if (markerSizes !== null) {
            currentMarkerSize = markerSizes[i];
            if (currentMarkerSize !== void 0) {
              theSymbol = symbolGenerator.size(currentMarkerSize * currentMarkerSize)();
            }
          }
          if (currentMarkerSize !== void 0) {
            markers.push({
              key: 'marker-' + i,
              attrs: { className: mochartCssClasses['seriesMarker'] + i, d: theSymbol, transform: translate(cx, cy),
                stroke: markerStrokeColor, fill: markerFillColor, strokeWidth: markerStrokeWidth, strokeOpacity: markerStrokeOpacity, fillOpacity: markerFillOpacity,
                onMouseEnter: () => onGroupEnter(i), onMouseLeave: () => onGroupLeave(i), onClick: () => onGroupClick(i) }
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
