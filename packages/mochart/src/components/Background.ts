import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import type { BackgroundStyle } from '../types/config';
import type { SpacingLayoutInfo } from '../types/layout';
import type { Bounds } from '../types/geometry';

type CssClassKey = keyof typeof mochartCssClasses;

type BackgroundStyleKey = 'backgroundStyle' | 'tickLabelBackgroundStyle' | 'titleBackgroundStyle' | 'itemBackgroundStyle';

interface BackgroundConfig {
  backgroundStyle: BackgroundStyle;
  tickLabelBackgroundStyle?: BackgroundStyle;
  titleBackgroundStyle?: BackgroundStyle;
  itemBackgroundStyle?: BackgroundStyle;
}

interface BackgroundProps {
  config: BackgroundConfig;
  configStyleKey?: BackgroundStyleKey;
  classKey: CssClassKey;
  spacingRelative: boolean;
  spacingLayoutInfo: SpacingLayoutInfo | Bounds;
  onClick?: () => void;
}

export default class Background extends Renderer<BackgroundProps> {
  static defaultProps: Partial<BackgroundProps> = {
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
    const { config, configStyleKey = 'backgroundStyle', classKey, spacingRelative, spacingLayoutInfo } = this.props;
    const bounds = 'marginBounds' in spacingLayoutInfo
      ? (spacingRelative ? spacingLayoutInfo.marginRelativeBounds : spacingLayoutInfo.marginBounds)
      : spacingLayoutInfo;
    let { x, y, width, height } = bounds;
    const backgroundStyle = config[configStyleKey];
    const backgroundProps = backgroundStyle ? backgroundStyle : {};
    this.root.set({ className: mochartCssClasses[classKey], onClick: this.backgroundClick });
    this.rect.set({ x, y, width, height, ...backgroundProps });
  }
}
