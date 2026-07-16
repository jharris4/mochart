// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAggregateSeriesFocusPercentage } from '../utils/FocusValue';

import GroupAxisGrid from './GroupAxisGrid';
import SeriesAxisGrid from './SeriesAxisGrid';

export default class AxisGridContainer extends Renderer {
  root = svgEl('g');
  groupGrid = this.slot(this.root);
  seriesGrids = this.rendererList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { front, mochartConfig, seriesLayoutInfo, seriesData, focusData, axisData } = this.props;
    const { seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
    const { group: groupAxisData, series: seriesAxisData } = axisData;
    const { plotConfig, groupAxisConfig, seriesAxisConfigs } = mochartConfig;
    const { gridLinesFront } = groupAxisConfig;

    this.root.set({ className: mochartCssClasses['axisGridContainer'] });

    if (gridLinesFront !== front) {
      this.groupGrid.set(null);
    }
    else {
      this.groupGrid.set(GroupAxisGrid, { plotConfig, groupAxisConfig, seriesLayoutInfo, groupAxisData });
    }

    const items = [];
    for (const axisConfig of seriesAxisConfigs) {
      const { id, seriesConfigs, useSeriesFocus, gridLinesFront } = axisConfig;
      if (gridLinesFront !== front) {
        continue;
      }
      const axisFocusPercentage = seriesAxisFocusPercentages[id];
      const seriesFocusPercentage = useSeriesFocus ? getAggregateSeriesFocusPercentage(seriesConfigs, seriesFocusPercentages) : 0;
      items.push({
        key: 'series-axis-' + id,
        ctor: SeriesAxisGrid,
        props: { plotConfig, seriesAxisConfig: axisConfig,
          seriesCount: seriesData.axisSeriesCounts[id],
          axisFocusPercentage, seriesFocusPercentage,
          seriesLayoutInfo, seriesAxisData }
      });
    }
    this.seriesGrids.sync(items);
  }
}
