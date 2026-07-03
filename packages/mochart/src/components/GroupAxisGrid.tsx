// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';

import AxisGrid from './AxisGrid';

export default class GroupAxisGrid extends PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    const { plotConfig, groupAxisConfig, seriesLayoutInfo, groupAxisData } = this.props;

    return (
      <AxisGrid vertical={plotConfig.inverted} axisConfig={groupAxisConfig} seriesLayoutInfo={seriesLayoutInfo}
                axisGridClass={mochartCssClasses['groupAxisGrid']} axisTicks={groupAxisData.axisTickData}/>
    );
  }
}
