import { Renderer, svgEl } from '../render';

import type { EnhancedMochartConfig } from '../types/enhanced';
import type { LayoutInfo } from '../types/layout';

interface SeriesClipProps {
  mochartConfig: EnhancedMochartConfig;
  seriesLayoutInfo: LayoutInfo;
  seriesClipPathUniqueId: string;
}

/**
 * Confines the series to the plot. An explicit axis `min`/`max` is a hard bound, so a value past
 * it would otherwise paint over the axes and the title.
 *
 * `plot.clipOverflow` widens the clip per side. It is 0 by default, which keeps the rule to one
 * sentence and keeps the clip edge exactly where the clip indicator marks it — a mark whose anchor
 * sits on a bound is cut there, and raising it is how a host opts out of that.
 */
export default class SeriesClip extends Renderer<SeriesClipProps> {
  root = svgEl('clipPath');
  rect = svgEl('rect');

  create() {
    this.root.append(this.rect);
    return this.root.node;
  }

  sync() {
    const { mochartConfig, seriesLayoutInfo, seriesClipPathUniqueId } = this.props;
    const { top, right, bottom, left } = mochartConfig.plot.clipOverflow;
    this.root.set({ id: seriesClipPathUniqueId });
    this.rect.set({
      x: seriesLayoutInfo.x - left,
      y: seriesLayoutInfo.y - top,
      width: Math.max(0, seriesLayoutInfo.width + left + right),
      height: Math.max(0, seriesLayoutInfo.height + top + bottom)
    });
  }
}
