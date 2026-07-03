// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAggregateSeriesFocusPercentage } from '../utils/FocusValue';

import Background from './Background';
import AxisGridContainer from './AxisGridContainer';
import AxisBaseContainer from './AxisBaseContainer';
import AxisContainer from './AxisContainer';
import AxisThresholdContainer from './AxisThresholdContainer';
import SeriesContainer from './SeriesContainer';
import Crosshair from './Crosshair';

export default class Plot extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { mochartConfig, groupAxisLayoutInfo, seriesAxisLayoutInfos, seriesLayoutInfo, plotLayoutInfo,
      chartData, focusData, axisData, stackData, groupValueData, gradientIdMap, groupAxisTitleClipPathUniqueId,
      groupAxisTickLabelClipPathUniqueId, seriesAxisTitleClipPathUniqueIds, tooltipClipPathUniqueId, onFocus, shapeRef } = this.props;
    const { plotConfig } = mochartConfig;
    const { groupFocusDomainPercentages, seriesFocusDomainPercentages } = focusData;
    const { series: seriesAxisData } = axisData;

    const frontBackProps = {
      mochartConfig,
      groupAxisLayoutInfo,
      seriesAxisLayoutInfos,
      seriesLayoutInfo,
      plotLayoutInfo,
      chartData,
      focusData,
      axisData,
      groupValueData,
      groupAxisTitleClipPathUniqueId,
      groupAxisTickLabelClipPathUniqueId,
      seriesAxisTitleClipPathUniqueIds,
      onFocus
    };

    // TODO - consider adding front/back support for the plot background
    return (
      <g className={mochartCssClasses['plot']}>
        <Background config={plotConfig} classKey='plotBackground' spacingRelative={false} spacingLayoutInfo={plotLayoutInfo} />

        <PlotFrontBack front={false} {...frontBackProps}/>

        <SeriesContainer mochartConfig={mochartConfig} seriesLayoutInfo={seriesLayoutInfo} seriesData={chartData.seriesData}
          seriesAxisData={seriesAxisData} stackData={stackData} focusData={focusData} onFocus={onFocus} groupValueData={groupValueData}
          gradientIdMap={gradientIdMap} shapeRef={shapeRef} />

        <PlotFrontBack front={true} {...frontBackProps}/>

        <Crosshair mochartConfig={mochartConfig} seriesLayoutInfo={seriesLayoutInfo}
                   groupPercentages={groupFocusDomainPercentages} seriesPercentages={seriesFocusDomainPercentages}
                   tooltipClipPathUniqueId={tooltipClipPathUniqueId} />
      </g>
    );
  }
}

class PlotFrontBack extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { front, mochartConfig, groupAxisLayoutInfo, seriesAxisLayoutInfos, seriesLayoutInfo, plotLayoutInfo,
      chartData, focusData, axisData, groupValueData, groupAxisTitleClipPathUniqueId,
      groupAxisTickLabelClipPathUniqueId, seriesAxisTitleClipPathUniqueIds, onFocus } = this.props;
    const { seriesData } = chartData;

    return (
      <g className={mochartCssClasses[front ? 'plotFront' : 'plotBack']}>
        <AxisGridContainer front={front} mochartConfig={mochartConfig} seriesLayoutInfo={seriesLayoutInfo}
          seriesData={seriesData} focusData={focusData} axisData={axisData} />

        <AxisBaseContainer front={front} mochartConfig={mochartConfig} seriesLayoutInfo={seriesLayoutInfo}
          seriesData={seriesData} focusData={focusData} axisData={axisData} />

        <AxisContainer front={front} mochartConfig={mochartConfig} groupAxisLayoutInfo={groupAxisLayoutInfo} seriesAxisLayoutInfos={seriesAxisLayoutInfos}
          seriesLayoutInfo={seriesLayoutInfo} plotLayoutInfo={plotLayoutInfo} seriesData={seriesData} focusData={focusData} axisData={axisData} groupValueData={groupValueData}
          groupAxisTitleClipPathUniqueId={groupAxisTitleClipPathUniqueId} groupAxisTickLabelClipPathUniqueId={groupAxisTickLabelClipPathUniqueId}
          seriesAxisTitleClipPathUniqueIds={seriesAxisTitleClipPathUniqueIds} onFocus={onFocus}/>

        <AxisThresholdContainer front={front} mochartConfig={mochartConfig} groupAxisLayoutInfo={groupAxisLayoutInfo} seriesAxisLayoutInfos={seriesAxisLayoutInfos}
          seriesLayoutInfo={seriesLayoutInfo} chartData={chartData} focusData={focusData}/>
      </g>
    );
  }
}