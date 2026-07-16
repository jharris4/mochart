// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

export default class SeriesBackground extends Renderer {
  static defaultProps = {
    chartTransform: null
  };

  root = svgEl('g');
  rect = svgEl('rect');
  lastShapeRef = null;

  create() {
    this.root.append(this.rect);
    return this.root.node;
  }

  sync() {
    const { seriesLayoutInfo, shapeRef } = this.props;
    this.root.set({ className: mochartCssClasses['seriesBackground'] });
    this.rect.set({ x: seriesLayoutInfo.x, y: seriesLayoutInfo.y, width: seriesLayoutInfo.width, height: seriesLayoutInfo.height,
      fillOpacity: '0', stroke: 'none' });
    if (shapeRef !== this.lastShapeRef) {
      if (this.lastShapeRef) {
        this.lastShapeRef(null);
      }
      if (shapeRef) {
        shapeRef(this.rect.node);
      }
      this.lastShapeRef = shapeRef;
    }
  }

  willUnmount() {
    if (this.lastShapeRef) {
      this.lastShapeRef(null);
      this.lastShapeRef = null;
    }
  }
}
