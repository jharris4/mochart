// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { NONE } from '../config/core/constants';
import { translate } from '../utils/utils';
import { getSpacingLeft, getSpacingWidth } from '../layout/SpacingLayoutInfo';

export default class LegendClip extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { legendConfig, chartContentLayoutInfo, legendItemTextLayoutInfo, legendClipPathUniqueId } = this.props;
    if (legendConfig.visible && legendConfig.truncationEnabled) {
      const { y, height } = chartContentLayoutInfo;
      const { x, width } = legendItemTextLayoutInfo;

      return (
        <clipPath id={legendClipPathUniqueId}>
          <rect x={x} y={y} width={width} height={height} />
        </clipPath>
      );
    }
    return false;
  }
}
