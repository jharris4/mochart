import { Renderer, svgEl } from '../render';

import { getSeriesConfigsOrderedByFocus } from '../data/FocusData';
import { getPieSliceAngles } from '../data/PieData';
import { getRadialLayoutInfo } from '../layout/RadialLayout';
import { mochartCssClasses } from '../utils/ChartDom';

import SeriesBackground from './SeriesBackground';
import PieSeries from './PieSeries';
import type { MochartConfig } from '../types/config';
import type { SeriesData } from '../types/data';
import type { FocusData } from '../types/animation';
import type { LayoutInfo } from '../types/layout';

interface PieSeriesContainerProps {
  mochartConfig: MochartConfig;
  seriesLayoutInfo: LayoutInfo;
  seriesData: SeriesData;
  focusData: FocusData;
  gradientIdMap: Record<string, string>;
  onFocus: (focus: { seriesId?: string | null; groupIndex?: number | null }) => void;
  shapeRef: (element: Element | null) => void;
}

export default class PieSeriesContainer extends Renderer<PieSeriesContainerProps> {
  root = svgEl('g');
  background = this.slot(this.root);
  series = this.rendererList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { mochartConfig, seriesLayoutInfo, seriesData, focusData, gradientIdMap, onFocus, shapeRef } = this.props;
    const { pieConfig, colorPaletteConfig, seriesConfigIndicesById } = mochartConfig;
    const { values: filteredValues } = seriesData.filtered;

    // Angles come from the config-order slice map (focus reordering must not
    // move geometry); recomputing every sync is what animates them, since the
    // filtered values are the tweened values mid-animation.
    const sliceAngles = getPieSliceAngles(mochartConfig.seriesConfigs, filteredValues, pieConfig);
    const radialLayoutInfo = getRadialLayoutInfo(seriesLayoutInfo, pieConfig);

    // Focused slices draw last so their stroke sits above their neighbours'.
    const orderedSeriesConfigs = getSeriesConfigsOrderedByFocus(mochartConfig, focusData);

    this.root.set({ className: mochartCssClasses['seriesContainer'] });
    this.background.set(SeriesBackground, { seriesLayoutInfo, shapeRef });

    this.series.sync(orderedSeriesConfigs.map(seriesConfig => ({
      key: 'series-' + seriesConfig.id,
      ctor: PieSeries,
      props: { colorPaletteConfig, pieConfig, seriesConfig,
        seriesIndex: seriesConfigIndicesById[seriesConfig.id],
        seriesLayoutInfo, radialLayoutInfo,
        sliceAngles: sliceAngles[seriesConfig.id],
        focusData, gradientIdMap, onFocus }
    })));
  }
}
