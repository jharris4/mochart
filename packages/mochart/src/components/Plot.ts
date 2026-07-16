// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

import Background from './Background';
import AxisGridContainer from './AxisGridContainer';
import AxisBaseContainer from './AxisBaseContainer';
import AxisContainer from './AxisContainer';
import AxisThresholdContainer from './AxisThresholdContainer';
import SeriesContainer from './SeriesContainer';
import Crosshair from './Crosshair';

class PlotFrontBack extends Renderer {
  root = svgEl('g');
  gridContainer = this.slot(this.root);
  baseContainer = this.slot(this.root);
  axisContainer = this.slot(this.root);
  thresholdContainer = this.slot(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { front, mochartConfig, groupAxisLayoutInfo, seriesAxisLayoutInfos, seriesLayoutInfo, plotLayoutInfo,
      chartData, focusData, axisData, groupValueData, groupAxisTitleClipPathUniqueId,
      groupAxisTickLabelClipPathUniqueId, seriesAxisTitleClipPathUniqueIds, onFocus } = this.props;
    const { seriesData } = chartData;

    this.root.set({ className: mochartCssClasses[front ? 'plotFront' : 'plotBack'] });

    this.gridContainer.set(AxisGridContainer, { front, mochartConfig, seriesLayoutInfo,
      seriesData, focusData, axisData });

    this.baseContainer.set(AxisBaseContainer, { front, mochartConfig, seriesLayoutInfo,
      seriesData, focusData, axisData });

    this.axisContainer.set(AxisContainer, { front, mochartConfig, groupAxisLayoutInfo, seriesAxisLayoutInfos,
      seriesLayoutInfo, plotLayoutInfo, seriesData, focusData, axisData, groupValueData,
      groupAxisTitleClipPathUniqueId, groupAxisTickLabelClipPathUniqueId,
      seriesAxisTitleClipPathUniqueIds, onFocus });

    this.thresholdContainer.set(AxisThresholdContainer, { front, mochartConfig, groupAxisLayoutInfo, seriesAxisLayoutInfos,
      seriesLayoutInfo, chartData, focusData });
  }
}

export default class Plot extends Renderer {
  root = svgEl('g');
  background = this.slot(this.root);
  back = this.slot(this.root);
  seriesContainer = this.slot(this.root);
  front = this.slot(this.root);
  crosshair = this.slot(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { mochartConfig, groupAxisLayoutInfo, seriesAxisLayoutInfos, seriesLayoutInfo, plotLayoutInfo,
      chartData, focusData, axisData, stackData, groupValueData, gradientIdMap, groupAxisTitleClipPathUniqueId,
      groupAxisTickLabelClipPathUniqueId, seriesAxisTitleClipPathUniqueIds, tooltipClipPathUniqueId, onFocus, shapeRef } = this.props;
    const { plotConfig } = mochartConfig;
    const { groupFocusDomainPercentages, seriesFocusDomainPercentages } = focusData;
    const { series: seriesAxisData } = axisData;

    const frontBackProps = (front) => ({
      front,
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
    });

    // TODO - consider adding front/back support for the plot background
    this.root.set({ className: mochartCssClasses['plot'] });

    this.background.set(Background, { config: plotConfig, classKey: 'plotBackground', spacingRelative: false, spacingLayoutInfo: plotLayoutInfo });

    this.back.set(PlotFrontBack, frontBackProps(false));

    this.seriesContainer.set(SeriesContainer, { mochartConfig, seriesLayoutInfo, seriesData: chartData.seriesData,
      seriesAxisData, stackData, focusData, onFocus, groupValueData,
      gradientIdMap, shapeRef });

    this.front.set(PlotFrontBack, frontBackProps(true));

    this.crosshair.set(Crosshair, { mochartConfig, seriesLayoutInfo,
      groupPercentages: groupFocusDomainPercentages, seriesPercentages: seriesFocusDomainPercentages,
      tooltipClipPathUniqueId });
  }
}
