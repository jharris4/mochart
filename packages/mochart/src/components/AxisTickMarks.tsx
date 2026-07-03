// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { translate } from '../utils/utils';
import { getAxisFocusColor, getAxisFocusOpacity } from '../utils/FocusValue';

export default class AxisTickMarks extends PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    const { axisConfig } = this.props;
    if (axisConfig.tickMarks) {
      const { axisLayoutInfo, axisTicks, axisFocusPercentage, seriesFocusPercentage } = this.props;
      const { vertical, tickMarkX1, tickMarkY1, tickMarkX2, tickMarkY2 } = axisLayoutInfo;

      let tickX = 0;
      let tickY = 0;

      const hiddenStyle = {
        visibility: 'hidden'
      };

      const stroke = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
        axisConfig.tickMarkColor, axisConfig.tickMarkFocusedColor, axisConfig.tickMarkDefocusedColor);
      const strokeOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
        axisConfig.tickMarkOpacity, axisConfig.tickMarkFocusedOpacity, axisConfig.tickMarkDefocusedOpacity);
      const strokeWidth = axisConfig.tickMarkWidth;

      return (
        <g className={mochartCssClasses['axisTickMarks']}>
          {axisTicks.map((tick, i) => {
            if (vertical) {
              tickY = tick.position;
            }
            else {
              tickX = tick.position;
            }
            return (
              <g key={'tick-mark-' + i} className={mochartCssClasses['axisTickMark']+i}
                 transform={translate(tickX, tickY)}>
                <line x1={tickMarkX1} y1={tickMarkY1} x2={tickMarkX2} y2={tickMarkY2} style={tick.hidden ? hiddenStyle : null}
                  stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={strokeWidth}/>
              </g>
            );
          })}
        </g>
      );
    }
    return false;
  }
}
