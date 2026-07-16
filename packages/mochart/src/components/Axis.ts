// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl } from '../render';

import AxisBackground from './AxisBackground';
import AxisLine from './AxisLine';
import AxisTitle from './AxisTitle';
import AxisTickMarks from './AxisTickMarks';
import AxisTickLabels from './AxisTickLabels';
import AxisFocusTickMarks from './AxisFocusTickMarks';
import AxisFocusRange from './AxisFocusRange';

import { translateObject } from '../utils/utils';

export default class Axis extends Renderer {
  static defaultProps = {
    onMouseEnter: null,
    onMouseLeave: null,
    onClick: null
  };

  root = svgEl('g');
  inner = svgEl('g');
  backgroundSlot = this.slot(this.inner);
  lineSlot = this.slot(this.inner);
  focusRangeSlot = this.slot(this.inner);
  tickMarksSlot = this.slot(this.inner);
  tickLabelsSlot = this.slot(this.inner);
  titleSlot = this.slot(this.inner);
  focusTickMarksSlot = this.slot(this.inner);

  create() {
    this.root.append(this.inner);
    return this.root.node;
  }

  sync() {
    const { front, axisConfig, axisLayoutInfo, plotLayoutInfo, axisClass, axisTicks, axisFocusPercentage, seriesFocusPercentage,
      focusPercentages, tickSpacing, titleClipPathUniqueId, tickLabelClipPathUniqueId,
      onMouseEnter, onMouseLeave, onClick } = this.props;
    if (axisConfig.visible) {
      const { backgroundFront, axisLineFront, focusRangeFront, focusTickMarksFront, tickLabelFront, tickMarkFront, titleFront } = axisConfig;

      this.setPresent(true);
      this.root.set({ className: axisClass });
      this.inner.set({ transform: translateObject(axisLayoutInfo), onMouseEnter, onMouseLeave, onClick });

      if (front !== backgroundFront) {
        this.backgroundSlot.set(null);
      }
      else {
        this.backgroundSlot.set(AxisBackground, { axisConfig, axisLayoutInfo });
      }

      if (front !== axisLineFront) {
        this.lineSlot.set(null);
      }
      else {
        this.lineSlot.set(AxisLine, { axisConfig, axisLayoutInfo, axisFocusPercentage, seriesFocusPercentage });
      }

      if (front !== focusRangeFront) {
        this.focusRangeSlot.set(null);
      }
      else {
        this.focusRangeSlot.set(AxisFocusRange, { axisConfig, axisLayoutInfo, focusPercentages });
      }

      if (front !== tickMarkFront) {
        this.tickMarksSlot.set(null);
      }
      else {
        this.tickMarksSlot.set(AxisTickMarks, { axisConfig, axisLayoutInfo, axisTicks, axisFocusPercentage, seriesFocusPercentage });
      }

      if (front !== tickLabelFront) {
        this.tickLabelsSlot.set(null);
      }
      else {
        this.tickLabelsSlot.set(AxisTickLabels, { axisLayoutInfo, plotLayoutInfo,
          axisFocusPercentage, seriesFocusPercentage,
          axisConfig, axisTicks,
          tickSpacing, tickLabelClipPathUniqueId });
      }

      if (front !== titleFront) {
        this.titleSlot.set(null);
      }
      else {
        this.titleSlot.set(AxisTitle, { axisConfig, axisLayoutInfo, titleClipPathUniqueId, axisFocusPercentage, seriesFocusPercentage });
      }

      if (front !== focusTickMarksFront) {
        this.focusTickMarksSlot.set(null);
      }
      else {
        this.focusTickMarksSlot.set(AxisFocusTickMarks, { axisConfig, axisLayoutInfo, focusPercentages });
      }
    }
    else {
      this.setPresent(false);
    }
  }
}
