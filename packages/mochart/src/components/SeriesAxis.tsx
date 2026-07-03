// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';

import Axis from './Axis';

const noOp = () => {};

export default class SeriesAxis extends PureComponent {

  constructor(props) {
    super(props);
    this.state = { onSeriesAxisEnter: noOp, onSeriesAxisLeave: noOp, onSeriesAxisClick: noOp };
  }

  componentWillMount() {
    let state = this.buildEventListeners(this.props);
    this.setState(state);
  }

  componentWillReceiveProps(nextProps) {
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

  render() {
    const { front, seriesAxisConfig, seriesAxisLayoutInfo, plotLayoutInfo, focusPercentages, axisFocusPercentage, seriesFocusPercentage,
      seriesCount, seriesAxisData, titleClipPathUniqueId } = this.props;
    const { onSeriesAxisEnter, onSeriesAxisLeave, onSeriesAxisClick } = this.state;
    if (seriesAxisConfig.alwaysVisible || seriesCount > 0) {
      const axisId = seriesAxisConfig.id;
      return (
        <Axis front={front} axisClass={mochartCssClasses['seriesAxis'] + axisId} axisConfig={seriesAxisConfig}
              axisLayoutInfo={seriesAxisLayoutInfo} plotLayoutInfo={plotLayoutInfo}
              focusPercentages={focusPercentages} axisTicks={seriesAxisData.axisTickData[axisId]}
              axisFocusPercentage={axisFocusPercentage} seriesFocusPercentage={seriesFocusPercentage}
              titleClipPathUniqueId={titleClipPathUniqueId} onMouseEnter={onSeriesAxisEnter}
              onMouseLeave={onSeriesAxisLeave} onClick={onSeriesAxisClick}/>
      );
    }
    return false;
  }
}
