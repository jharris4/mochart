// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAggregateSeriesFocusPercentage } from '../utils/FocusValue';

import AxisBaseLine from './AxisBaseLine';
import { NONE } from '../config/core/constants';

export default class AxisBaseContainer extends Renderer {
  root = svgEl('g');
  baseLines = this.rendererList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { front, mochartConfig, seriesLayoutInfo, focusData, seriesData } = this.props;
    const { plotConfig, seriesAxisConfigs } = mochartConfig;
    const { seriesAxisFocusPercentages, seriesFocusPercentages } = focusData;
    const { filtered, raw } = seriesData;
    const { axisDomains: filteredDomains } = filtered;
    const { axisDomains: rawDomains } = raw;

    this.root.set({ className: mochartCssClasses['axisBaseContainer'] });

    const items = [];
    for (const axisConfig of seriesAxisConfigs) {
      const { id, base, seriesConfigs, useSeriesFocus, adjustForSuppression, baseLineFront } = axisConfig;
      if (baseLineFront !== front) {
        continue;
      }
      const axisDomain = adjustForSuppression ? filteredDomains[id] : rawDomains[id];
      const axisFocusPercentage = seriesAxisFocusPercentages[id];
      const seriesFocusPercentage = useSeriesFocus ? getAggregateSeriesFocusPercentage(seriesConfigs, seriesFocusPercentages) : 0;
      const basePercentage = base !== NONE && axisDomain[0] !== axisDomain[1] && base > axisDomain[0] && base < axisDomain[1] ? (base - axisDomain[0]) / (axisDomain[1] - axisDomain[0]) : 0;

      items.push({
        key: 'series-axis-' + id,
        ctor: AxisBaseLine,
        props: { plotConfig, seriesAxisConfig: axisConfig,
          axisBaseLineClass: mochartCssClasses['seriesAxisBaseLine'] + id,
          axisFocusPercentage, seriesFocusPercentage,
          seriesLayoutInfo, basePercentage }
      });
    }
    this.baseLines.sync(items);
  }
}
