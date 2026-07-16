// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import Background from './Background';

export default class AxisBackground extends Renderer {
  root = svgEl('g');
  background = this.slot(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { axisConfig, axisLayoutInfo } = this.props;
    this.background.set(Background, { config: axisConfig, classKey: 'axisBackground', spacingRelative: true, spacingLayoutInfo: axisLayoutInfo });
  }
}
