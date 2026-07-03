// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';

import Axis from './Axis';

const emptyFocusPercentages = [];
const emptyTicks = [];

export default class PlotEmpty extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { mochartConfig, groupAxisLayoutInfo, seriesAxisLayoutInfos, plotLayoutInfo,
      groupAxisTitleClipPathUniqueId, groupAxisTickLabelClipPathUniqueId, seriesAxisTitleClipPathUniqueIds } = this.props;
    const { groupAxisConfig, seriesAxisConfigs } = mochartConfig;

    const commonProps = {
      plotLayoutInfo,
      focusPercentages: emptyFocusPercentages,
      tickSpacing: null,
      axisTicks: emptyTicks
    };

    return (
      <g className={mochartCssClasses['plot']}>
        <Axis front={false} axisClass={mochartCssClasses['groupAxis']} axisConfig={groupAxisConfig} axisLayoutInfo={groupAxisLayoutInfo}
              titleClipPathUniqueId={groupAxisTitleClipPathUniqueId} tickLabelClipPathUniqueId={groupAxisTickLabelClipPathUniqueId}
              {...commonProps}/>
        {seriesAxisConfigs.map(axisConfig => {
            const { id } = axisConfig;
            return (
              <Axis front={false} key={'series-axis-' + id} axisClass={mochartCssClasses['seriesAxis'] + id} axisConfig={axisConfig}
                    axisLayoutInfo={seriesAxisLayoutInfos[id]} titleClipPathUniqueId={seriesAxisTitleClipPathUniqueIds[id]}
                    {...commonProps}/>
            );
          }
        )}
      </g>
    );
  }
}