// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { translate } from '../utils/utils';
import { getAxisFocusColor, getAxisFocusOpacity } from '../utils/FocusValue';
import { NONE } from '../config/core/constants';

export default class AxisBaseLine extends PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    const { seriesAxisConfig, basePercentage, axisBaseLineClass } = this.props;
    const { base, baseLine } = seriesAxisConfig;
    if (base !== NONE && baseLine && basePercentage > 0 && basePercentage < 1) {
      const { plotConfig, axisLayoutInfo, seriesLayoutInfo, axisFocusPercentage, seriesFocusPercentage } = this.props;
      const { inverted } = plotConfig;

      const stroke = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, seriesAxisConfig.useSeriesFocus,
        seriesAxisConfig.baseLineColor, seriesAxisConfig.baseLineFocusedColor, seriesAxisConfig.baseLineDefocusedColor);
      const strokeOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, seriesAxisConfig.useSeriesFocus,
        seriesAxisConfig.baseLineOpacity, seriesAxisConfig.baseLineFocusedOpacity, seriesAxisConfig.baseLineDefocusedOpacity);
      const strokeWidth = seriesAxisConfig.baseLineWidth;
      const strokeDashArray = seriesAxisConfig.baseLineDashArray;

      const vertical = !inverted;

      let baseX = 0;
      let baseY = 0;
      if (vertical) {
        baseY = (1 - basePercentage) * seriesLayoutInfo.height;
      }
      else {
        baseX = basePercentage * seriesLayoutInfo.width;
      }

      return (
        <g className={axisBaseLineClass}>
          <g className={mochartCssClasses['axisBaseLine']} transform={translate(baseX, baseY)}>
            <line x1={seriesLayoutInfo.x} y1={seriesLayoutInfo.y}
              x2={vertical ? seriesLayoutInfo.x + seriesLayoutInfo.width : seriesLayoutInfo.x}
              y2={vertical ? seriesLayoutInfo.y : seriesLayoutInfo.y + seriesLayoutInfo.height}
              stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={strokeWidth}
              strokeDasharray={strokeDashArray} />
          </g>
        </g>
      );
    }
    return false;
  }
}
