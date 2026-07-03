// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import AxisThresholdLine from './AxisThresholdLine';
import AxisThresholdRange from './AxisThresholdRange';
import { mochartCssClasses } from '../utils/ChartDom';
import { getAxisFocusColor, getAxisFocusOpacity } from '../utils/FocusValue';

export default class AxisThreshold extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { hidden } = this.props;
    if (!hidden) {
      const { front, axisConfig, axisLayoutInfo, seriesLayoutInfo, axisDomain, vertical, axisFocusPercentage, seriesFocusPercentage, axisThresholdClass } = this.props;
      const { threshold, thresholdFront, thresholdWidth, thresholdDashArray,
        thresholdTitle, thresholdTitleBefore, thresholdTitleSnapToValue, thresholdTitleMargin, thresholdTitlePadding,
        thresholdTitleStrokeColor, thresholdTitleFocusedStrokeColor, thresholdTitleDefocusedStrokeColor,
        thresholdTitleFillColor, thresholdTitleFocusedFillColor, thresholdTitleDefocusedFillColor,
        thresholdTitleStrokeOpacity, thresholdTitleFocusedStrokeOpacity, thresholdTitleDefocusedStrokeOpacity,
        thresholdTitleFillOpacity, thresholdTitleFocusedFillOpacity, thresholdTitleDefocusedFillOpacity,
        thresholdColor, thresholdFocusedColor, thresholdDefocusedColor,
        thresholdOpacity, thresholdFocusedOpacity, thresholdDefocusedOpacity,
        useSeriesFocus
      } = axisConfig;

      return (
        <g className={axisThresholdClass}>
          {front !== thresholdFront ? false : (
            <AxisThresholdLine axisConfig={axisConfig} axisLayoutInfo={axisLayoutInfo} seriesLayoutInfo={seriesLayoutInfo} axisThresholdLineClass={mochartCssClasses['axisThreshold']} vertical={vertical}
              threshold={threshold} axisDomain={axisDomain} thresholdTitle={thresholdTitle} thresholdTitleBefore={thresholdTitleBefore} thresholdTitleSnapToValue={thresholdTitleSnapToValue}
              thresholdTitleMargin={thresholdTitleMargin} thresholdTitlePadding={thresholdTitlePadding}
              stroke={getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, thresholdColor, thresholdFocusedColor, thresholdDefocusedColor)}
              strokeOpacity={getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, thresholdOpacity, thresholdFocusedOpacity, thresholdDefocusedOpacity)}
              strokeWidth={thresholdWidth} strokeDashArray={thresholdDashArray}
              titleStroke={getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, thresholdTitleStrokeColor, thresholdTitleFocusedStrokeColor, thresholdTitleDefocusedStrokeColor)}
              titleStrokeOpacity={getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, thresholdTitleStrokeOpacity, thresholdTitleFocusedStrokeOpacity, thresholdTitleDefocusedStrokeOpacity)}
              titleFill={getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, thresholdTitleFillColor, thresholdTitleFocusedFillColor, thresholdTitleDefocusedFillColor)}
              titleFillOpacity={getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus, thresholdTitleFillOpacity, thresholdTitleFocusedFillOpacity, thresholdTitleDefocusedFillOpacity)}/>
          )}
        </g>
      );
    }
    return false;
  }
}