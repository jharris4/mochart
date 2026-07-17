import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import type { LayoutInfo } from '../types/layout';

type ShapeRef = (element: Element | null) => void;

interface SeriesBackgroundProps {
  seriesLayoutInfo: LayoutInfo;
  shapeRef?: ShapeRef | null;
  chartTransform?: string | null;
}

export default class SeriesBackground extends Renderer<SeriesBackgroundProps> {
  static defaultProps: Partial<SeriesBackgroundProps> = {
    chartTransform: null
  };

  root = svgEl('g');
  rect = svgEl('rect');
  lastShapeRef: ShapeRef | null = null;

  create() {
    this.root.append(this.rect);
    return this.root.node;
  }

  sync() {
    const { seriesLayoutInfo, shapeRef = null } = this.props;
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
