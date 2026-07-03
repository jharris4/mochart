// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { NONE } from '../config/core/constants';
import { translate } from '../utils/utils';
import { getSymbolGenerator } from '../utils/shapeUtils';
import { getSeriesMarkerFillColor, getSeriesMarkerStrokeColor} from '../utils/SeriesColors';
import { getSeriesFocusPercentage } from '../utils/SeriesFocus';
import { getFocusValue, getGroupFocusPercentage } from '../utils/FocusValue';

export default class SeriesMarkers extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { colorPaletteConfig, seriesConfig, seriesIndex, seriesPositionData, filteredValues, rawDomains, inverted, focusData,
      onGroupEnter, onGroupLeave, onGroupClick } = this.props;

    if (seriesConfig.markerShape !== NONE) {
      const { groupFocusPercentages, seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
      const seriesFocusPercentage = getSeriesFocusPercentage(seriesConfig, seriesAxisFocusPercentages, seriesFocusPercentages);
      let markerFillColor, markerStrokeColor, markerStrokeOpacity, markerFillOpacity, markerStrokeWidth;
      const { skipMissing, markerShape, markerShowMissing, markerSize, minMarkerSize } = seriesConfig;
      let markers = [];
      let markerSizes = null;
      if (seriesConfig.markerProperty !== NONE) {
        markerSizes = [];
        let markerValues = filteredValues.marker;
        let markerDomain = rawDomains.marker;
        // TODO - should use a linear scale here...
        let markerMin = markerDomain[0];
        let markerMax = markerDomain[1];
        let markerExtent = Math.max(1, (markerMax - markerMin));
        let markerSizeExtent = markerSize - minMarkerSize;
        let count = markerValues.length;
        for (let m=0; m<count; m++) {
          if (markerValues[m] !== void 0) {
            markerSizes.push(minMarkerSize + (markerValues[m] - markerMin) / markerExtent * markerSizeExtent);
          }
          else if (!skipMissing) {
            markerSizes.push(void 0);
          }
        }
      }

      let symbolGenerator = getSymbolGenerator(markerSize, markerShape);
      let globalSymbol = symbolGenerator();

      const { max } = filteredValues;

      let focusPercentage;

      const { length, getDefined, getSeriesPosition, getGroupPosition, skipGroupIndexMap } = seriesPositionData;

      for (let i=0; i<length; i++) {
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
            cx = getSeriesPosition(null, i);
            cy = getGroupPosition(null, i);
          }
          else {
            cx = getGroupPosition(null, i);
            cy = getSeriesPosition(null, i);
          }
          let theSymbol = globalSymbol;
          let currentMarkerSize = markerSize;
          if (markerSizes !== null) {
            currentMarkerSize = markerSizes[i];
            if (currentMarkerSize !== void 0) {
              theSymbol = symbolGenerator.size(currentMarkerSize*currentMarkerSize)();
            }
          }
          if (currentMarkerSize !== void 0) {
            markers.push(
              <path key={'marker-'+i} className={mochartCssClasses['seriesMarker']+i} d={theSymbol} transform={translate(cx, cy)}
                    stroke={markerStrokeColor} fill={markerFillColor} strokeWidth={markerStrokeWidth} strokeOpacity={markerStrokeOpacity} fillOpacity={markerFillOpacity}
                    onMouseEnter={() => onGroupEnter(i)} onMouseLeave={() => onGroupLeave(i)} onClick={() => onGroupClick(i)}/>
            );
          }
        }
      }
      return (
        <g className={mochartCssClasses['seriesMarkers']}>
          {markers}
        </g>
      );
    }
    return false;
  }
}