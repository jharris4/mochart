// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { AUTO, ANCHOR_START, ANCHOR_END, ANCHOR_MIDDLE } from '../config/core/constants';

export default class GroupAxisTickLabelClip extends PureComponent {
  constructor(props) {
    super(props);
  }

  render() {
    const { mochartConfig, groupAxisLayoutInfo, chartContentLayoutInfo, groupAxisTickLabelClipPathUniqueId } = this.props;
    let { maxTickLabelLength } = this.props;
    const { groupAxisConfig, plotConfig } = mochartConfig;
    if (groupAxisConfig.visible && groupAxisConfig.tickLabelTruncationEnabled) {
      const { tickLabelParallel, tickHeight, tickLabelAnchor }  = groupAxisLayoutInfo;
      const { inverted } = plotConfig;
      const { tickLabelTruncationMaxPercent, tickLabelRotation } = groupAxisConfig;
      if (!tickLabelParallel) {
        maxTickLabelLength = Math.max(groupAxisConfig.tickLabelTruncationMinLength,
          tickLabelTruncationMaxPercent * (inverted ? chartContentLayoutInfo.width : chartContentLayoutInfo.height));
      }
      const tickRotationTransform = tickLabelRotation === 0 ? null : 'rotate(' + tickLabelRotation + ')';
      let x = tickLabelAnchor !== ANCHOR_MIDDLE ? (tickLabelAnchor === ANCHOR_END ? -1 * maxTickLabelLength : 0) : -1 * maxTickLabelLength / 2;
      let y = -1 * tickHeight;
      let width = maxTickLabelLength;
      let height = 2 * tickHeight;
      let groupAxisTickLabelClipShape = <rect transform={tickRotationTransform} x={x} y={y} width={width} height={height} />;

      return (
        <clipPath id={groupAxisTickLabelClipPathUniqueId}>
          {groupAxisTickLabelClipShape}
        </clipPath>
      );
    }
    return false;
  }
}
