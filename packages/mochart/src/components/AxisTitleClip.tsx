// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { NONE, AUTO } from '../config/core/constants';

export default class AxisTitleClip extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { axisConfig, chartContentLayoutInfo, axisLayoutInfo, axisTitleClipPathUniqueId } = this.props;
    if (axisConfig.visible && axisConfig.title !== NONE && axisConfig.titleTruncationEnabled) {
      const { width: cWidth } = chartContentLayoutInfo;
      const { titleBoundsX, titleBoundsY, titleBoundsWidth, titleBoundsHeight, vertical } = axisLayoutInfo;

      const x = vertical ? 0 : titleBoundsX;
      const y = vertical ? titleBoundsY : 0;
      const width = vertical ? cWidth : titleBoundsWidth;
      const height = vertical ? titleBoundsHeight : cWidth;

      return (
        <clipPath id={axisTitleClipPathUniqueId}>
          <rect x={x} y={y} width={width} height={height}/>
        </clipPath>
      );
    }
    return false;
  }
}
