import { Renderer, svgEl } from '../render';

import { getSeriesConfigsOrderedByFocus } from '../data/FocusData';
import { mochartCssClasses } from '../utils/ChartDom';

import SeriesBackground from './SeriesBackground';
import type { SeriesShapeA11yProps } from './SeriesBackground';
import Series from './Series';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { CategoryAxisData, ValueAxisData, SeriesData, StackData } from '../types/data';
import type { FocusData } from '../types/animation';
import type { LayoutInfo } from '../types/layout';

interface SeriesContainerProps {
  mochartConfig: EnhancedMochartConfig;
  seriesLayoutInfo: LayoutInfo;
  seriesData: SeriesData;
  valueAxisData: ValueAxisData;
  stackData: StackData;
  focusData: FocusData;
  categoryValueData: CategoryAxisData['valueData'];
  gradientIdMap: Record<string, string>;
  onFocus: (focus: { seriesId?: string | null; categoryIndex?: number | null }) => void;
  shapeRef: (element: Element | null) => void;
  a11yProps: SeriesShapeA11yProps | null;
}

export default class SeriesContainer extends Renderer<SeriesContainerProps> {
  root = svgEl('g');
  background = this.slot(this.root);
  series = this.rendererList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { mochartConfig, seriesLayoutInfo, seriesData, valueAxisData, stackData, focusData, categoryValueData, gradientIdMap, onFocus, shapeRef, a11yProps } = this.props;

    const { categoryAxis: categoryAxisConfig, seriesIndicesById: seriesConfigIndicesById, colorPalette: colorPaletteConfig } = mochartConfig;

    const { raw, filtered } = seriesData;
    const { domains: rawDomains, axisDomains: rawValueAxisDomains } = raw;
    const { values: filteredValues } = filtered;

    const orderedSeriesConfigs = getSeriesConfigsOrderedByFocus(mochartConfig, focusData);

    this.root.set({ className: mochartCssClasses['seriesContainer'] });
    this.background.set(SeriesBackground, { seriesLayoutInfo, shapeRef, a11yProps });

    this.series.sync(orderedSeriesConfigs.map(seriesConfig => {
      const { id, axis } = seriesConfig;
      const index = seriesConfigIndicesById[seriesConfig.id];

      return {
        key: 'series-' + id,
        ctor: Series,
        props: { categoryAxisConfig, colorPaletteConfig,
          seriesConfig, seriesIndex: index, stackData,
          seriesLayoutInfo, focusData, categoryValueData,
          valueAxisScale: valueAxisData.axisScales[axis!],
          rawValueAxisDomain: rawValueAxisDomains[axis!], rawDomains: rawDomains[id],
          filteredValues: filteredValues[id],
          gradientIdMap, onFocus, accessibility: mochartConfig.chart.accessibility }
      };
    }));
  }
}
