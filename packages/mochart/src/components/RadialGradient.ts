// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

function toPercent(aNumber) {
  return (aNumber * 100) + '%';
}

const stopAdapter = {
  key: (stop, i) => i,
  create: () => ({ root: svgEl('stop') }),
  update: (handle, stop) => {
    handle.root.set({ offset: toPercent(stop.offset), stopColor: stop.color, stopOpacity: stop.opacity });
  }
};

export default class RadialGradient extends Renderer {
  root = svgEl('radialGradient');
  stops = this.elList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { uniqueId, radialGradientConfig } = this.props;
    this.root.set({
      id: uniqueId,
      cx: toPercent(radialGradientConfig.cx),
      cy: toPercent(radialGradientConfig.cy),
      fx: toPercent(radialGradientConfig.fx),
      fy: toPercent(radialGradientConfig.fy),
      r: toPercent(radialGradientConfig.r),
      gradientTransform: 'rotate(' + radialGradientConfig.rotation + ')'
    });
    this.stops.sync(radialGradientConfig.stops, stopAdapter);
  }
}
