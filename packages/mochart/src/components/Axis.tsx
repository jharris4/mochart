// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import AxisBackground from './AxisBackground';
import AxisLine from './AxisLine';
import AxisTitle from './AxisTitle';
import AxisTickMarks from './AxisTickMarks';
import AxisTickLabels from './AxisTickLabels';
import AxisFocusTickMarks from './AxisFocusTickMarks';
import AxisFocusRange from './AxisFocusRange';

import { AUTO, NONE } from '../config/core/constants';
import { translateObject } from '../utils/utils';

export default class Axis extends PureComponent {

  static defaultProps = {
    onMouseEnter: null,
    onMouseLeave: null,
    onClick: null
  };

  constructor(props) {
    super(props);
  }

  render() {
    const { front, axisConfig, axisLayoutInfo, plotLayoutInfo, axisClass, axisTicks, axisFocusPercentage, seriesFocusPercentage,
      focusPercentages, tickSpacing, titleClipPathUniqueId, tickLabelClipPathUniqueId,
      onMouseEnter, onMouseLeave, onClick } = this.props;
    if (axisConfig.visible) {
      const { backgroundFront, axisLineFront, focusRangeFront, focusTickMarksFront, tickLabelFront, tickMarkFront, titleFront } = axisConfig;
      return (
        <g className={axisClass}>
          <g transform={translateObject(axisLayoutInfo)} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={onClick}>
            {front !== backgroundFront ? false : (
              <AxisBackground axisConfig={axisConfig} axisLayoutInfo={axisLayoutInfo}/>
            )}
            {front !== axisLineFront ? false : (
              <AxisLine axisConfig={axisConfig} axisLayoutInfo={axisLayoutInfo}
                axisFocusPercentage={axisFocusPercentage} seriesFocusPercentage={seriesFocusPercentage} />
            )}
            {front !== focusRangeFront ? false : (
              <AxisFocusRange axisConfig={axisConfig} axisLayoutInfo={axisLayoutInfo} focusPercentages={focusPercentages} />
            )}
            {front !== tickMarkFront ? false : (
              <AxisTickMarks axisConfig={axisConfig} axisLayoutInfo={axisLayoutInfo} axisTicks={axisTicks}
                axisFocusPercentage={axisFocusPercentage} seriesFocusPercentage={seriesFocusPercentage} />
            )}
            {front !== tickLabelFront ? false : (
              <AxisTickLabels axisLayoutInfo={axisLayoutInfo} plotLayoutInfo={plotLayoutInfo}
                axisFocusPercentage={axisFocusPercentage} seriesFocusPercentage={seriesFocusPercentage}
                axisConfig={axisConfig} axisTicks={axisTicks}
                tickSpacing={tickSpacing} tickLabelClipPathUniqueId={tickLabelClipPathUniqueId} />
            )}
            {front !== titleFront ? false : (
              <AxisTitle axisConfig={axisConfig} axisLayoutInfo={axisLayoutInfo} titleClipPathUniqueId={titleClipPathUniqueId}
                axisFocusPercentage={axisFocusPercentage} seriesFocusPercentage={seriesFocusPercentage} />
            )}
            {front !== focusTickMarksFront ? false : (
              <AxisFocusTickMarks axisConfig={axisConfig} axisLayoutInfo={axisLayoutInfo} focusPercentages={focusPercentages} />
            )}
          </g>
        </g>
      );
    }
    return false;
  }
}
