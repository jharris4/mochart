// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import Background from './Background';

export default class AxisBackground extends PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    const { axisConfig, axisLayoutInfo } = this.props;
    return (
      <g>
        <Background config={axisConfig} classKey='axisBackground' spacingRelative={true} spacingLayoutInfo={axisLayoutInfo} />
      </g>
    );
  }
}
