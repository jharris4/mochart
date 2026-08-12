import { Renderer, Slot } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

import Axis from './Axis';
import type { EnhancedValueAxisConfig } from '../types/enhanced';
import type { AxisTick, ValueAxisData } from '../types/data';
import type { AxisLayoutInfo, SpacingLayoutInfo } from '../types/layout';

interface ValueAxisFocus { valueAxisId: string | null }
interface ValueAxisProps {
  front: boolean;
  valueAxisConfig: EnhancedValueAxisConfig;
  valueAxisLayoutInfo: AxisLayoutInfo;
  plotLayoutInfo: SpacingLayoutInfo;
  focusPercentages: number[];
  axisFocusPercentage: number | null;
  seriesFocusPercentage: number | null;
  seriesCount: number;
  valueAxisData: ValueAxisData & { axisTickData: Record<string, AxisTick[]> };
  titleClipPathUniqueId: string;
  focusedValueAxisId: string | null;
  onFocus: (focus: ValueAxisFocus) => void;
  accessibility: boolean;
  accessibleLabel: string;
}
interface ValueAxisState {
  onValueAxisEnter: () => void;
  onValueAxisLeave: () => void;
  onValueAxisClick: () => void;
}

const noOp = () => {};

export default class ValueAxis extends Renderer<ValueAxisProps, ValueAxisState> {
  axis: Slot | null = null;

  constructor() {
    super();
    this.state = { onValueAxisEnter: noOp, onValueAxisLeave: noOp, onValueAxisClick: noOp };
  }

  derive(props: ValueAxisProps, _state: ValueAxisState, prevProps: ValueAxisProps | null): Partial<ValueAxisState> | null {
    if (prevProps === null) {
      return this.buildEventListeners(props);
    }
    const { valueAxisConfig, onFocus, focusedValueAxisId } = props;
    if (valueAxisConfig !== prevProps.valueAxisConfig || onFocus !== prevProps.onFocus || focusedValueAxisId !== prevProps.focusedValueAxisId) {
      return this.buildEventListeners(props);
    }
    return null;
  }

  buildEventListeners(props: ValueAxisProps): ValueAxisState {
    const { valueAxisConfig, onFocus, focusedValueAxisId } = props;
    const valueAxisId = valueAxisConfig.id;

    let onValueAxisEnter = noOp;
    let onValueAxisLeave = noOp;
    let onValueAxisClick = noOp;

    if (valueAxisConfig.focusOnMouseOver) {
      onValueAxisEnter = () => { onFocus({ valueAxisId }); };
      onValueAxisLeave = () => { onFocus({ valueAxisId: null }); };
    }
    if (valueAxisConfig.focusOnClick) {
      // second click on the focused axis toggles the focus off, matching series/legend clicks
      onValueAxisClick = () => { onFocus({ valueAxisId: valueAxisId === focusedValueAxisId ? null : valueAxisId }); };
    }

    return { onValueAxisEnter, onValueAxisLeave, onValueAxisClick };
  }

  create() {
    this.axis = this.slot();
    return null;
  }

  sync() {
    const { front, valueAxisConfig, valueAxisLayoutInfo, plotLayoutInfo, focusPercentages, axisFocusPercentage, seriesFocusPercentage,
      seriesCount, valueAxisData, titleClipPathUniqueId, accessibility, accessibleLabel } = this.props;
    const { onValueAxisEnter, onValueAxisLeave, onValueAxisClick } = this.state;
    if (valueAxisConfig.visibleWhenAllFiltered || seriesCount > 0) {
      const axisId = valueAxisConfig.id;
      this.axis!.set(Axis, { front, axisClass: mochartCssClasses['valueAxis'] + axisId, axisConfig: valueAxisConfig,
        axisLayoutInfo: valueAxisLayoutInfo, plotLayoutInfo,
        focusPercentages, axisTicks: valueAxisData.axisTickData[axisId],
        axisFocusPercentage, seriesFocusPercentage,
        titleClipPathUniqueId, onMouseEnter: onValueAxisEnter,
        onMouseLeave: onValueAxisLeave, onClick: onValueAxisClick, accessibility, accessibleLabel });
    }
    else {
      this.axis!.set(null);
    }
  }
}
