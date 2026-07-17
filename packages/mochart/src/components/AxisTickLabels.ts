import { Renderer, svgEl, textEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { layoutInfoExtentChanged } from '../layout/LayoutInfo';
import { prepareTruncation, getTruncatedText, updateTruncation } from '../utils/TextTruncation';
import { SCALE_ORDINAL } from '../config/core/constants';
import { translate } from '../utils/utils';
import { getClipPathReference } from '../utils/svgUtils';
import { getAxisFocusColor, getAxisFocusOpacity } from '../utils/FocusValue';
import Background from './Background';
import type { El, TextEl } from '../render';
import type { AxisConfigBase, GroupAxisConfig, SeriesAxisConfig } from '../types/config';
import type { AxisTick } from '../types/data';
import type { AxisLayoutInfo, SpacingLayoutInfo } from '../types/layout';
import type { FocusPercentage } from '../types/animation';
import type { TruncationDataValue } from '../utils/TextTruncation';

const emptyArray: string[] = [];

type AxisDisplayConfig = AxisConfigBase &
  Pick<GroupAxisConfig, 'scale'> &
  Partial<Pick<GroupAxisConfig, 'tickLabelTruncationEnabled' | 'tickLabelTruncationValue' | 'tickLabelTruncationMinLength' | 'tickLabelTruncationMaxPercent'>> &
  Partial<Pick<SeriesAxisConfig, 'useSeriesFocus'>>;

interface AxisTickLabelsProps {
  axisConfig: AxisDisplayConfig;
  axisLayoutInfo: AxisLayoutInfo;
  plotLayoutInfo: SpacingLayoutInfo;
  axisTicks: AxisTick[];
  tickSpacing: number | null;
  tickLabelClipPathUniqueId?: string;
  axisFocusPercentage: FocusPercentage;
  seriesFocusPercentage: FocusPercentage;
}
interface AxisTickLabelsState { truncationData: TruncationDataValue }
type SizeLabelEl = El & { textHandle: El; valueHandle: TextEl };
interface TickLabelHandle { root: El; text: El; value: TextEl }

function getTruncationChanged(sizeChanged: boolean, ticksChanged: boolean, oldProps: AxisTickLabelsProps, newProps: AxisTickLabelsProps): boolean {
  if (sizeChanged) {
    return true;
  }
  else if (ticksChanged) {
    const { axisTicks: oldTicks } = oldProps;
    const { axisTicks: newTicks } = newProps;
    if (oldTicks.length === newTicks.length) {
      const tickLength = oldTicks.length;
      let i;
      for (i = 0; i < tickLength; i++) {
        if (oldTicks[i].label !== newTicks[i].label) {
          return true;
        }
      }
      return false;
    }
    return true;
  }
  else {
    return false;
  }
}

export default class AxisTickLabels extends Renderer<AxisTickLabelsProps, AxisTickLabelsState> {
  root = svgEl('g');
  background = this.slot(this.root);
  tickLabelsGroup = svgEl('g');
  tickLabels = this.elList<AxisTick, TickLabelHandle>(this.tickLabelsGroup);
  sizeTickLabel = this.elSlot(this.tickLabelsGroup);
  truncationData: TruncationDataValue = null;
  checkTruncation = false;

  constructor() {
    super();
    this.state = { truncationData: null };
    this.truncationData = null;
    this.checkTruncation = false;
  }

  derive(props: AxisTickLabelsProps, _state: AxisTickLabelsState, prevProps: AxisTickLabelsProps | null): Partial<AxisTickLabelsState> | null {
    if (prevProps === null) {
      this.checkTruncation = props.axisConfig.tickLabelTruncationEnabled ?? false;
      return null;
    }
    const { axisConfig, axisLayoutInfo, plotLayoutInfo, axisTicks, tickSpacing } = props;

    const truncationEnabled = axisConfig.tickLabelTruncationEnabled ?? false;
    let truncationChanged = false;
    let integrityChanged = true;
    if (truncationEnabled) {
      const sizeChanged = layoutInfoExtentChanged(prevProps.axisLayoutInfo, axisLayoutInfo) ||
        layoutInfoExtentChanged(prevProps.plotLayoutInfo, plotLayoutInfo) ||
        axisLayoutInfo.totalTitleSize !== prevProps.axisLayoutInfo.totalTitleSize || axisLayoutInfo.totalTickLabelSize !== prevProps.axisLayoutInfo.totalTickLabelSize ||
        axisLayoutInfo.tickLabelParallel !== prevProps.axisLayoutInfo.tickLabelParallel ||
        tickSpacing !== prevProps.tickSpacing;
      const ticksChanged = axisTicks !== prevProps.axisTicks;
      truncationChanged = getTruncationChanged(sizeChanged, ticksChanged, prevProps, props);
      const axisTickCount = axisTicks !== null ? axisTicks.length : 0;
      integrityChanged = Array.isArray(this.truncationData) && axisTickCount === this.truncationData.length;
    }
    const { checkTruncation, truncationData } = prepareTruncation(truncationEnabled, truncationChanged, this.truncationData, integrityChanged);

    this.truncationData = truncationData;
    this.checkTruncation = checkTruncation;
    return { truncationData };
  }

  create() {
    this.root.append(this.tickLabelsGroup);
    return this.root.node;
  }

  sync() {
    const { axisConfig, axisLayoutInfo, axisTicks, tickLabelClipPathUniqueId, axisFocusPercentage, seriesFocusPercentage } = this.props;
    const { truncationData } = this.state;
    const { vertical, tickLabelAnchor, tickTextX, tickTextY } = axisLayoutInfo;
    const { tickLabelRotation } = axisConfig;

    const tickTextStyle = {
      textAnchor: tickLabelAnchor
    };
    const hiddenStyle = {
      visibility: 'hidden'
    };
    const hiddenTickTextStyle = Object.assign({}, tickTextStyle, hiddenStyle);

    const tickTextDY = vertical ? '0.35em' : '0.35em';

    let tickX = 0;
    let tickY = 0;

    const tickRotationTransform = tickLabelRotation === 0 ? null : 'rotate(' + tickLabelRotation + ')';

    const truncationEnabled = axisConfig.tickLabelTruncationEnabled ?? false;
    const truncationValue = axisConfig.tickLabelTruncationValue ?? '';
    const useSeriesFocus = axisConfig.useSeriesFocus ?? false;
    let tickLabels = getTruncatedText(truncationEnabled, truncationValue, axisTicks.map(tick => String(tick.label)), truncationData);

    const clipPath = truncationEnabled && tickLabelClipPathUniqueId ? getClipPathReference(tickLabelClipPathUniqueId) : null;

    const stroke = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus,
      axisConfig.tickLabelStrokeColor, axisConfig.tickLabelFocusedStrokeColor, axisConfig.tickLabelDefocusedStrokeColor);
    const fill = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus,
      axisConfig.tickLabelFillColor, axisConfig.tickLabelFocusedFillColor, axisConfig.tickLabelDefocusedFillColor);
    const strokeOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus,
      axisConfig.tickLabelStrokeOpacity, axisConfig.tickLabelFocusedStrokeOpacity, axisConfig.tickLabelDefocusedStrokeOpacity);
    const fillOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, useSeriesFocus,
      axisConfig.tickLabelFillOpacity, axisConfig.tickLabelFocusedFillOpacity, axisConfig.tickLabelDefocusedFillOpacity);

    this.root.set({ className: mochartCssClasses['axisTickLabels'] });
    this.background.set(Background, { config: axisConfig, configStyleKey: 'tickLabelBackgroundStyle', classKey: 'axisTickLabelBackground', spacingRelative: false, spacingLayoutInfo: axisLayoutInfo.tickLabelLayoutInfo });

    this.tickLabels.sync(axisTicks, {
      key: (tick, i) => 'tick-label-' + i,
      create: () => {
        const root = svgEl('g');
        const text = svgEl('text');
        const value = textEl();
        text.append(value);
        root.append(text);
        return { root, text, value };
      },
      update: (handle, tick, i) => {
        if (vertical) {
          tickY = tick.position;
        }
        else {
          tickX = tick.position;
        }
        handle.root.set({ className: mochartCssClasses['axisTickLabel'] + i,
          transform: translate(tickX + tickTextX, tickY + tickTextY), clipPath });
        handle.text.set({ style: tick.hidden ? hiddenTickTextStyle : tickTextStyle, dy: tickTextDY, transform: tickRotationTransform,
          stroke, strokeOpacity, fill, fillOpacity, strokeWidth: axisConfig.tickLabelStrokeWidth });
        handle.value.set(tickLabels[i]);
      }
    });

    if (axisConfig.scale === SCALE_ORDINAL && truncationEnabled) {
      const sizeLabel = this.sizeTickLabel.set('size-label', () => {
        const group = svgEl('g') as SizeLabelEl;
        const text = svgEl('text');
        const value = textEl();
        text.append(value);
        group.append(text);
        group.textHandle = text;
        group.valueHandle = value;
        return group;
      });
      const typedSizeLabel = sizeLabel as SizeLabelEl;
      typedSizeLabel.set({ className: mochartCssClasses['axisSizeTickLabel'] });
      typedSizeLabel.textHandle.set({ style: hiddenStyle });
      typedSizeLabel.valueHandle.set('W' + truncationValue);
    }
    else {
      this.sizeTickLabel.set(null);
    }
  }

  measure(prevProps: AxisTickLabelsProps | null) {
    if (prevProps === null) {
      // truncation is only rechecked after updates; the initial sync renders untruncated
      return;
    }
    if (this.checkTruncation) {
      const domElements = this.tickLabelsGroup.node.querySelectorAll<SVGTextContentElement>(getAxisTickLabelsCssSelector());

      const { axisLayoutInfo, tickSpacing, axisConfig, plotLayoutInfo, axisTicks } = this.props;
      const { vertical } = axisLayoutInfo;
      const tickLabelTruncationValue = axisConfig.tickLabelTruncationValue ?? '';
      let axisTickLabels = emptyArray; // optimization for when tick labels are not needed...
      if (this.state.truncationData === null) {
        axisTickLabels = axisTicks.map(tick => String(tick.label));
      }
      let maxLength = tickSpacing ?? 0;
      if (!axisLayoutInfo.tickLabelParallel) {
        maxLength = Math.max(axisConfig.tickLabelTruncationMinLength ?? 0,
          (axisConfig.tickLabelTruncationMaxPercent ?? 0) * (vertical ? plotLayoutInfo.width : plotLayoutInfo.height));
      }

      const { checkTruncation, truncationData } = updateTruncation(tickLabelTruncationValue, this.state.truncationData, axisTickLabels, maxLength, domElements);
      if (checkTruncation) {
        this.setState({ truncationData });
      }
      this.checkTruncation = checkTruncation;
    }
  }
}

function getAxisTickLabelsCssSelector() {
  return '.' + mochartCssClasses['axisTickLabel'].split(' ')[0] + ' text';
}
