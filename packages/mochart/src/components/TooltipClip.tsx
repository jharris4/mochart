// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { getCutoutRectanglePath } from '../utils/svgUtils';

export default class TooltipClip extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { mochartConfig, tooltipVisible, tooltipShown, width, height, tooltipLayoutInfo, chartContentLayoutInfo, tooltipClipPathUniqueId } = this.props;
    if (mochartConfig.tooltipConfig.visible && tooltipVisible) {
      let tooltipClipShape;
      if (tooltipShown) {
        let pathPoints = getCutoutRectanglePath(0, 0, width, height, tooltipLayoutInfo.x - chartContentLayoutInfo.x,
          tooltipLayoutInfo.y - chartContentLayoutInfo.y, tooltipLayoutInfo.width, tooltipLayoutInfo.height);
        tooltipClipShape = <path fillRule="evenodd" d={pathPoints}/>;
      }
      else {
        tooltipClipShape = <rect x={0} y={0} width={width} height={height}/>;
      }

      return (
        <clipPath id={tooltipClipPathUniqueId} clipRule="evenodd">
          {tooltipClipShape}
        </clipPath>
      );
    }
    return false;
  }
}
