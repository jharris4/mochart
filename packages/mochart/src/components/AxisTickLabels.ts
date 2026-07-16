// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl, textEl } from '../render';

import { mochartCssClasses } from '../utils/ChartDom';
import { layoutInfoExtentChanged } from '../layout/LayoutInfo';
import { prepareTruncation, getTruncatedText, updateTruncation } from '../utils/TextTruncation';
import { SCALE_ORDINAL } from '../config/core/constants';
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

export default class AxisTickLabels extends Renderer {
  root = svgEl('g');
  background = this.slot(this.root);
  tickLabelsGroup = svgEl('g');
  tickLabels = this.elList(this.tickLabelsGroup);
  sizeTickLabel = this.elSlot(this.tickLabelsGroup);

  constructor() {
    super();
    this.state = { truncationData: null };
    this.truncationData = null;
    this.checkTruncation = false;
  }

  willMount() {
    this.checkTruncation = this.props.axisConfig.tickLabelTruncationEnabled;
  }

  willReceiveProps(nextProps) {
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
      integrityChanged = this.truncationData !== null && axisTickCount === this.truncationData.length;
    }
    const { checkTruncation, truncationData } = prepareTruncation(truncationEnabled, truncationChanged, this.truncationData, integrityChanged);

    this.setState({ truncationData });
    this.truncationData = truncationData;
    this.checkTruncation = checkTruncation;
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

    let tickLabels = getTruncatedText(axisConfig.tickLabelTruncationEnabled, axisConfig.tickLabelTruncationValue, axisTicks.map(tick => tick.label), truncationData);

    const clipPath = axisConfig.tickLabelTruncationEnabled ? getClipPathReference(tickLabelClipPathUniqueId) : null;

    const stroke = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
      axisConfig.tickLabelStrokeColor, axisConfig.tickLabelFocusedStrokeColor, axisConfig.tickLabelDefocusedStrokeColor);
    const fill = getAxisFocusColor(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
      axisConfig.tickLabelFillColor, axisConfig.tickLabelFocusedFillColor, axisConfig.tickLabelDefocusedFillColor);
    const strokeOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
      axisConfig.tickLabelStrokeOpacity, axisConfig.tickLabelFocusedStrokeOpacity, axisConfig.tickLabelDefocusedStrokeOpacity);
    const fillOpacity = getAxisFocusOpacity(axisFocusPercentage, seriesFocusPercentage, axisConfig.useSeriesFocus,
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

    if (axisConfig.scale === SCALE_ORDINAL && axisConfig.tickLabelTruncationEnabled) {
      const sizeLabel = this.sizeTickLabel.set('size-label', () => {
        const group = svgEl('g');
        const text = svgEl('text');
        const value = textEl();
        text.append(value);
        group.append(text);
        group.textHandle = text;
        group.valueHandle = value;
        return group;
      });
      sizeLabel.set({ className: mochartCssClasses['axisSizeTickLabel'] });
      sizeLabel.textHandle.set({ style: hiddenStyle });
      sizeLabel.valueHandle.set('W' + axisConfig.tickLabelTruncationValue);
    }
    else {
      this.sizeTickLabel.set(null);
    }
  }

  didUpdate() {
    if (this.checkTruncation) {
      const domElements = this.tickLabelsGroup.node.querySelectorAll(getAxisTickLabelsCssSelector());

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
