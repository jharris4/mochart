import { Renderer, svgEl } from '../render';

import { getSeriesGradientColors } from '../utils/SeriesColors';
import type { SeriesConfig } from '../types/config';

interface SeriesColorGradientProps {
  uniqueId: string;
  seriesConfig: SeriesConfig;
}

function toPercent(i: number, count: number): string {
  return (count === 2 ? (i * 100) : (i * 25)) + '%';
}

export default class SeriesColorGradient extends Renderer<SeriesColorGradientProps> {
  root = svgEl('linearGradient');
  stops = this.elList<string>(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { uniqueId, seriesConfig } = this.props;

    let colors = getSeriesGradientColors(seriesConfig);

    if (colors) {
      this.setPresent(true);
      this.root.set({ id: uniqueId, x1: '0', x2: '0', y1: '1', y2: '0' });
      this.stops.sync(colors, {
        key: (_color, i) => i,
        create: () => ({ root: svgEl('stop') }),
        update: (handle, color, i) => {
          handle.root.set({ offset: toPercent(i, colors.length), stopColor: color, stopOpacity: 1 });
        }
      });
    }
    else {
      this.setPresent(false);
    }
  }
}
