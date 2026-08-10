import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { styleToAttributes } from '../utils/style';
import { AUTO } from '../config/core/constants';
import type { El } from '../render';
import type { ClippedEdges } from '../types/data';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { LayoutInfo } from '../types/layout';

interface ClipIndicatorProps {
  mochartConfig: EnhancedMochartConfig;
  seriesLayoutInfo: LayoutInfo;
  clippedEdges: ClippedEdges;
}

/** Null until the band has been rendered once and its computed font size read. */
interface ClipIndicatorState { fontSize: number | null }

const edgeKeys = ['top', 'right', 'bottom', 'left'] as const;
type EdgeKey = typeof edgeKeys[number];

/** Used for an automatic size on the first frame, before the real font size can be read. */
const defaultFontSize = 12;

/**
 * Marks the plot edges that have data hidden behind them. One band per clipped edge, so two axes
 * clipping the same end produce one band, and it overlays the plot rather than reserving space —
 * which keeps it out of the layout pass entirely.
 */
export default class ClipIndicator extends Renderer<ClipIndicatorProps, ClipIndicatorState> {
  root = svgEl('g');
  bands: Partial<Record<EdgeKey, El>> = {};

  constructor() {
    super();
    this.state = { fontSize: null };
  }

  create() {
    return this.root.node;
  }

  sync() {
    const { mochartConfig, seriesLayoutInfo, clippedEdges } = this.props;
    const { plot: plotConfig } = mochartConfig;

    if (!plotConfig.showClipIndicator || !edgeKeys.some(edge => clippedEdges[edge])) {
      this.setPresent(false);
      return;
    }

    this.setPresent(true);
    this.root.set({ className: mochartCssClasses['clipIndicator'], pointerEvents: 'none' });

    const size = this.getSize();
    const styleAttributes = styleToAttributes(plotConfig.clipIndicatorStyle);
    for (const edge of edgeKeys) {
      const band = this.bands[edge] ?? (this.bands[edge] = svgEl('rect'));
      if (clippedEdges[edge] && size > 0) {
        this.root.append(band);
        band.set({ className: mochartCssClasses['clipIndicatorBand'] + edge,
          ...getBandRect(seriesLayoutInfo, edge, size), ...styleAttributes });
      }
      else {
        band.node.remove();
      }
    }
  }

  /**
   * The band carries no text of its own until a label is set, so an automatic size comes from the
   * *computed font size* rather than a bounding box. Read post-commit, and only stored when it
   * changes, so a stable font settles after one extra pass.
   */
  measure(): void {
    if (this.props.mochartConfig.plot.clipIndicatorSize !== AUTO || typeof getComputedStyle !== 'function') {
      return;
    }
    const fontSize = parseFloat(getComputedStyle(this.root.node as Element).fontSize);
    if (isFinite(fontSize) && fontSize > 0 && fontSize !== this.state.fontSize) {
      this.setState({ fontSize });
    }
  }

  /** The band's depth: an explicit size, or the font size plus padding on both sides. */
  getSize(): number {
    const { clipIndicatorSize, clipIndicatorPadding } = this.props.mochartConfig.plot;
    if (clipIndicatorSize !== AUTO) {
      return clipIndicatorSize;
    }
    return (this.state.fontSize ?? defaultFontSize) + clipIndicatorPadding * 2;
  }
}

function getBandRect(seriesLayoutInfo: LayoutInfo, edge: EdgeKey, size: number) {
  const { x, y, width, height } = seriesLayoutInfo;
  // never deeper than the plot itself, so a large size cannot cover the opposite edge's band
  const depth = Math.min(size, edge === 'top' || edge === 'bottom' ? height : width);
  switch (edge) {
    case 'top': return { x, y, width, height: depth };
    case 'bottom': return { x, y: y + height - depth, width, height: depth };
    case 'left': return { x, y, width: depth, height };
    default: return { x: x + width - depth, y, width: depth, height };
  }
}
