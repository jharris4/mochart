// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAggregateSeriesFocusPercentage } from '../utils/FocusValue';

import GroupAxis from './GroupAxis';
import SeriesAxis from './SeriesAxis';

export default class AxisContainer extends Renderer {
  root = svgEl('g');
  groupAxis = this.slot(this.root);
  seriesAxes = this.rendererList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { front, mochartConfig, groupAxisLayoutInfo, seriesAxisLayoutInfos, plotLayoutInfo,
      seriesData, focusData, axisData, groupValueData, groupAxisTitleClipPathUniqueId,
      groupAxisTickLabelClipPathUniqueId, seriesAxisTitleClipPathUniqueIds, onFocus } = this.props;
    const { groupFocusDomainPercentages, seriesAxisComputedFocusDomainPercentages,
      seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
    const { group: groupAxisData, series: seriesAxisData } = axisData;

    const { groupAxisConfig, seriesAxisConfigs } = mochartConfig;

    this.root.set({ className: mochartCssClasses['axisContainer'] });

    this.groupAxis.set(GroupAxis, { front, groupAxisConfig, groupAxisLayoutInfo,
      focusPercentages: groupFocusDomainPercentages, groupAxisData, groupValueData,
      titleClipPathUniqueId: groupAxisTitleClipPathUniqueId,
      tickLabelClipPathUniqueId: groupAxisTickLabelClipPathUniqueId,
      plotLayoutInfo });

    this.seriesAxes.sync(seriesAxisConfigs.map(axisConfig => {
      const { id, seriesConfigs, useSeriesFocus } = axisConfig;
      const axisFocusPercentage = seriesAxisFocusPercentages[id];
      const seriesFocusPercentage = useSeriesFocus ? getAggregateSeriesFocusPercentage(seriesConfigs, seriesFocusPercentages) : null;
      return {
        key: 'series-axis-' + id,
        ctor: SeriesAxis,
        props: { front, seriesAxisConfig: axisConfig,
          seriesAxisLayoutInfo: seriesAxisLayoutInfos[id], seriesCount: seriesData.axisSeriesCounts[id],
          focusPercentages: seriesAxisComputedFocusDomainPercentages[id], seriesAxisData,
          axisFocusPercentage, seriesFocusPercentage,
          titleClipPathUniqueId: seriesAxisTitleClipPathUniqueIds[id],
          plotLayoutInfo, onFocus }
      };
    }));
  }
}
