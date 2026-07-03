// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';

import Axis from './Axis';

export default class GroupAxis extends PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    const { front, groupAxisConfig, groupAxisLayoutInfo, plotLayoutInfo, focusPercentages,
      groupAxisData, groupValueData, titleClipPathUniqueId, tickLabelClipPathUniqueId } = this.props;

    return (
      <Axis front={front} axisClass={mochartCssClasses['groupAxis']} axisConfig={groupAxisConfig} axisLayoutInfo={groupAxisLayoutInfo}
            plotLayoutInfo={plotLayoutInfo} axisTicks={groupAxisData.axisTickData}
            focusPercentages={focusPercentages} tickSpacing={groupAxisData.maxTickLabelLength}
            titleClipPathUniqueId={titleClipPathUniqueId} tickLabelClipPathUniqueId={tickLabelClipPathUniqueId}/>
    );
  }
}
