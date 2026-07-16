// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { translate } from '../utils/utils';
import { getAxisFocusColor, getAxisFocusOpacity } from '../utils/FocusValue';

const hiddenStyle = {
  visibility: 'hidden'
};

export default class AxisTickMarks extends Renderer {
  root = svgEl('g');
  ticks = this.elList(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { axisConfig } = this.props;
    if (axisConfig.tickMarks) {
      const { axisLayoutInfo, axisTicks, axisFocusPercentage, seriesFocusPercentage } = this.props;
      const { vertical, tickMarkX1, tickMarkY1, tickMarkX2, tickMarkY2 } = axisLayoutInfo;

      let tickX = 0;
      let tickY = 0;

      const stroke = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
        axisConfig.tickMarkColor, axisConfig.tickMarkFocusedColor, axisConfig.tickMarkDefocusedColor);
      const strokeOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
        axisConfig.tickMarkOpacity, axisConfig.tickMarkFocusedOpacity, axisConfig.tickMarkDefocusedOpacity);
      const strokeWidth = axisConfig.tickMarkWidth;

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['axisTickMarks'] });
      this.ticks.sync(axisTicks, {
        key: (tick, i) => 'tick-mark-' + i,
        create: () => {
          const root = svgEl('g');
          const line = svgEl('line');
          root.append(line);
          return { root, line };
        },
        update: (handle, tick, i) => {
          if (vertical) {
            tickY = tick.position;
          }
          else {
            tickX = tick.position;
          }
          handle.root.set({ className: mochartCssClasses['axisTickMark'] + i, transform: translate(tickX, tickY) });
          handle.line.set({ x1: tickMarkX1, y1: tickMarkY1, x2: tickMarkX2, y2: tickMarkY2, style: tick.hidden ? hiddenStyle : null,
            stroke, strokeOpacity, strokeWidth });
        }
      });
    }
    else {
      this.setPresent(false);
    }
  }
}
