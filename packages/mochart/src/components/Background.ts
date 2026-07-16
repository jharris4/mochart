// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

export default class Background extends Renderer {
  static defaultProps = {
    configStyleKey: 'backgroundStyle'
  };

  backgroundClick = () => {
    const { onClick } = this.props;
    if (onClick) {
      onClick();
    }
  }

  root = svgEl('g');
  rect = svgEl('rect');

  create() {
    this.root.append(this.rect);
    return this.root.node;
  }

  sync() {
    const { config, configStyleKey, classKey, spacingRelative, spacingLayoutInfo } = this.props;
    const { marginBounds, marginRelativeBounds } = spacingLayoutInfo;
    const bounds = spacingRelative ? marginRelativeBounds : marginBounds;
    let { x, y, width, height } = bounds;
    const backgroundStyle = config[configStyleKey];
    const backgroundProps = backgroundStyle ? backgroundStyle : {};
    this.root.set({ className: mochartCssClasses[classKey], onClick: this.backgroundClick });
    this.rect.set({ x, y, width, height, ...backgroundProps });
  }
}
