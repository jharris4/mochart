// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { getSeriesConfigsOrderedByFocus } from '../data/FocusData';
import { mochartCssClasses } from '../utils/ChartDom';

import SeriesBackground from './SeriesBackground';
import Series from './Series';

export default class SeriesContainer extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { mochartConfig, seriesLayoutInfo, seriesData, seriesAxisData, stackData, focusData, groupValueData, gradientIdMap, onFocus, shapeRef } = this.props;

    const { groupAxisConfig, seriesConfigs, seriesConfigIndicesById, colorPaletteConfig } = mochartConfig;

    const { raw, filtered } = seriesData;
    const { values: rawValues, domains: rawDomains, axisDomains: rawSeriesAxisDomains } = raw;
    const { values: filteredValues } = filtered;

    let orderedSeriesConfigs = getSeriesConfigsOrderedByFocus(mochartConfig, focusData);

    return (
      <g className={mochartCssClasses['seriesContainer']}>
        <SeriesBackground seriesLayoutInfo={seriesLayoutInfo} shapeRef={shapeRef}/>
        {orderedSeriesConfigs.map(seriesConfig => {
          const { id, axis } = seriesConfig;
          const index = seriesConfigIndicesById[seriesConfig.id];

          return (
            <Series key={'series-' + id} groupAxisConfig={groupAxisConfig} colorPaletteConfig={colorPaletteConfig}
                    seriesConfig={seriesConfig} seriesIndex={index} stackData={stackData}
                    seriesLayoutInfo={seriesLayoutInfo} focusData={focusData} groupValueData={groupValueData}
                    seriesAxisScale={seriesAxisData.axisScales[axis]}
                    rawSeriesAxisDomain={rawSeriesAxisDomains[axis]} rawDomains={rawDomains[id]}
                    rawValues={rawValues[id]} filteredValues={filteredValues[id]}
                    gradientIdMap={gradientIdMap} onFocus={onFocus}/>
          );
        })}
      </g>
    );
  }
}
