import { Renderer, svgEl } from '../render';

import { getSeriesConfigsOrderedByFocus } from '../data/FocusData';
import { getPieSliceAngles, sweepPieSliceAngles } from '../data/PieData';
import type { PieSliceAngles } from '../data/PieData';
import { getRadialLayoutInfo } from '../layout/RadialLayout';
import { mochartCssClasses } from '../utils/ChartDom';

import SeriesBackground from './SeriesBackground';
import type { SeriesShapeA11yProps } from './SeriesBackground';
import PieSeries from './PieSeries';
import PieCenter from './PieCenter';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { SeriesData } from '../types/data';
import type { FocusData } from '../types/animation';
import type { LayoutInfo } from '../types/layout';

interface PieSeriesContainerProps {
  mochartConfig: EnhancedMochartConfig;
  seriesLayoutInfo: LayoutInfo;
  seriesData: SeriesData;
  focusData: FocusData;
  gradientIdMap: Record<string, string>;
  /** 0..1 while the initial value tween runs (drives the sweep-in), else null. */
  initialAnimationPercentage: number | null;
  onFocus: (focus: { seriesId?: string | null; categoryIndex?: number | null }) => void;
  onSliceClick?: (payload: { seriesId: string }) => void;
  shapeRef: (element: Element | null) => void;
  a11yProps: SeriesShapeA11yProps | null;
}

interface PieSeriesContainerState { rovingSeriesId: string | null }

export default class PieSeriesContainer extends Renderer<PieSeriesContainerProps, PieSeriesContainerState> {
  root = svgEl('g');
  background = this.slot(this.root);
  series = this.rendererList(this.root);
  center = this.slot(this.root);

  constructor() {
    super();
    this.state = { rovingSeriesId: null };
  }

  /** interactive slice nodes in config order (the DOM is focus-ordered, so it cannot drive navigation) */
  private orderedSliceNodes(): SVGElement[] {
    const nodeById = new Map<string, SVGElement>();
    for (const node of this.root.node.querySelectorAll<SVGElement>('g[data-series-id]')) {
      nodeById.set(node.getAttribute('data-series-id')!, node);
    }
    const nodes: SVGElement[] = [];
    for (const seriesConfig of this.props.mochartConfig.series) {
      const node = nodeById.get(seriesConfig.id);
      if (node !== undefined) {
        nodes.push(node);
      }
    }
    return nodes;
  }

  /** any focus landing on a slice (Tab, arrows, mouse) makes it the roving tab stop */
  sliceFocusIn = (event: Event) => {
    const seriesId = (event.target as Element).getAttribute?.('data-series-id');
    if (seriesId != null && seriesId !== this.state.rovingSeriesId) {
      this.setState({ rovingSeriesId: seriesId });
    }
  }

  sliceKeyDown = (event: Event) => {
    const { key } = event as KeyboardEvent;
    const target = event.target as Element;
    if (target.getAttribute?.('data-series-id') == null) {
      return; // not a slice (e.g. the plot-area rect handles its own keys)
    }
    if (key === 'Escape' || key === 'Enter' || key === ' ') {
      // mirror the plot rect: Enter/Space toggles the tooltip (and announces),
      // Escape closes it — the slice itself handles only focus/selection
      this.props.a11yProps?.onKeyDown(event);
      return;
    }
    const nodes = this.orderedSliceNodes();
    const index = nodes.indexOf(target as SVGElement);
    if (index === -1) {
      return;
    }
    let nextIndex: number;
    if (key === 'ArrowRight' || key === 'ArrowDown') {
      nextIndex = Math.min(index + 1, nodes.length - 1);
    }
    else if (key === 'ArrowLeft' || key === 'ArrowUp') {
      nextIndex = Math.max(index - 1, 0);
    }
    else if (key === 'Home') {
      nextIndex = 0;
    }
    else if (key === 'End') {
      nextIndex = nodes.length - 1;
    }
    else {
      return;
    }
    event.preventDefault();
    if (nextIndex !== index) {
      nodes[nextIndex].focus();
    }
  }

  create() {
    return this.root.node;
  }

