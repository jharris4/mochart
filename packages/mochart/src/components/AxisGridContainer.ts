import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { getAggregateSeriesFocusPercentage } from '../utils/FocusValue';

import CategoryAxisGrid from './CategoryAxisGrid';
import ValueAxisGrid from './ValueAxisGrid';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { AxisData, CategoryAxisData, ValueAxisData, SeriesData } from '../types/data';
import type { FocusData } from '../types/animation';
import type { LayoutInfo } from '../types/layout';

interface AxisGridContainerProps {
  front: boolean;
  mochartConfig: EnhancedMochartConfig;
  seriesLayoutInfo: LayoutInfo;
  seriesData: SeriesData;
  focusData: FocusData;
  axisData: AxisData & { category: CategoryAxisData; value: ValueAxisData };
}

export default class AxisGridContainer extends Renderer<AxisGridContainerProps> {
  root = svgEl('g');
  categoryGrid = this.slot(this.root);
  seriesGrids = this.rendererList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { front, mochartConfig, seriesLayoutInfo, seriesData, focusData, axisData } = this.props;
    const { valueAxisFocusPercentages, seriesFocusPercentages } = focusData;
    const { category: categoryAxisData, value: valueAxisData } = axisData;
    const { plot: plotConfig, categoryAxis: categoryAxisConfig, valueAxes: valueAxisConfigs } = mochartConfig;
    const { gridLineFront } = categoryAxisConfig;

    this.root.set({ className: mochartCssClasses['axisGridContainer'] });

    if (gridLineFront !== front) {
      this.categoryGrid.set(null);
    }
    else {
      this.categoryGrid.set(CategoryAxisGrid, { plotConfig, categoryAxisConfig, seriesLayoutInfo, categoryAxisData });
    }

    const items = [];
    for (const axisConfig of valueAxisConfigs) {
      const { id, seriesConfigs, useSeriesFocus, gridLineFront } = axisConfig;
      if (gridLineFront !== front) {
        continue;
      }
      const axisFocusPercentage = valueAxisFocusPercentages[id];
      const seriesFocusPercentage = useSeriesFocus ? getAggregateSeriesFocusPercentage(seriesConfigs ?? [], seriesFocusPercentages) : 0;
      items.push({
        key: 'value-axis-' + id,
        ctor: ValueAxisGrid,
        props: { plotConfig, valueAxisConfig: axisConfig,
          seriesCount: seriesData.axisSeriesCounts[id],
          axisFocusPercentage, seriesFocusPercentage,
          seriesLayoutInfo, valueAxisData }
      });
    }
    this.seriesGrids.sync(items);
  }
}
