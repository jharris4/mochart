import { Renderer, svgEl } from '../render';

import { getSeriesConfigsOrderedByFocus } from '../data/FocusData';
import { mochartCssClasses } from '../utils/ChartDom';
import { accessibilityActive, focusRestored } from '../utils/utils';
import { getClipPathReference } from '../utils/svgUtils';
import { NONE } from '../config/core/constants';

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
  seriesClipPathUniqueId: string;
  seriesData: SeriesData;
  valueAxisData: ValueAxisData;
  stackData: StackData;
  focusData: FocusData;
  categoryValueData: CategoryAxisData['valueData'];
  gradientIdMap: Record<string, string>;
  onFocus: (focus: { seriesId?: string | null; categoryIndex?: number | null }) => void;
  onSeriesShapeClick: ((seriesId: string, categoryIndex: number, event: Event) => void) | null;
  shapeRef: (element: Element | null) => void;
  a11yProps: SeriesShapeA11yProps | null;
}

interface SeriesContainerState { rovingSeriesId: string | null }

export default class SeriesContainer extends Renderer<SeriesContainerProps, SeriesContainerState> {
  root = svgEl('g');
  background = this.slot(this.root);
  series = this.rendererList(this.root);

  constructor() {
    super();
    this.state = { rovingSeriesId: null };
  }

  /** interactive series nodes in config order (the DOM is focus-ordered, so it cannot drive navigation) */
  private orderedSeriesNodes(): SVGElement[] {
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

  /** any focus landing on a series (Tab, arrows, mouse) makes it the roving tab stop */
  seriesFocusIn = (event: Event) => {
    const seriesId = (event.target as Element).getAttribute?.('data-series-id');
    if (seriesId != null && seriesId !== this.state.rovingSeriesId) {
      this.setState({ rovingSeriesId: seriesId });
    }
  }

  seriesKeyDown = (event: Event) => {
    const { key } = event as KeyboardEvent;
    const target = event.target as Element;
    if (target.getAttribute?.('data-series-id') == null) {
      return; // not a series (e.g. the plot-area rect handles its own keys)
    }
    if (key === 'Escape') {
      // Escape is not a roving-group key, so it still reaches the plot rect and closes the tooltip
      this.props.a11yProps?.onKeyDown(event);
      return;
    }
    if (key === 'Enter' || key === ' ') {
      // the series handles its own activation; a series spans every category, so
      // there is no category for it to open the tooltip at — the plot rect owns that
      return;
    }
    const nodes = this.orderedSeriesNodes();
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
    const { mochartConfig, seriesLayoutInfo, seriesData, valueAxisData, stackData, focusData, categoryValueData, gradientIdMap, onFocus, onSeriesShapeClick, shapeRef, a11yProps, seriesClipPathUniqueId } = this.props;

    const { categoryAxis: categoryAxisConfig, seriesIndicesById: seriesConfigIndicesById, colorPalette: colorPaletteConfig } = mochartConfig;

    const { raw, filtered } = seriesData;
    const { domains: rawDomains, renderAxisDomains: rawValueAxisDomains } = raw;
    const { values: filteredValues } = filtered;

    const orderedSeriesConfigs = getSeriesConfigsOrderedByFocus(mochartConfig, focusData);

    const accessibility = accessibilityActive(mochartConfig.accessibility);
    const seriesIsInteractive = (id: string): boolean =>
      accessibility &&
      mochartConfig.seriesById[id].followSeries === NONE &&
      (mochartConfig.seriesById[id].focusOnClick || onSeriesShapeClick !== null) &&
      filteredValues[id].plain !== null;
    const interactiveIds = mochartConfig.series.map(sc => sc.id).filter(seriesIsInteractive);
    const { rovingSeriesId } = this.state;
    // the remembered roving series keeps the tab stop while it exists; when it is
    // gone (filtered out) its nearest following config-order neighbor inherits
    // it, else the nearest preceding one; with no memory the first series takes it
    let effectiveRovingId: string | null;
    if (rovingSeriesId !== null && interactiveIds.indexOf(rovingSeriesId) !== -1) {
      effectiveRovingId = rovingSeriesId;
    }
    else if (rovingSeriesId !== null && interactiveIds.length > 0) {
      const removedIndex = seriesConfigIndicesById[rovingSeriesId] ?? -1;
      effectiveRovingId = interactiveIds.find(id => seriesConfigIndicesById[id] > removedIndex) ??
        interactiveIds[interactiveIds.length - 1];
    }
    else {
      effectiveRovingId = interactiveIds[0] ?? null;
    }

    // the roving series are one group, named like the legend's
    const anyInteractive = interactiveIds.length > 0;

    this.root.set({ className: mochartCssClasses['seriesContainer'],
      // an explicit axis min/max is a hard bound, so anything past it must not paint over the chrome
      clipPath: getClipPathReference(seriesClipPathUniqueId),
      role: anyInteractive ? 'group' : null,
      ariaLabel: anyInteractive ? mochartConfig.accessibility.seriesLabel : null,
      onKeyDown: anyInteractive ? this.seriesKeyDown : null,
      onFocusIn: anyInteractive ? this.seriesFocusIn : null });
    this.background.set(SeriesBackground, { seriesLayoutInfo, shapeRef, a11yProps });

    // reordering below moves the focused series' node, which drops DOM focus
    const activeElement = document.activeElement;
    const focusedSeries = activeElement !== null && this.root.node.contains(activeElement) &&
      activeElement.getAttribute('data-series-id') !== null ? activeElement as SVGElement : null;

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
          gradientIdMap, onFocus, onSeriesShapeClick, accessibility,
          tabStop: id === effectiveRovingId }
      };
    }));

    if (focusedSeries !== null && document.activeElement !== focusedSeries) {
      if (focusedSeries.isConnected) {
        focusRestored(focusedSeries);
      }
      else if (effectiveRovingId !== null) {
        // the focused series was filtered out: keep keyboard focus in the plot,
        // on the series that inherited the tab stop
        for (const node of this.root.node.querySelectorAll<SVGElement>('g[data-series-id]')) {
          if (node.getAttribute('data-series-id') === effectiveRovingId) {
            focusRestored(node);
            break;
          }
        }
      }
    }
  }
}
