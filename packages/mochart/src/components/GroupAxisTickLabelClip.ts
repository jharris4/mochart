import { Renderer, svgEl } from '../render';

import { ANCHOR_END, ANCHOR_MIDDLE } from '../config/core/constants';
import type { MochartConfig } from '../types/config';
import type { GroupAxisLayoutInfo, SpacingLayoutInfo } from '../types/layout';

interface GroupAxisTickLabelClipProps {
  mochartConfig: MochartConfig;
  groupAxisLayoutInfo: GroupAxisLayoutInfo;
  chartContentLayoutInfo: SpacingLayoutInfo;
  groupAxisTickLabelClipPathUniqueId: string;
  maxTickLabelLength: number;
}

export default class GroupAxisTickLabelClip extends Renderer<GroupAxisTickLabelClipProps> {
  root = svgEl('clipPath');
  rect = svgEl('rect');

  create() {
    this.root.append(this.rect);
    return this.root.node;
  }

  sync() {
    const { mochartConfig, groupAxisLayoutInfo, chartContentLayoutInfo, groupAxisTickLabelClipPathUniqueId } = this.props;
    let { maxTickLabelLength } = this.props;
    const { groupAxisConfig, plotConfig } = mochartConfig;
    if (groupAxisConfig.visible && groupAxisConfig.tickLabelTruncationEnabled) {
      const { tickLabelParallel, tickHeight, tickLabelAnchor } = groupAxisLayoutInfo;
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

      this.setPresent(true);
      this.root.set({ id: groupAxisTickLabelClipPathUniqueId });
      this.rect.set({ transform: tickRotationTransform, x, y, width, height });
    }
    else {
      this.setPresent(false);
    }
  }
}
