import { Renderer, svgEl } from '../render';

import { getSeriesConfigsOrderedByFocus } from '../data/FocusData';
import { getPieSliceAngles, sweepPieSliceAngles } from '../data/PieData';
import { getRadialLayoutInfo } from '../layout/RadialLayout';
import { mochartCssClasses } from '../utils/ChartDom';

import SeriesBackground from './SeriesBackground';
import PieSeries from './PieSeries';
import PieCenter from './PieCenter';
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
  /** 0..1 while the initial value tween runs (drives the sweep-in), else null. */
  initialAnimationPercentage: number | null;
  onFocus: (focus: { seriesId?: string | null; groupIndex?: number | null }) => void;
  shapeRef: (element: Element | null) => void;
}

export default class PieSeriesContainer extends Renderer<PieSeriesContainerProps> {
  root = svgEl('g');
  background = this.slot(this.root);
  series = this.rendererList(this.root);
  center = this.slot(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { mochartConfig, seriesLayoutInfo, seriesData, focusData, gradientIdMap, initialAnimationPercentage, onFocus, shapeRef } = this.props;
    const { pieConfig, colorPaletteConfig, seriesConfigIndicesById } = mochartConfig;
    const { values: filteredValues } = seriesData.filtered;

    // Angles come from the config-order slice map (focus reordering must not
    // move geometry); recomputing every sync is what animates them, since the
    // filtered values are the tweened values mid-animation.
    let sliceAngles = getPieSliceAngles(mochartConfig.seriesConfigs, filteredValues, pieConfig);
    const radialLayoutInfo = getRadialLayoutInfo(seriesLayoutInfo, pieConfig);

    // On the initial animation the whole pie sweeps in from the start angle;
    // labels stay hidden until the sweep settles.
    const sweeping = initialAnimationPercentage !== null && initialAnimationPercentage < 1;
    if (sweeping) {
      sliceAngles = sweepPieSliceAngles(sliceAngles, pieConfig, initialAnimationPercentage);
    }

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
        focusData, gradientIdMap, hideLabels: sweeping, onFocus }
    })));

    // The center total sums the current (possibly mid-tween) values, so it
    // counts along with value changes and suppression.
    let total = 0;
    for (const id of Object.keys(sliceAngles)) {
      total += sliceAngles[id].value;
    }
    this.center.set(PieCenter, { pieConfig, seriesLayoutInfo, radialLayoutInfo, total });
  }
}
