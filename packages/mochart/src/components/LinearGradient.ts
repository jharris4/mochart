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

export default class LinearGradient extends Renderer {
  root = svgEl('linearGradient');
  stops = this.elList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { uniqueId, linearGradientConfig } = this.props;
    this.root.set({
      id: uniqueId,
      x1: toPercent(linearGradientConfig.x1),
      y1: toPercent(linearGradientConfig.y1),
      x2: toPercent(linearGradientConfig.x2),
      y2: toPercent(linearGradientConfig.y2),
      gradientTransform: 'rotate(' + linearGradientConfig.rotation + ')'
    });
    this.stops.sync(linearGradientConfig.stops, stopAdapter);
  }
}
