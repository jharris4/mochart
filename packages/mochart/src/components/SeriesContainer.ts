// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import { getSeriesConfigsOrderedByFocus } from '../data/FocusData';
import { mochartCssClasses } from '../utils/ChartDom';

import SeriesBackground from './SeriesBackground';
import Series from './Series';

export default class SeriesContainer extends Renderer {
  root = svgEl('g');
  background = this.slot(this.root);
  series = this.rendererList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { mochartConfig, seriesLayoutInfo, seriesData, seriesAxisData, stackData, focusData, groupValueData, gradientIdMap, onFocus, shapeRef } = this.props;

    const { groupAxisConfig, seriesConfigIndicesById, colorPaletteConfig } = mochartConfig;

    const { raw, filtered } = seriesData;
    const { values: rawValues, domains: rawDomains, axisDomains: rawSeriesAxisDomains } = raw;
    const { values: filteredValues } = filtered;

    let orderedSeriesConfigs = getSeriesConfigsOrderedByFocus(mochartConfig, focusData);

    this.root.set({ className: mochartCssClasses['seriesContainer'] });
    this.background.set(SeriesBackground, { seriesLayoutInfo, shapeRef });

    this.series.sync(orderedSeriesConfigs.map(seriesConfig => {
      const { id, axis } = seriesConfig;
      const index = seriesConfigIndicesById[seriesConfig.id];

      return {
        key: 'series-' + id,
        ctor: Series,
        props: { groupAxisConfig, colorPaletteConfig,
          seriesConfig, seriesIndex: index, stackData,
          seriesLayoutInfo, focusData, groupValueData,
          seriesAxisScale: seriesAxisData.axisScales[axis],
          rawSeriesAxisDomain: rawSeriesAxisDomains[axis], rawDomains: rawDomains[id],
          rawValues: rawValues[id], filteredValues: filteredValues[id],
          gradientIdMap, onFocus }
      };
    }));
  }
}
