import { Renderer, svgEl } from '../render';

import { getSeriesConfigsOrderedByFocus } from '../data/FocusData';
import { mochartCssClasses } from '../utils/ChartDom';

import SeriesBackground from './SeriesBackground';
import Series from './Series';
import type { MochartConfig } from '../types/config';
import type { GroupAxisData, SeriesAxisData, SeriesData, StackData } from '../types/data';
import type { FocusData } from '../types/animation';
import type { LayoutInfo } from '../types/layout';

interface SeriesContainerProps {
  mochartConfig: MochartConfig;
  seriesLayoutInfo: LayoutInfo;
  seriesData: SeriesData;
  seriesAxisData: SeriesAxisData;
  stackData: StackData;
  focusData: FocusData;
  groupValueData: GroupAxisData['valueData'];
  gradientIdMap: Record<string, string>;
  onFocus: (focus: { seriesId?: string | null; groupIndex?: number | null }) => void;
  shapeRef: (element: Element | null) => void;
}

export default class SeriesContainer extends Renderer<SeriesContainerProps> {
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
    const { domains: rawDomains, axisDomains: rawSeriesAxisDomains } = raw;
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
          seriesAxisScale: seriesAxisData.axisScales[axis!],
          rawSeriesAxisDomain: rawSeriesAxisDomains[axis!], rawDomains: rawDomains[id],
          filteredValues: filteredValues[id],
          gradientIdMap, onFocus }
      };
    }));
  }
}