  sync() {
    const { mochartConfig, seriesLayoutInfo, seriesData, focusData, gradientIdMap, initialAnimationPercentage, onFocus, onSliceClick, shapeRef, a11yProps } = this.props;
    const { pie: pieConfig, colorPalette: colorPaletteConfig, seriesIndicesById: seriesConfigIndicesById } = mochartConfig;
    const { values: filteredValues } = seriesData.filtered;

    // Angles come from the config-order slice map (focus reordering must not
    // move geometry); recomputing every sync is what animates them, since the
    // filtered values are the tweened values mid-animation.
    let sliceAngles = getPieSliceAngles(mochartConfig.series, filteredValues, pieConfig);
    const radialLayoutInfo = getRadialLayoutInfo(seriesLayoutInfo, pieConfig);

    // When labels or the center total should ignore filtering, their
    // fractions/total come from the raw values (which keep filtered series).
    let rawSliceAngles: Record<string, PieSliceAngles> | null = null;
    if (!pieConfig.adjustLabelsForFiltering || !pieConfig.adjustCenterTotalForFiltering) {
      rawSliceAngles = getPieSliceAngles(mochartConfig.series, seriesData.raw.values, pieConfig);
    }

    // On the initial animation the whole pie sweeps in from the start angle;
    // labels stay hidden until the sweep settles.
    const sweeping = initialAnimationPercentage !== null && initialAnimationPercentage < 1;
    if (sweeping) {
      sliceAngles = sweepPieSliceAngles(sliceAngles, pieConfig, initialAnimationPercentage);
    }

    // Focused slices draw last so their stroke sits above their neighbours'.
    const orderedSeriesConfigs = getSeriesConfigsOrderedByFocus(mochartConfig, focusData);

    const { enabled: accessibility } = mochartConfig.accessibility;
    const sliceIsInteractive = (id: string): boolean =>
      accessibility &&
      (mochartConfig.seriesById[id].focusOnClick || onSliceClick !== undefined) &&
      (sliceAngles[id]?.fraction ?? 0) > 0;
    const interactiveIds = mochartConfig.series.map(sc => sc.id).filter(sliceIsInteractive);
    const { rovingSeriesId } = this.state;
    // the remembered roving slice keeps the tab stop while it exists; otherwise the first takes it
    const effectiveRovingId = rovingSeriesId !== null && interactiveIds.indexOf(rovingSeriesId) !== -1
      ? rovingSeriesId : interactiveIds[0] ?? null;

    this.root.set({ className: mochartCssClasses['seriesContainer'],
      onKeyDown: interactiveIds.length > 0 ? this.sliceKeyDown : null,
      onFocusIn: interactiveIds.length > 0 ? this.sliceFocusIn : null });
    this.background.set(SeriesBackground, { seriesLayoutInfo, shapeRef, a11yProps });

    // reordering below moves the focused slice's node, which drops DOM focus
    const activeElement = document.activeElement;
    const focusedSlice = activeElement !== null && this.root.node.contains(activeElement) &&
      activeElement.getAttribute('data-series-id') !== null ? activeElement as SVGElement : null;

    this.series.sync(orderedSeriesConfigs.map(seriesConfig => ({
      key: 'series-' + seriesConfig.id,
      ctor: PieSeries,
      props: { colorPaletteConfig, pieConfig, seriesConfig,
        seriesIndex: seriesConfigIndicesById[seriesConfig.id],
        seriesLayoutInfo, radialLayoutInfo,
        sliceAngles: sliceAngles[seriesConfig.id],
        labelFraction: pieConfig.adjustLabelsForFiltering
          ? sliceAngles[seriesConfig.id]?.fraction ?? 0
          : rawSliceAngles![seriesConfig.id]?.fraction ?? 0,
        focusData, gradientIdMap, hideLabels: sweeping, onFocus, onSliceClick,
        accessibility, tabStop: seriesConfig.id === effectiveRovingId }
    })));

    if (focusedSlice !== null && document.activeElement !== focusedSlice && focusedSlice.isConnected) {
      focusedSlice.focus();
    }

    // The center total sums the current (possibly mid-tween) values, so it
    // counts along with value changes — and with filtering, unless
    // adjustCenterTotalForFiltering turns that off.
    const totalAngles = pieConfig.adjustCenterTotalForFiltering ? sliceAngles : rawSliceAngles!;
    let total = 0;
    for (const id of Object.keys(totalAngles)) {
      total += totalAngles[id].value;
    }
    this.center.set(PieCenter, { pieConfig, seriesLayoutInfo, radialLayoutInfo, total, accessibility });
  }
}
