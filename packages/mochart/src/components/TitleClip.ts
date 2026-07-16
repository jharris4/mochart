// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import { NONE } from '../config/core/constants';

export default class TitleClip extends Renderer {
  root = svgEl('clipPath');
  rect = svgEl('rect');

  create() {
    this.root.append(this.rect);
    return this.root.node;
  }

  sync() {
    const { titleConfig, chartContentLayoutInfo, titleTextLayoutInfo, titleClipPathUniqueId } = this.props;
    if (titleConfig.title !== NONE && titleConfig.truncationEnabled) {
      const { y, height } = chartContentLayoutInfo;
      const { x, paddingRelativeBounds } = titleTextLayoutInfo;
      const { width } = paddingRelativeBounds;

      this.setPresent(true);
      this.root.set({ id: titleClipPathUniqueId });
      this.rect.set({ x: x + paddingRelativeBounds.x, y, width, height });
    }
    else {
      this.setPresent(false);
    }
  }
}
