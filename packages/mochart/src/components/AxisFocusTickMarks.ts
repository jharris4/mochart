import { Renderer, svgEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { translate } from '../utils/utils';
import type { AxisConfigBase } from '../types/config';
import type { AxisLayoutInfo } from '../types/layout';

interface AxisFocusTickMarksProps {
  axisConfig: AxisConfigBase;
  axisLayoutInfo: AxisLayoutInfo;
  focusPercentages: number[];
}

interface FocusTickHandle {
  root: ReturnType<typeof svgEl>;
  line: ReturnType<typeof svgEl>;
}

export default class AxisFocusTickMarks extends Renderer<AxisFocusTickMarksProps> {
  root = svgEl('g');
  ticks = this.elList<number, FocusTickHandle>(this.root);

  create() {
    return this.root.node;
  }

  sync() {
    const { axisConfig } = this.props;
    if (axisConfig.focusTickMarks) {
      const { axisLayoutInfo, focusPercentages } = this.props;
      const { vertical, focusTickMarkX1, focusTickMarkY1, focusTickMarkX2, focusTickMarkY2 } = axisLayoutInfo;

      let tickX = 0;
      let tickY = 0;

      this.setPresent(true);
      this.root.set({ className: mochartCssClasses['axisFocusTickMarks'] });
      this.ticks.sync(focusPercentages, {
        key: (_focusPercentage, i) => 'focus-tick-mark-' + i,
        create: () => {
          const root = svgEl('g');
          const line = svgEl('line');
          root.append(line);
          return { root, line };
        },
        update: (handle, focusPercentage, i) => {
          if (vertical) {
            tickY = focusPercentage * axisLayoutInfo.height;
          }
          else {
            tickX = focusPercentage * axisLayoutInfo.width;
          }
          handle.root.set({ className: mochartCssClasses['axisFocusTickMark'] + i, transform: translate(tickX, tickY) });
          handle.line.set({ x1: focusTickMarkX1, y1: focusTickMarkY1, x2: focusTickMarkX2, y2: focusTickMarkY2,
            stroke: axisConfig.focusTickMarkColor, strokeOpacity: axisConfig.focusTickMarkOpacity, strokeWidth: axisConfig.focusTickMarkWidth });
        }
      });
    }
    else {
      this.setPresent(false);
    }
  }
}
