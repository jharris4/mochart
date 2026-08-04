import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAggregateSeriesFocusPercentage } from '../utils/FocusValue';

import AxisBaseLine from './AxisBaseLine';
import { NONE } from '../config/core/constants';
import type { MochartConfig } from '../types/config';
import type { SeriesData } from '../types/data';
import type { FocusData } from '../types/animation';
import type { LayoutInfo } from '../types/layout';

interface AxisBaseContainerProps {
  front: boolean;
  mochartConfig: MochartConfig;
  seriesLayoutInfo: LayoutInfo;
  focusData: FocusData;
  seriesData: SeriesData;
}

export default class AxisBaseContainer extends Renderer<AxisBaseContainerProps> {
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
      const { id, base, seriesConfigs, useSeriesFocus, adjustForFiltering, baseLineFront } = axisConfig;
      if (baseLineFront !== front) {
        continue;
      }
      const axisDomain = adjustForFiltering ? filteredDomains[id] : rawDomains[id];
      const axisFocusPercentage = seriesAxisFocusPercentages[id];
      const seriesFocusPercentage = useSeriesFocus ? getAggregateSeriesFocusPercentage(seriesConfigs ?? [], seriesFocusPercentages) : 0;
      const domainMin = axisDomain[0];
      const domainMax = axisDomain[1];
      const basePercentage = base !== NONE && domainMin !== null && domainMax !== null && domainMin !== domainMax && base > domainMin && base < domainMax ? (base - domainMin) / (domainMax - domainMin) : 0;

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
