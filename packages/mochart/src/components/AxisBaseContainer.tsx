// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAggregateSeriesFocusPercentage } from '../utils/FocusValue';

import AxisBaseLine from './AxisBaseLine';
import { NONE } from '../config/core/constants';

export default class AxisBaseContainer extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { front, mochartConfig, seriesLayoutInfo, focusData, seriesData } = this.props;
    const { plotConfig, groupAxisConfig, seriesAxisConfigs } = mochartConfig;
    const { seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
    const { filtered, raw } = seriesData;
    const { axisDomains: filteredDomains } = filtered;
    const { axisDomains: rawDomains } = raw;

    return (
      <g className={mochartCssClasses['axisBaseContainer']}>
        {seriesAxisConfigs.map(axisConfig => {
          const { id, base, seriesConfigs, useSeriesFocus, adjustForSuppression, baseLineFront } = axisConfig;
          const axisDomain = adjustForSuppression ? filteredDomains[id] : rawDomains[id];
          const axisFocusPercentage = seriesAxisFocusPercentages[id];
          const seriesFocusPercentage = useSeriesFocus ? getAggregateSeriesFocusPercentage(seriesConfigs, seriesFocusPercentages) : 0;
          const basePercentage = base !== NONE && axisDomain[0] !== axisDomain[1] && base > axisDomain[0] && base < axisDomain[1] ? (base - axisDomain[0]) / (axisDomain[1] - axisDomain[0]) : 0;

          return baseLineFront !== front ? false : (
            <AxisBaseLine key={'series-axis-' + id} plotConfig={plotConfig} seriesAxisConfig={axisConfig}
                          axisBaseLineClass={mochartCssClasses['seriesAxisBaseLine'] + id}
                          axisFocusPercentage={axisFocusPercentage} seriesFocusPercentage={seriesFocusPercentage}
                          seriesLayoutInfo={seriesLayoutInfo} basePercentage={basePercentage}/>
          );
        }
        )}
      </g>
    );
  }
}
