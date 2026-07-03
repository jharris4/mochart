// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAxisFocusColor, getAxisFocusOpacity } from '../utils/FocusValue';

export default class AxisLine extends PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    const { axisConfig } = this.props;
    if (axisConfig.axisLine === true) {
      const { axisLayoutInfo, axisFocusPercentage, seriesFocusPercentage } = this.props;
      const { axisLineX1, axisLineY1, axisLineX2, axisLineY2 } = axisLayoutInfo;

      const stroke = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
        axisConfig.axisLineColor, axisConfig.axisLineFocusedColor, axisConfig.axisLineDefocusedColor);
      const strokeOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
        axisConfig.axisLineOpacity, axisConfig.axisLineFocusedOpacity, axisConfig.axisLineDefocusedOpacity);

      return (
        <g className={mochartCssClasses['axisLine']}>
          <line x1={axisLineX1} y1={axisLineY1} x2={axisLineX2} y2={axisLineY2}
                stroke={stroke} strokeOpacity={strokeOpacity} strokeWidth={axisConfig.axisLineWidth}
                strokeDasharray={axisConfig.axisLineDashArray}/>
        </g>)
      ;
    }
    return false;
  }
}
