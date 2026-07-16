// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import { getCutoutRectanglePath } from '../utils/svgUtils';

export default class TooltipClip extends Renderer {
  root = svgEl('clipPath');
  shape = null;
  shapeTag = null;

  create() {
    return this.root.node;
  }

  setShape(tag) {
    if (this.shapeTag !== tag) {
      if (this.shape !== null) {
        this.root.node.removeChild(this.shape.node);
      }
      this.shape = svgEl(tag);
      this.shapeTag = tag;
      this.root.append(this.shape);
    }
    return this.shape;
  }

  sync() {
    const { mochartConfig, tooltipVisible, tooltipShown, width, height, tooltipLayoutInfo, chartContentLayoutInfo, tooltipClipPathUniqueId } = this.props;
    if (mochartConfig.tooltipConfig.visible && tooltipVisible) {
      this.setPresent(true);
      this.root.set({ id: tooltipClipPathUniqueId, clipRule: 'evenodd' });
      if (tooltipShown) {
        let pathPoints = getCutoutRectanglePath(0, 0, width, height, tooltipLayoutInfo.x - chartContentLayoutInfo.x,
          tooltipLayoutInfo.y - chartContentLayoutInfo.y, tooltipLayoutInfo.width, tooltipLayoutInfo.height);
        this.setShape('path').set({ fillRule: 'evenodd', d: pathPoints });
      }
      else {
        this.setShape('rect').set({ x: 0, y: 0, width, height });
      }
    }
    else {
      this.setPresent(false);
    }
  }
}
