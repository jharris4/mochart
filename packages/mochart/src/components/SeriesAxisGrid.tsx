// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';

import AxisGrid from './AxisGrid';

export default class SeriesAxisGrid extends PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    const { plotConfig, seriesAxisConfig, seriesLayoutInfo, axisFocusPercentage, seriesFocusPercentage, seriesCount, seriesAxisData } = this.props;
    if (seriesAxisConfig.alwaysVisible || seriesCount > 0) {
      const axisId = seriesAxisConfig.id;
      return (
        <AxisGrid vertical={!plotConfig.inverted} axisConfig={seriesAxisConfig} seriesLayoutInfo={seriesLayoutInfo}
                  axisGridClass={mochartCssClasses['seriesAxisGrid'] + axisId}
                  axisFocusPercentage={axisFocusPercentage} seriesFocusPercentage={seriesFocusPercentage}
                  axisTicks={seriesAxisData.axisTickData[axisId]}/>
      );
    }
    return false;
  }
}
