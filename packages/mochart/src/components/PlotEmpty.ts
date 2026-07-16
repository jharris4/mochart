// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

import Axis from './Axis';

const emptyFocusPercentages = [];
const emptyTicks = [];

export default class PlotEmpty extends Renderer {
  root = svgEl('g');
  groupAxis = this.slot(this.root);
  seriesAxes = this.rendererList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { mochartConfig, groupAxisLayoutInfo, seriesAxisLayoutInfos, plotLayoutInfo,
      groupAxisTitleClipPathUniqueId, groupAxisTickLabelClipPathUniqueId, seriesAxisTitleClipPathUniqueIds } = this.props;
    const { groupAxisConfig, seriesAxisConfigs } = mochartConfig;

    const commonProps = {
      plotLayoutInfo,
      focusPercentages: emptyFocusPercentages,
      tickSpacing: null,
      axisTicks: emptyTicks
    };

    this.root.set({ className: mochartCssClasses['plot'] });

    this.groupAxis.set(Axis, { front: false, axisClass: mochartCssClasses['groupAxis'], axisConfig: groupAxisConfig, axisLayoutInfo: groupAxisLayoutInfo,
      titleClipPathUniqueId: groupAxisTitleClipPathUniqueId, tickLabelClipPathUniqueId: groupAxisTickLabelClipPathUniqueId,
      ...commonProps });

    this.seriesAxes.sync(seriesAxisConfigs.map(axisConfig => {
      const { id } = axisConfig;
      return {
        key: 'series-axis-' + id,
        ctor: Axis,
        props: { front: false, axisClass: mochartCssClasses['seriesAxis'] + id, axisConfig,
          axisLayoutInfo: seriesAxisLayoutInfos[id], titleClipPathUniqueId: seriesAxisTitleClipPathUniqueIds[id],
          ...commonProps }
      };
    }));
  }
}
