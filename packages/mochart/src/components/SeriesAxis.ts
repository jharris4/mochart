import { Renderer, Slot } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

import Axis from './Axis';
import type { SeriesAxisConfig } from '../types/config';
import type { AxisTick, SeriesAxisData } from '../types/data';
import type { AxisLayoutInfo, SpacingLayoutInfo } from '../types/layout';

interface SeriesAxisFocus { seriesAxisId: string | null }
interface SeriesAxisProps {
  front: boolean;
  seriesAxisConfig: SeriesAxisConfig;
  seriesAxisLayoutInfo: AxisLayoutInfo;
  plotLayoutInfo: SpacingLayoutInfo;
  focusPercentages: number[];
  axisFocusPercentage: number | null;
  seriesFocusPercentage: number | null;
  seriesCount: number;
  seriesAxisData: SeriesAxisData & { axisTickData: Record<string, AxisTick[]> };
  titleClipPathUniqueId: string;
  onFocus: (focus: SeriesAxisFocus) => void;
}
interface SeriesAxisState {
  onSeriesAxisEnter: () => void;
  onSeriesAxisLeave: () => void;
  onSeriesAxisClick: () => void;
}

const noOp = () => {};

export default class SeriesAxis extends Renderer<SeriesAxisProps, SeriesAxisState> {
  axis: Slot | null = null;

  constructor() {
    super();
    this.state = { onSeriesAxisEnter: noOp, onSeriesAxisLeave: noOp, onSeriesAxisClick: noOp };
  }

  derive(props: SeriesAxisProps, _state: SeriesAxisState, prevProps: SeriesAxisProps | null): Partial<SeriesAxisState> | null {
    if (prevProps === null) {
      return this.buildEventListeners(props);
    }
    const { seriesAxisConfig, onFocus } = props;
    if (seriesAxisConfig !== prevProps.seriesAxisConfig || onFocus !== prevProps.onFocus) {
      return this.buildEventListeners(props);
    }
    return null;
  }

  buildEventListeners(props: SeriesAxisProps): SeriesAxisState {
    const { seriesAxisConfig, onFocus } = props;
    const seriesAxisId = seriesAxisConfig.id;

    let onSeriesAxisEnter = noOp;
    let onSeriesAxisLeave = noOp;
    let onSeriesAxisClick = noOp;

    if (seriesAxisConfig.focusOnMouseOver) {
      onSeriesAxisEnter = () => { onFocus({ seriesAxisId }); };
      onSeriesAxisLeave = () => { onFocus({ seriesAxisId: null }); };
    }
    if (seriesAxisConfig.focusOnClick) {
      onSeriesAxisClick = () => { onFocus({ seriesAxisId }); }; // TODO what about toggle?
    }

    return { onSeriesAxisEnter, onSeriesAxisLeave, onSeriesAxisClick };
  }

  create() {
    this.axis = this.slot();
    return null;
  }

  sync() {
    const { front, seriesAxisConfig, seriesAxisLayoutInfo, plotLayoutInfo, focusPercentages, axisFocusPercentage, seriesFocusPercentage,
      seriesCount, seriesAxisData, titleClipPathUniqueId } = this.props;
    const { onSeriesAxisEnter, onSeriesAxisLeave, onSeriesAxisClick } = this.state;
    if (seriesAxisConfig.alwaysVisible || seriesCount > 0) {
      const axisId = seriesAxisConfig.id;
      this.axis!.set(Axis, { front, axisClass: mochartCssClasses['seriesAxis'] + axisId, axisConfig: seriesAxisConfig,
        axisLayoutInfo: seriesAxisLayoutInfo, plotLayoutInfo,
        focusPercentages, axisTicks: seriesAxisData.axisTickData[axisId],
        axisFocusPercentage, seriesFocusPercentage,
        titleClipPathUniqueId, onMouseEnter: onSeriesAxisEnter,
        onMouseLeave: onSeriesAxisLeave, onClick: onSeriesAxisClick });
    }
    else {
      this.axis!.set(null);
    }
  }
}
