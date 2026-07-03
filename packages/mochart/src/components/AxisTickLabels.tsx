// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { mochartCssClasses } from '../utils/ChartDom';
import { layoutInfoExtentChanged } from '../layout/LayoutInfo';
import { prepareTruncation, getTruncatedText, updateTruncation } from '../utils/TextTruncation';
import { AUTO, SCALE_ORDINAL, ANCHOR_START, ANCHOR_END, ANCHOR_MIDDLE } from '../config/core/constants';
import { translate } from '../utils/utils';
import { getClipPathReference } from '../utils/svgUtils';
import { getAxisFocusColor, getAxisFocusOpacity } from '../utils/FocusValue';
import Background from './Background';

const emptyArray = [];

function getTruncationChanged(sizeChanged, ticksChanged, oldProps, newProps) {
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

export default class AxisTickLabels extends PureComponent {

  constructor(props) {
    super(props);

    // refs created on render
    this.tickLabelsRef = null;

    this.state = { truncationData: null };
    this.truncationData = null;
    this.checkTruncation = props.axisConfig.tickLabelTruncationEnabled;
  }

  componentWillReceiveProps(nextProps) {
    const { axisConfig, axisLayoutInfo, plotLayoutInfo, axisTicks, tickSpacing } = nextProps;

    const truncationEnabled = axisConfig.tickLabelTruncationEnabled;
    let truncationChanged = false;
    let integrityChanged = true;
    if (truncationEnabled) {
      const sizeChanged = layoutInfoExtentChanged(this.props.axisLayoutInfo, axisLayoutInfo) ||
        layoutInfoExtentChanged(this.props.plotLayoutInfo, plotLayoutInfo) ||
        axisLayoutInfo.totalTitleSize !== this.props.axisLayoutInfo.totalTitleSize || axisLayoutInfo.totalTickLabelSize !== this.props.axisLayoutInfo.totalTickLabelSize ||
        axisLayoutInfo.tickLabelParallel !== this.props.axisLayoutInfo.tickLabelParallel ||
        tickSpacing !== this.props.tickSpacing;
      const ticksChanged = axisTicks !== this.props.axisTicks;
      truncationChanged = getTruncationChanged(sizeChanged, ticksChanged, this.props, nextProps);
      const axisTickCount = axisTicks !== null ? axisTicks.length : 0;
      integrityChanged = this.truncationData !== null && axisTickCount === this.truncationData.length
    }
    const { checkTruncation, truncationData } = prepareTruncation(truncationEnabled, truncationChanged, this.truncationData, integrityChanged);

    this.setState({ truncationData });
    this.truncationData = truncationData;
    this.checkTruncation = checkTruncation;
  }

  setTickLabelsRef = (ref) => {
    this.tickLabelsRef = ref;
  }

  render() {
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
    let tickLabel;

    const tickRotationTransform = tickLabelRotation === 0 ? null : 'rotate(' + tickLabelRotation + ')';

    let tickLabels = getTruncatedText(axisConfig.tickLabelTruncationEnabled, axisConfig.tickLabelTruncationValue, axisTicks.map(tick => tick.label), truncationData);

    const clipPath = axisConfig.tickLabelTruncationEnabled ? getClipPathReference(tickLabelClipPathUniqueId) : null;

    let axisSizeTickLabel = null;
    if (axisConfig.scale === SCALE_ORDINAL && axisConfig.tickLabelTruncationEnabled) {
      axisSizeTickLabel = (
        <g className={mochartCssClasses['axisSizeTickLabel']}>
          <text style={hiddenStyle}>{'W' + axisConfig.tickLabelTruncationValue}</text>
        </g>
      );
    }

    const stroke = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
      axisConfig.tickLabelStrokeColor, axisConfig.tickLabelFocusedStrokeColor, axisConfig.tickLabelDefocusedStrokeColor);
    const fill = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
      axisConfig.tickLabelFillColor, axisConfig.tickLabelFocusedFillColor, axisConfig.tickLabelDefocusedFillColor);
    const strokeOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
      axisConfig.tickLabelStrokeOpacity, axisConfig.tickLabelFocusedStrokeOpacity, axisConfig.tickLabelDefocusedStrokeOpacity);
    const fillOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
      axisConfig.tickLabelFillOpacity, axisConfig.tickLabelFocusedFillOpacity, axisConfig.tickLabelDefocusedFillOpacity);

    return (
      <g className={mochartCssClasses['axisTickLabels']}>
        <Background config={axisConfig} configStyleKey={'tickLabelBackgroundStyle'} classKey='axisTickLabelBackground' spacingRelative={false} spacingLayoutInfo={axisLayoutInfo.tickLabelLayoutInfo} />
        <g ref={this.setTickLabelsRef}>
          {axisTicks.map((tick, i) => {
            if (vertical) {
              tickY = tick.position;
            }
            else {
              tickX = tick.position;
            }
            tickLabel = tickLabels[i];
            return (
              <g key={'tick-label-' + i} className={mochartCssClasses['axisTickLabel']+i}
                transform={translate(tickX+tickTextX, tickY+tickTextY)} clipPath={clipPath}>
                <text style={tick.hidden ? hiddenTickTextStyle : tickTextStyle} dy={tickTextDY} transform={tickRotationTransform}
                      stroke={stroke} strokeOpacity={strokeOpacity} fill={fill} fillOpacity={fillOpacity} strokeWidth={axisConfig.tickLabelStrokeWidth}>
                  {tickLabel}
                </text>
              </g>
            );
          })}
          {axisSizeTickLabel}
        </g>
      </g>
    );
  }

  componentDidUpdate() {
    if (this.checkTruncation && this.tickLabelsRef) {
      const domElements = this.tickLabelsRef.querySelectorAll(getAxisTickLabelsCssSelector());

      const { axisLayoutInfo, tickSpacing, axisConfig, plotLayoutInfo, axisTicks } = this.props;
      const { vertical } = axisLayoutInfo;
      const { tickLabelTruncationValue } = axisConfig;
      let axisTickLabels = emptyArray; // optimization for when tick labels are not needed...
      if (this.state.truncationData === null) {
        axisTickLabels = axisTicks.map(tick => tick.label);
      }
      let maxLength = tickSpacing;
      if (!axisLayoutInfo.tickLabelParallel) {
        maxLength = Math.max(axisConfig.tickLabelTruncationMinLength,
          axisConfig.tickLabelTruncationMaxPercent * (vertical ? plotLayoutInfo.width : plotLayoutInfo.height));
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