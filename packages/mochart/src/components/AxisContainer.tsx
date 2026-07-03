// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAggregateSeriesFocusPercentage } from '../utils/FocusValue';

import GroupAxis from './GroupAxis';
import SeriesAxis from './SeriesAxis';

export default class AxisContainer extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { front, mochartConfig, groupAxisLayoutInfo, seriesAxisLayoutInfos, seriesLayoutInfo, plotLayoutInfo,
      seriesData, focusData, axisData, groupValueData, groupAxisTitleClipPathUniqueId,
      groupAxisTickLabelClipPathUniqueId, seriesAxisTitleClipPathUniqueIds, onFocus } = this.props;
    const { groupFocusDomainPercentages, seriesAxisComputedFocusDomainPercentages,
      seriesFocusDomainPercentages, seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
    const { group: groupAxisData, series: seriesAxisData } = axisData;

    const { groupAxisConfig, seriesAxisConfigs } = mochartConfig;

    return (
      <g className={mochartCssClasses['axisContainer']}>
        <GroupAxis front={front} key="group-axis" groupAxisConfig={groupAxisConfig} groupAxisLayoutInfo={groupAxisLayoutInfo}
          focusPercentages={groupFocusDomainPercentages} groupAxisData={groupAxisData} groupValueData={groupValueData}
          titleClipPathUniqueId={groupAxisTitleClipPathUniqueId}
          tickLabelClipPathUniqueId={groupAxisTickLabelClipPathUniqueId}
          plotLayoutInfo={plotLayoutInfo} />
        {seriesAxisConfigs.map(axisConfig => {
          const { id, seriesConfigs, useSeriesFocus } = axisConfig;
          const axisFocusPercentage = seriesAxisFocusPercentages[id];
          const seriesFocusPercentage = useSeriesFocus ? getAggregateSeriesFocusPercentage(seriesConfigs, seriesFocusPercentages) : null;
          return (
            <SeriesAxis front={front} key={'series-axis-' + id} seriesAxisConfig={axisConfig}
              seriesAxisLayoutInfo={seriesAxisLayoutInfos[id]} seriesCount={seriesData.axisSeriesCounts[id]}
              focusPercentages={seriesAxisComputedFocusDomainPercentages[id]} seriesAxisData={seriesAxisData}
              axisFocusPercentage={axisFocusPercentage} seriesFocusPercentage={seriesFocusPercentage}
              titleClipPathUniqueId={seriesAxisTitleClipPathUniqueIds[id]}
              plotLayoutInfo={plotLayoutInfo} onFocus={onFocus} />
          );
        }
        )}
      </g>
    );
  }
}
