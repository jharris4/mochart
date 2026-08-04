import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { translate } from '../utils/utils';
import { getAxisFocusStyle } from '../utils/FocusValue';
import { styleToAttributes } from '../utils/style';
import type { AxisTick } from '../types/data';
import type { AxisConfigBase } from '../types/config';
import type { AxisLayoutInfo } from '../types/layout';

const hiddenStyle = {
  visibility: 'hidden'
};

interface AxisTickMarksProps {
  axisConfig: AxisConfigBase & { useSeriesFocus?: boolean };
  axisLayoutInfo: AxisLayoutInfo;
  axisTicks: AxisTick[];
  axisFocusPercentage: number | null;
  seriesFocusPercentage: number | null;
}

interface TickMarkHandle {
  root: ReturnType<typeof svgEl>;
  line: ReturnType<typeof svgEl>;
}

export default class AxisTickMarks extends Renderer<AxisTickMarksProps> {
  root = svgEl('g');
  ticks = this.elList<AxisTick, TickMarkHandle>(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { axisConfig } = this.props;
    if (axisConfig.showTickMarks) {
      const { axisLayoutInfo, axisTicks, axisFocusPercentage, seriesFocusPercentage } = this.props;
      const { vertical, tickMarkX1, tickMarkY1, tickMarkX2, tickMarkY2 } = axisLayoutInfo;

      let tickX = 0;
      let tickY = 0;

      const styleAttributes = styleToAttributes(getAxisFocusStyle(axisFocusPercentage, seriesFocusPercentage,
        axisConfig.useSeriesFocus ?? false, axisConfig.tickMarkStyle));

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['axisTickMarks'] });
      this.ticks.sync(axisTicks, {
        key: (_tick, i) => 'tick-mark-' + i,
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
            ...styleAttributes });
        }
      });
    }
    else {
      this.setPresent(false);
    }
  }
}
