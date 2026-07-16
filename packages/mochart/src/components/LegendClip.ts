// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

export default class LegendClip extends Renderer {
  root = svgEl('clipPath');
  rect = svgEl('rect');

  create() {
    this.root.append(this.rect);
    return this.root.node;
  }

  sync() {
    const { legendConfig, chartContentLayoutInfo, legendItemTextLayoutInfo, legendClipPathUniqueId } = this.props;
    if (legendConfig.visible && legendConfig.truncationEnabled) {
      const { y, height } = chartContentLayoutInfo;
      const { x, width } = legendItemTextLayoutInfo;

      this.setPresent(true);
      this.root.set({ id: legendClipPathUniqueId });
      this.rect.set({ x, y, width, height });
    }
    else {
      this.setPresent(false);
    }
  }
}
