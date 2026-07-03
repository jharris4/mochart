// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { NONE } from '../config/core/constants';

export default class Background extends PureComponent {
  static defaultProps = {
    configStyleKey: 'backgroundStyle'
  };

  constructor(props) {
    super(props);
  }

  backgroundClick = () => {
    const { onClick } = this.props;
    if (onClick) {
      onClick();
    }
  }

  render() {
    const { config, configStyleKey, classKey, spacingRelative, spacingLayoutInfo } = this.props;
    const { marginBounds, marginRelativeBounds } = spacingLayoutInfo;
    const bounds = spacingRelative ? marginRelativeBounds : marginBounds;
    let { x, y, width, height } = bounds;
    const backgroundStyle = config[configStyleKey];
    const backgroundProps = backgroundStyle ? backgroundStyle : {};
    return (
      <g className={mochartCssClasses[classKey]} onClick={this.backgroundClick}>
        <rect x={x} y={y} width={width} height={height} {...backgroundProps} />
      </g>
    );
  }
}
