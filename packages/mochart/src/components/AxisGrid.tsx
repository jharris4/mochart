// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { translate } from '../utils/utils';
import { getAxisFocusColor, getAxisFocusOpacity } from '../utils/FocusValue';

export default class AxisGrid extends PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    const { vertical, axisConfig, seriesLayoutInfo, axisFocusPercentage, seriesFocusPercentage, axisGridClass, axisTicks } = this.props;
    if (axisConfig.visible && axisConfig.gridLines) {
      let tickX = 0;
      let tickY = 0;
      const hiddenStyle = {
        visibility: 'hidden'
      };

      const stroke = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
        axisConfig.gridLineColor, axisConfig.gridLineFocusedColor, axisConfig.gridLineDefocusedColor);
      const strokeOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
        axisConfig.gridLineOpacity, axisConfig.gridLineFocusedOpacity, axisConfig.gridLineDefocusedOpacity);
      const strokeWidth = axisConfig.gridLineWidth;
      const strokeDashArray = axisConfig.gridLineDashArray;

      return (
        <g className={axisGridClass}>
          {axisTicks.map((tick, i) => {
            if (vertical) {
              tickY = tick.position;
            }
            else {
              tickX = tick.position;
            }
            return (
              <g key={'gridLine-' + i} className={mochartCssClasses['axisGridLine']+i} transform={translate(tickX, tickY)}>
                <line x1={seriesLayoutInfo.x} y1={seriesLayoutInfo.y} style={tick.hidden ? hiddenStyle : null}
                      x2={vertical ? seriesLayoutInfo.x + seriesLayoutInfo.width : seriesLayoutInfo.x}
                      y2={vertical ? seriesLayoutInfo.y : seriesLayoutInfo.y + seriesLayoutInfo.height}
                      stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={strokeWidth}
                      strokeDasharray={strokeDashArray}/>
              </g>);
          })}
        </g>
      );
    }
    return false;
  }
}
