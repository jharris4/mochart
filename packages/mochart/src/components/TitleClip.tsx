// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { NONE } from '../config/core/constants';
import { translate } from '../utils/utils';
import { getSpacingLeft, getSpacingWidth } from '../layout/SpacingLayoutInfo';

export default class TitleClip extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { titleConfig, chartContentLayoutInfo, titleTextLayoutInfo, titleClipPathUniqueId } = this.props;
    if (titleConfig.title !== NONE && titleConfig.truncationEnabled) {
      const { y, height } = chartContentLayoutInfo;
      const { x, paddingRelativeBounds } = titleTextLayoutInfo;
      const { width } = paddingRelativeBounds;

      return (
        <clipPath id={titleClipPathUniqueId}>
          <rect x={x + paddingRelativeBounds.x} y={y} width={width} height={height} />
        </clipPath>
      );
    }
    return false;
  }
}
