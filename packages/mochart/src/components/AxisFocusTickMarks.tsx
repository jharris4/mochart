// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { translate } from '../utils/utils';

export default class AxisFocusTickMarks extends PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    const { axisConfig } = this.props;
    if (axisConfig.focusTickMarks) {
      const { axisLayoutInfo, focusPercentages } = this.props;
      const { vertical, focusTickMarkX1, focusTickMarkY1, focusTickMarkX2, focusTickMarkY2 } = axisLayoutInfo;

      let tickX = 0;
      let tickY = 0;

      return (
        <g className={mochartCssClasses['axisFocusTickMarks']}>
          {focusPercentages.map((focusPercentage, i) => {
            if (vertical) {
              tickY = focusPercentage * axisLayoutInfo.height;
            }
            else {
              tickX = focusPercentage * axisLayoutInfo.width
            }
            return (
              <g key={'focus-tick-mark-' + i} className={mochartCssClasses['axisFocusTickMark']+i}
                 transform={translate(tickX, tickY)}>
                <line x1={focusTickMarkX1} y1={focusTickMarkY1} x2={focusTickMarkX2} y2={focusTickMarkY2}
                      stroke={axisConfig.focusTickMarkColor} strokeOpacity={axisConfig.focusTickMarkOpacity} strokeWidth={axisConfig.focusTickMarkWidth}/>
              </g>
            );
          })}
        </g>
      );
    }
    return false;
  }
}
