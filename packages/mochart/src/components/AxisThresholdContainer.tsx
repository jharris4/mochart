// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAggregateSeriesFocusPercentage } from '../utils/FocusValue';

import AxisThreshold from './AxisThreshold';

export default class AxisThresholdContainer extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { front, mochartConfig, groupAxisLayoutInfo, seriesAxisLayoutInfos, seriesLayoutInfo, chartData, focusData } = this.props;
    const { seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
    const { plotConfig, groupAxisConfig, seriesAxisConfigs } = mochartConfig;
    const { inverted } = plotConfig;
    const { thresholdFront } = groupAxisConfig;
    const { groupData, seriesData } = chartData;
    const groupAxisDomain = groupData.axisDomain;
    const { axisSeriesCounts } = seriesData;
    const seriesAxisRawDomains = seriesData.raw.axisDomains;
    const seriesAxisFilteredDomains = seriesData.filtered.axisDomains;

    return (
      <g className={mochartCssClasses['axisThresholdContainer']}>
        <AxisThreshold front={front} key="group-axis" plotConfig={plotConfig} axisConfig={groupAxisConfig} axisLayoutInfo={groupAxisLayoutInfo}
          hidden={false} seriesLayoutInfo={seriesLayoutInfo} axisDomain={groupAxisDomain} vertical={inverted}
          axisFocusPercentage={null} seriesFocusPercentage={null} axisThresholdClass={mochartCssClasses['groupAxisThreshold']}/>
        {seriesAxisConfigs.map(axisConfig => {
          const { id, seriesConfigs, useSeriesFocus, thresholdFront, adjustForSuppression } = axisConfig;
          const axisFocusPercentage = seriesAxisFocusPercentages[id];
          const seriesFocusPercentage = useSeriesFocus ? getAggregateSeriesFocusPercentage(seriesConfigs, seriesFocusPercentages) : 0;
          const seriesAxisDomain = adjustForSuppression ? seriesAxisFilteredDomains[id] : seriesAxisRawDomains[id];
          return (
            <AxisThreshold front={front} key={'series-axis-' + id} plotConfig={plotConfig} axisConfig={axisConfig} axisLayoutInfo={seriesAxisLayoutInfos[id]}
              hidden={axisSeriesCounts[id] === 0} seriesLayoutInfo={seriesLayoutInfo} axisDomain={seriesAxisDomain} vertical={!inverted}
              axisFocusPercentage={axisFocusPercentage} seriesFocusPercentage={seriesFocusPercentage} axisThresholdClass={mochartCssClasses['seriesAxisThreshold']+id}/>
          );
        }
        )}
      </g>
    );
  }
}
