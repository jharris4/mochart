// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAggregateSeriesFocusPercentage } from '../utils/FocusValue';

import GroupAxisGrid from './GroupAxisGrid';
import SeriesAxisGrid from './SeriesAxisGrid';

export default class AxisGridContainer extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { front, mochartConfig, seriesLayoutInfo, seriesData, focusData, axisData } = this.props;
    const { seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
    const { group: groupAxisData, series: seriesAxisData } = axisData;
    const { plotConfig, groupAxisConfig, seriesAxisConfigs } = mochartConfig;
    const { gridLinesFront } = groupAxisConfig;

    return (
      <g className={mochartCssClasses['axisGridContainer']}>
        {gridLinesFront !== front ? false : (
          <GroupAxisGrid key="group-axis" plotConfig={plotConfig} groupAxisConfig={groupAxisConfig}
            seriesLayoutInfo={seriesLayoutInfo} groupAxisData={groupAxisData}/>
        )}
        {seriesAxisConfigs.map(axisConfig => {
          const { id, seriesConfigs, useSeriesFocus, gridLinesFront } = axisConfig;
          const axisFocusPercentage = seriesAxisFocusPercentages[id];
          const seriesFocusPercentage = useSeriesFocus ? getAggregateSeriesFocusPercentage(seriesConfigs, seriesFocusPercentages) : 0;
          return gridLinesFront !== front ? false : (
            <SeriesAxisGrid key={'series-axis-' + id} plotConfig={plotConfig} seriesAxisConfig={axisConfig}
                            seriesCount={seriesData.axisSeriesCounts[id]}
                            axisFocusPercentage={axisFocusPercentage} seriesFocusPercentage={seriesFocusPercentage}
                            seriesLayoutInfo={seriesLayoutInfo} seriesAxisData={seriesAxisData}/>
          );
        }
        )}
      </g>
    );
  }
}
