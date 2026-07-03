// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { translate } from '../utils/utils';

export default class AxisThresholdRange extends PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    const { axisConfig } = this.props;
    if (axisConfig.focusRange) {
      const { axisLayoutInfo, focusPercentages } = this.props;
      let focusRange = false;
      const { length } = focusPercentages;
      if (length === 1 || length === 2) {
        const { focusRangeApplyToTitle, focusRangeStrokeColor, focusRangeFillColor, focusRangeStrokeOpacity, focusRangeFillOpacity, focusRangeStrokeWidth, focusRangeDashArray} = axisConfig;
        const { vertical, focusRangeLayoutInfo } = axisLayoutInfo;
        let { x, y, width, height } = focusRangeLayoutInfo;
        if (length === 1) {
          const focusPercentage = focusPercentages[0];
          if (vertical) {
            y+= focusPercentage * height - 1;
            height = 2;
          }
          else {
            x+= focusPercentage * width - 1;
            width = 2;
          }
        }
        else {
          const focusPercentageMin = Math.min(focusPercentages[0], focusPercentages[1]);
          const focusPercentageMax = Math.max(focusPercentages[0], focusPercentages[1]);
          if (vertical) {
            y+= focusPercentageMin * height;
            height = (focusPercentageMax - focusPercentageMin) * height;
          }
          else {
            x+= focusPercentageMin * width;
            width = (focusPercentageMax - focusPercentageMin) * width;
          }
        }
        focusRange = (
          <rect x={x} y={y} width={width} height={height}
                stroke={focusRangeStrokeColor} strokeOpacity={focusRangeStrokeOpacity}
                fill={focusRangeFillColor} fillOpacity={focusRangeFillOpacity}
                strokeWidth={focusRangeStrokeWidth} strokeDasharray={focusRangeDashArray}/>
        );
      }

      return (
        <g className={mochartCssClasses['axisFocusRange']}>
          {focusRange}
        </g>
      );
    }
    return false;
  }
}
