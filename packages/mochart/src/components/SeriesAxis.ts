// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';

import Axis from './Axis';

const noOp = () => {};

export default class SeriesAxis extends Renderer {
  axis = null;

  constructor() {
    super();
    this.state = { onSeriesAxisEnter: noOp, onSeriesAxisLeave: noOp, onSeriesAxisClick: noOp };
  }

  willMount() {
    let state = this.buildEventListeners(this.props);
    this.setState(state);
  }

  willReceiveProps(nextProps) {
    const { seriesAxisConfig, onFocus } = nextProps;
    if (seriesAxisConfig !== this.props.seriesAxisConfig || onFocus !== this.props.onFocus) {
      let state = this.buildEventListeners(nextProps);
      this.setState(state);
    }
  }

  buildEventListeners(props) {
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
      this.axis.set(Axis, { front, axisClass: mochartCssClasses['seriesAxis'] + axisId, axisConfig: seriesAxisConfig,
        axisLayoutInfo: seriesAxisLayoutInfo, plotLayoutInfo,
        focusPercentages, axisTicks: seriesAxisData.axisTickData[axisId],
        axisFocusPercentage, seriesFocusPercentage,
        titleClipPathUniqueId, onMouseEnter: onSeriesAxisEnter,
        onMouseLeave: onSeriesAxisLeave, onClick: onSeriesAxisClick });
    }
    else {
      this.axis.set(null);
    }
  }
}
