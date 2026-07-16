// @ts-nocheck — ported from the vdom implementation; add types when touched
import { Renderer, svgEl, htmlEl, El } from '../render';

import { getVersionString } from '../version';
import { hasConfigStructureChange } from '../config/core/mochartConfig';
import { isDataProviderValid, getGroupSeriesValueObject, getChartDataGroupCount } from '../data/ChartData';
import { getChartLayoutInfo, getChartLayoutInfoWithMutations } from '../layout/ChartLayout';
import { getTooltipLayoutInfo, getTooltipLayoutInfoWithMutations } from '../layout/TooltipLayout';
import { getAxisData, getAxisDataWithMutations, getAxisDataForGroupChange, getAxisDataForSeriesChange } from '../data/AxisData';
import { getStackData, getStackDataWithMutations } from '../data/StackData';
import { getChartTextBoundsData, getChartTextBoundsDataWithMutations, getTooltipBounds, getBoundsWithMutations } from '../utils/TextMeasurement';
import { mochartCssClasses, getDomAccessors } from '../utils/ChartDom';

import Background from './Background';
import Title from './Title';
import Plot from './Plot';
import PlotEmpty from './PlotEmpty';
import Legend from './Legend';
import LegendClip from './LegendClip';
import Tooltip from './Tooltip';
import TooltipClip from './TooltipClip';
import TitleClip from './TitleClip';
import AxisTitleClip from './AxisTitleClip';
import GroupAxisTickLabelClip from './GroupAxisTickLabelClip';
import SeriesColorGradient from './SeriesColorGradient';
import LinearGradient from './LinearGradient';
import RadialGradient from './RadialGradient';
import { translateObject } from '../utils/utils';
import { getSeriesGradientColors } from '../utils/SeriesColors';

const emptyFilteredFlags = {};

const mochartChartIdPrefix = '__mochart__chart__';
const tooltipClipPathIdPrefix = 'tooltip__clippath__';
const titleClipPathIdPrefix = 'title__clippath__';
const legendClipPathIdPrefix = 'legend__clippath__';
const groupAxisTitleClipPathIdPrefix = 'groupaxistitle__clippath__';
const gridAxisTickLabelClipPathIdPrefix = 'groupaxisticklabel__clippath__';
const seriesAxisTitleClipPathIdPrefix = 'seriesaxistitle__clippath__';
const linearGradientIdPrefix = 'linear__gradient__';
const radialGradientIdPrefix = 'radial__gradient__';
const seriesColorGradientIdPrefix = 'seriescolor__gradient__';
let chartInstanceCounter = 1;

// The getXxxComponent factory props return a DOM Node (or string). The
// defaults below build plain DOM; custom factories from the host app must do
// the same now that the vdom is gone.
function buildMessageDiv(style, message) {
  const el = htmlEl('div');
  el.set({ style });
  el.node.textContent = message;
  return el.node;
}

function getLoadingComponent({ width, height }) {
  return buildMessageDiv({ width: width, height: height, textAlign: 'center', verticalAlign: 'middle', display: 'table-cell' }, 'Loading...');
}

function getErrorComponent({ width, height, error }) {
  let errorMessage = error ? typeof error === 'object' ? JSON.stringify(error) : error : 'Invalid Chart Config';
  return buildMessageDiv({ width: width, height: height, textAlign: 'center', verticalAlign: 'middle', display: 'table-cell' }, errorMessage);
}

function getNoDataComponent({ width, height }) {
  return buildMessageDiv({ width: width, height: height, textAlign: 'center', verticalAlign: 'middle', display: 'table-cell' }, 'No Data');
}

function getNoSizeComponent({ width, height }) {
  let style = {
    textAlign: 'center', verticalAlign: 'middle', display: 'table-cell'
  };
  if (width > 0) {
    style.width = width;
  }
  if (height > 0) {
    style.height = height;
  }
  return buildMessageDiv(style, 'No Size');
}

function getNoSeriesComponent({ width, height }) {
  return buildMessageDiv({ width: width, height: height, textAlign: 'center', verticalAlign: 'middle', display: 'table-cell' }, 'No Series');
}

function getConfigErrorComponent({ width, height }) {
  let style = {
    textAlign: 'center', verticalAlign: 'middle', display: 'table-cell'
  };
  if (width > 0) {
    style.width = width;
  }
  if (height > 0) {
    style.height = height;
  }
  return buildMessageDiv(style, 'Mochart Config Error');
}

/** Replace a container's children with factory-produced content (Node | El | string | falsy). */
function setFactoryContent(containerEl, content) {
  if (containerEl._factoryContent === content) {
    return;
  }
  containerEl._factoryContent = content;
  const node = containerEl.node;
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
  if (content === null || content === undefined || content === false) {
    return;
  }
  if (content instanceof El) {
    node.appendChild(content.node);
  }
  else if (typeof content === 'string' || typeof content === 'number') {
    node.appendChild(document.createTextNode(String(content)));
  }
  else {
    node.appendChild(content);
  }
}

function getBoundsForSeriesLayoutInfo(seriesLayoutInfo) {
  return {
    x: seriesLayoutInfo.x, y: seriesLayoutInfo.y,
    width: seriesLayoutInfo.width, height: seriesLayoutInfo.height
  };
}

function getBoundsAreDifferent(oldBounds, newBounds) {
  return oldBounds.x !== newBounds.x || oldBounds.y !== oldBounds.y || oldBounds.width !== oldBounds.height || oldBounds.height !== newBounds.height;
}

const getInitialState = () => ({
  uniqueIds: null, layoutInfo: null, tooltipLayoutInfo: null, chartTextBoundsData: {}, tooltipBounds: null, axisData: null, stackData: null,
  ...getInitialTooltipState()
});

const getInitialTooltipState = () => ({
  tooltipVisible: false,
  tooltipGroupIndex: -1,
  tooltipGroupPercentage: null,
  tooltipSeriesPercentage: null,
  tooltipValueObject: null
});

/**
 * The body of a valid chart: the svg (defs, background, title, plot, legend)
 * plus the html overlay containers and the tooltip. A pass-through renderer
 * so the pieces sit directly under the chart's root div, exactly like the
 * old JSX did.
 */
class ChartBody extends Renderer {
  create() {
    this.svg = svgEl('svg');
    this.defs = svgEl('defs');
    this.svg.append(this.defs);
    this.clips = this.rendererList(this.defs);
    this.seriesColorGradients = this.rendererList(this.defs);
    this.linearGradients = this.rendererList(this.defs);
    this.radialGradients = this.rendererList(this.defs);
    this.background = this.slot(this.svg);
    this.title = this.slot(this.svg);
    this.contentGroup = svgEl('g');
    this.svg.append(this.contentGroup);
    this.plot = this.slot(this.contentGroup);
    this.plotEmpty = this.slot(this.contentGroup);
    this.legend = this.slot(this.contentGroup);

    this.svgSlot = this.elSlot();
    this.noDataSlot = this.elSlot();
    this.noSeriesSlot = this.elSlot();
    this.loadingSlot = this.elSlot();
    this.tooltip = this.slot();
    return null;
  }

  sync() {
    const { chart } = this.props;
    chart.syncBody(this);
  }
}

export default class Chart extends Renderer {
  static defaultProps = {
    style: { position: 'relative' },
    onSeriesLayoutInfoChange: (bounds) => {},
    onFocus: (seriesId = null, groupIndex = -1) => {},
    onSeriesFilter: (seriesId) => {},
    onChartClick: (chartX, chartY) => {},
    onChartMouseEnter: (chartX, chartY) => {},
    onChartMouseMove: (chartX, chartY) => {},
    onChartMouseLeave: (chartX, chartY) => {},
    onTitleClick: () => {},
    getLoadingComponent,
    getErrorComponent,
    getNoDataComponent,
    getNoSizeComponent,
    getNoSeriesComponent,
    getConfigErrorComponent
  };

  root = htmlEl('div');
  simpleContent = this.elSlot(this.root);
  body = this.slot(this.root);

  constructor() {
    super();
    this.uniqueId = "" + chartInstanceCounter++;
    this.state = getInitialState();

    // set while the full chart body is rendered (mirrors the old render ref)
    this.chartRef = null;
    this.chartRectRef = null;
    this.isMouseWithinChart = false;

    // event handler used on the chart during render
    this.chartEventHandler = {
      onMouseEnter: (event) => {
        this.processChartMotionEvent(event);
      },
      onMouseMove: (event) => {
        this.processChartMotionEvent(event);
      },
      onMouseLeave: (event) => {
        this.processChartMotionEvent(event);
      },
      onClick: (event) => {
        this.processChartEvent(event, this.onChartClick);
      }
    };
  }

  processChartMotionEvent(event) {
    if (this.isMouseWithinChart) {
      this.processChartEvent(event, this.onChartMouseMove, (chartX, chartY) => {
        this.isMouseWithinChart = false;
        this.onChartMouseLeave(chartX, chartY);
      });
    }
    else {
      this.processChartEvent(event, (chartX, chartY) => {
        this.isMouseWithinChart = true;
        this.onChartMouseEnter(chartX, chartY);
      });
    }
  }

  processChartEvent(event, mouseInCallback, mouseOutCallback) {
    let position = (event.targetTouches && event.targetTouches[0]) || event;
    let chartRect = this.chartRectRef.getBoundingClientRect();
    let chartX = position.clientX - chartRect.left;
    let chartY = position.clientY - chartRect.top;
    if (chartX > 0 && chartY > 0 && chartX < chartRect.width && chartY < chartRect.height) {
      mouseInCallback(chartX, chartY);
    }
    else if (mouseOutCallback) {
      mouseOutCallback(chartY, chartY);
    }
  }

  setStateWithLayoutInfo(props, state, callback) {
    if (state.layoutInfo !== null) {
      state.layoutInfo = getChartLayoutInfoWithMutations(this.state.layoutInfo, state.layoutInfo);
      if (this.state.layoutInfo !== state.layoutInfo) {
        let newBounds = getBoundsForSeriesLayoutInfo(state.layoutInfo.seriesLayoutInfo);
        if (this.state.layoutInfo === null) {
          this.onSeriesLayoutInfoChange(newBounds);
        }
        else if (state.layoutInfo.seriesLayoutInfo !== this.state.layoutInfo.seriesLayoutInfo) {
          let oldBounds = getBoundsForSeriesLayoutInfo(this.state.layoutInfo.seriesLayoutInfo);
          if (getBoundsAreDifferent(oldBounds, newBounds)) {
            this.onSeriesLayoutInfoChange(newBounds);
          }
        }
      }
      state.tooltipLayoutInfo = getTooltipLayoutInfoWithMutations(this.state.tooltipLayoutInfo,
        this.getTooltipLayoutInfo(props, state));
    }
    this.setState(state, callback);
  }

  getTooltipLayoutInfo(props, state) {
    const { mochartConfig } = props;
    const { layoutInfo, axisData, tooltipGroupIndex, tooltipSeriesPercentage, tooltipGroupPercentage, tooltipBounds } =
      { ...this.state, ...state };

    let groupValueData = axisData ? axisData.group.valueData : null;
    return getTooltipLayoutInfo(mochartConfig, tooltipBounds, layoutInfo, groupValueData, tooltipGroupIndex,
      tooltipGroupPercentage, tooltipSeriesPercentage);
  }

  constructUniqueIds(props) {
    const uniqueId = this.uniqueId;
    const { mochartConfig } = props;
    const { seriesAxisConfigs, seriesConfigs, linearGradientConfigs, radialGradientConfigs } = mochartConfig;

    const svgUniqueId = mochartChartIdPrefix + uniqueId;
    const tooltipClipPathUniqueId = tooltipClipPathIdPrefix + uniqueId;
    const titleClipPathUniqueId = titleClipPathIdPrefix + uniqueId;
    const legendClipPathUniqueId = legendClipPathIdPrefix + uniqueId;
    const groupAxisTitleClipPathUniqueId = groupAxisTitleClipPathIdPrefix + uniqueId;
    const groupAxisTickLabelClipPathUniqueId = gridAxisTickLabelClipPathIdPrefix + uniqueId;
    const seriesAxisTitleClipPathUniqueIds = {};
    for (let { id } of seriesAxisConfigs) {
      seriesAxisTitleClipPathUniqueIds[id] = seriesAxisTitleClipPathIdPrefix + uniqueId + '__' + id;
    }
    const linearGradientIdMap = {};
    for (let { id } of linearGradientConfigs) {
      linearGradientIdMap[id] = linearGradientIdPrefix + uniqueId + '__' + id;
    }
    const radialGradientIdMap = {};
    for (let { id } of radialGradientConfigs) {
      radialGradientIdMap[id] = radialGradientIdPrefix + uniqueId + '__' + id;
    }
    const seriesColorGradientUniqueIds = {};
    for (let { id } of seriesConfigs) {
      seriesColorGradientUniqueIds[id] = seriesColorGradientIdPrefix + uniqueId + '__' + id;
    }
    const gradientIdMap = { ...linearGradientIdMap, ...radialGradientIdMap };
    const uniqueIds = {
      svgUniqueId, tooltipClipPathUniqueId, titleClipPathUniqueId, legendClipPathUniqueId,
      groupAxisTitleClipPathUniqueId, groupAxisTickLabelClipPathUniqueId, seriesAxisTitleClipPathUniqueIds,
      seriesColorGradientUniqueIds, gradientIdMap, linearGradientIdMap, radialGradientIdMap
    };
    return { uniqueIds };
  }

  willMount() {
    this.init(this.props, true);
  }

  init(props, warn = false) {
    const { mochartConfig, chartData, width, height, standalone } = props;
    let newState = getInitialState();
    if (mochartConfig) {
      const { validation } = mochartConfig;
      const { valid, errors, warnings } = validation;

      if (valid) {
        let uniqueIdState = this.constructUniqueIds(props);
        const domAccessors = this.chartRef ? getDomAccessors(this.chartRef) : null;
        let chartTextBoundsData = getChartTextBoundsData(mochartConfig, domAccessors);

        let layoutInfo = getChartLayoutInfo(mochartConfig, chartData, chartTextBoundsData, width, height, standalone);
        let axisData = null;
        let stackData = null;
        if (chartData !== null && getChartDataGroupCount(chartData) > 0) {
          axisData = getAxisData(mochartConfig, layoutInfo, chartData);
          stackData = getStackData(mochartConfig, chartData);
        }
        this.setStateWithLayoutInfo(props, { ...newState, layoutInfo, axisData, stackData, chartTextBoundsData, ...uniqueIdState });
      }
      else {
        if (warn && standalone) {
          if (errors.length > 0) {
            console.warn('mochart config had error messages: ', errors.join('\n'));
          }
          if (warnings.length > 0) {
            console.warn('mochart config had warning messages: ', warnings.join('\n'));
          }
        }
        this.setState(newState);
      }
    }
    else {
      this.setState(newState);
    }
  }

  calculateTooltipTextSize = () => {
    const { mochartConfig } = this.props;
    let { tooltipBounds } = this.state;
    tooltipBounds = getBoundsWithMutations(tooltipBounds, getTooltipBounds(mochartConfig, getDomAccessors(this.chartRef)));
    let tooltipLayoutInfo = getTooltipLayoutInfoWithMutations(this.state.tooltipLayoutInfo,
      this.getTooltipLayoutInfo(this.props, { tooltipBounds }));
    this.setState({ tooltipBounds, tooltipLayoutInfo });
  }

  calculateInitialTextSizes() {
    if (this.chartRef) {
      const { mochartConfig, chartData } = this.props;
      let newState = this.calculateTextSizes(false);
      if (chartData) {
        newState.axisData = getAxisDataWithMutations(this.state.axisData, mochartConfig, newState.layoutInfo, chartData);
      }
      this.setStateWithLayoutInfo(this.props, newState);
    }
  }

  calculateTextSizes(setState = true) {
    let newState = {};
    if (this.chartRef) {
      const { mochartConfig, chartData, width, height, standalone } = this.props;
      const domAccessors = getDomAccessors(this.chartRef);
      let chartTextBoundsData = getChartTextBoundsData(mochartConfig, domAccessors);
      let layoutInfo = getChartLayoutInfo(mochartConfig, chartData, chartTextBoundsData, width, height, standalone);
      newState = { chartTextBoundsData, layoutInfo };
      const { tooltipVisible } = this.state;
      if (tooltipVisible) {
        let { tooltipBounds } = this.state;
        tooltipBounds = getBoundsWithMutations(tooltipBounds, getTooltipBounds(mochartConfig, domAccessors));
        let tooltipLayoutInfo = getTooltipLayoutInfoWithMutations(this.state.tooltipLayoutInfo,
          this.getTooltipLayoutInfo(this.props, { tooltipBounds }));
        newState.tooltipBounds = tooltipBounds;
        newState.tooltipLayoutInfo = tooltipLayoutInfo;
      }
      if (setState === true) {
        const { layoutInfo: oldLayoutInfo, axisData: oldAxisData } = this.state;
        let groupExtentChanged = oldLayoutInfo.seriesLayoutInfo.groupExtent !== layoutInfo.seriesLayoutInfo.groupExtent;
        let seriesExtentChanged = oldLayoutInfo.seriesLayoutInfo.seriesExtent !== layoutInfo.seriesLayoutInfo.seriesExtent;
        if (chartData) {
          if (oldAxisData === null || groupExtentChanged && seriesExtentChanged) {
            newState.axisData = getAxisDataWithMutations(this.state.axisData, mochartConfig, layoutInfo, chartData);
          }
          else if (groupExtentChanged || seriesExtentChanged) {
            const { axisData } = this.state;
            if (groupExtentChanged) {
              newState.axisData = getAxisDataForGroupChange(axisData, mochartConfig, layoutInfo, chartData, width, height);
            }
            else {
              newState.axisData = getAxisDataForSeriesChange(axisData, mochartConfig, layoutInfo, chartData, width, height);
            }
          }
        }
        this.setStateWithLayoutInfo(this.props, newState);
      }
    }
    return newState;
  }

  updateTextSizes() {
    if (this.chartRef) {
      const { mochartConfig, chartData, width, height, standalone } = this.props;
      const domAccessors = getDomAccessors(this.chartRef);
      let chartTextBoundsData = getChartTextBoundsData(mochartConfig, domAccessors);
      chartTextBoundsData = getChartTextBoundsDataWithMutations(this.state.chartTextBoundsData, chartTextBoundsData);
      if (chartTextBoundsData !== this.state.chartTextBoundsData) {
        let layoutInfo = getChartLayoutInfo(mochartConfig, chartData, chartTextBoundsData, width, height, standalone);
        layoutInfo = getChartLayoutInfoWithMutations(this.state.layoutInfo, layoutInfo);
        this.setState({ chartTextBoundsData, layoutInfo });
      }
    }
  }

  willReceiveProps(nextProps) {
    const { mochartConfig, chartData, width, height, standalone } = nextProps;

    const dataChanged = chartData !== this.props.chartData;
    const sizeChanged = width !== this.props.width || height !== this.props.height;
    const mochartConfigChanged = mochartConfig !== this.props.mochartConfig;
    const mochartConfigStructureChanged = mochartConfigChanged && (!mochartConfig || hasConfigStructureChange(this.props.mochartConfig, mochartConfig));

    if (mochartConfigChanged || dataChanged || sizeChanged) {
      if (!mochartConfig || mochartConfigStructureChanged || (dataChanged && chartData === null)) {
        this.init(nextProps, mochartConfigStructureChanged, (!mochartConfig || mochartConfigStructureChanged));
      }
      else if (mochartConfig.validation.valid) {
        const { chartTextBoundsData, axisData: oldAxisData, stackData: oldStackData } = this.state;
        let { uniqueIds, layoutInfo, axisData, stackData } = this.state;

        let groupAxisChanged = this.props.chartData === null || this.props.chartData.groupData !== chartData.groupData;
        let seriesAxisChanged = this.props.chartData === null || this.props.chartData.seriesData.raw.axisDomains !== chartData.seriesData.raw.axisDomains ||
          this.props.chartData.seriesData.filtered.axisDomains !== chartData.seriesData.filtered.axisDomains;
        // TODO - what about if seriesData.axisSeriesCounts changes? how should that be handled?
        layoutInfo = getChartLayoutInfo(mochartConfig, chartData, chartTextBoundsData, width, height, standalone);
        layoutInfo = getChartLayoutInfoWithMutations(this.state.layoutInfo, layoutInfo);

        let tooltipStateSource = this.state;
        if (chartData !== null) {
          if (oldAxisData === null || mochartConfigChanged || sizeChanged || (groupAxisChanged && seriesAxisChanged)) {
            axisData = getAxisDataWithMutations(oldAxisData, mochartConfig, layoutInfo, chartData);
          }
          else {
            if (groupAxisChanged) {
              axisData = getAxisDataForGroupChange(axisData, mochartConfig, layoutInfo, chartData, width, height);
            }
            else if (seriesAxisChanged) {
              axisData = getAxisDataForSeriesChange(axisData, mochartConfig, layoutInfo, chartData, width, height);
            }
          }
          if (mochartConfigChanged || dataChanged) {
            stackData = getStackDataWithMutations(oldStackData, mochartConfig, chartData);
          }

          if (dataChanged && this.props.chartData !== null) {
            let { tooltipGroupIndex, tooltipValueObject } = this.state;
            if (tooltipGroupIndex >= 0) {
              let oldGroupValues = this.props.chartData.groupData.values.raw;
              let newGroupValues = chartData.groupData.values.raw;
              if (oldGroupValues && newGroupValues) {
                let groupValue = oldGroupValues[tooltipGroupIndex];
                tooltipGroupIndex = newGroupValues.indexOf(groupValue);
                tooltipValueObject = getGroupSeriesValueObject(chartData, tooltipGroupIndex);
                tooltipStateSource = { ...this.state, tooltipGroupIndex, tooltipValueObject };
              }
              else {
                tooltipStateSource = getInitialTooltipState();
              }
            }
          }
        }

        if (mochartConfigChanged) {
          ({ uniqueIds } = this.constructUniqueIds(nextProps));
        }
        const { tooltipVisible, tooltipGroupIndex, tooltipGroupPercentage, tooltipSeriesPercentage, tooltipValueObject } = tooltipStateSource;
        const newState = { uniqueIds, layoutInfo, axisData, stackData, tooltipVisible, tooltipGroupIndex, tooltipGroupPercentage, tooltipSeriesPercentage, tooltipValueObject };
        this.setStateWithLayoutInfo(nextProps, newState);
      }
      else {
        this.setState(getInitialState());
      }
    }
  }

  didMount() {
    this.calculateTextSizes();
  }

  didUpdate(prevProps, prevState) {
    const { mochartConfig: newMochartConfig } = this.props;
    if (newMochartConfig) {
      const { validation } = newMochartConfig;
      const { valid } = validation;
      if (valid) {
        const { chartData: newChartData } = this.props;
        const { chartData, mochartConfig } = prevProps;
        if (chartData === null || newChartData === null) {
          if (newChartData !== chartData || newMochartConfig !== mochartConfig) {
            this.calculateInitialTextSizes();
          }
          else {
            const { chartTextBoundsData } = this.state;
            if (chartTextBoundsData && chartTextBoundsData.hasDefault) {
              this.updateTextSizes();
            }
          }
        }
        else {
          const { width, height } = prevProps;
          const { axisData: oldAxisData, tooltipGroupIndex: oldTooltipGroupIndex, tooltipVisible: oldTooltipVisible } = prevState;
          const { axisData, tooltipGroupIndex, tooltipVisible } = this.state;

          const dataChanged = chartData !== this.props.chartData;

          const sizeChanged = width !== this.props.width || height !== this.props.height;
          const mochartConfigChanged = mochartConfig !== newMochartConfig;
          const mochartConfigStructureChanged = mochartConfigChanged && hasConfigStructureChange(mochartConfig, newMochartConfig);
          let groupAxisChanged = this.props.chartData === null || this.props.chartData.groupData !== chartData.groupData;
          let seriesAxisChanged = this.props.chartData === null || this.props.chartData.seriesData.raw.axisDomains !== chartData.seriesData.raw.axisDomains ||
            this.props.chartData.seriesData.filtered.axisDomains !== chartData.seriesData.filtered.axisDomains;

          if (mochartConfigStructureChanged || dataChanged || sizeChanged) {
            this.calculateInitialTextSizes();
          }
          else if (oldAxisData !== axisData && (mochartConfigChanged || (groupAxisChanged && seriesAxisChanged))) {
            this.calculateTextSizes();
          }

          if (tooltipVisible) {
            if (!oldTooltipVisible || oldTooltipGroupIndex !== tooltipGroupIndex) {
              this.calculateTooltipTextSize();
            }
          }
        }
      }
    }
  }

  onSeriesLayoutInfoChange(layoutBounds) {
    this.props.onSeriesLayoutInfoChange(layoutBounds);
  }

  closeTooltip = () => {
    this.setState({ ...getInitialTooltipState(), tooltipBounds: null });
  }

  updateTooltipGroupIndex = (tooltipGroupIndex) => {
    const { chartData } = this.props;
    const tooltipValueObject = getGroupSeriesValueObject(chartData, tooltipGroupIndex);
    const tooltipLayoutInfo = this.getTooltipLayoutInfo(this.props, { ...this.state, tooltipGroupIndex });
    this.setState({ tooltipGroupIndex, tooltipValueObject, tooltipLayoutInfo });
  }

  toggleTooltip({ groupIndex, groupPercentage, seriesPercentage }) {
    const { mochartConfig, onFocus, chartData } = this.props;
    const { tooltipConfig, crosshairConfig } = mochartConfig;
    if (tooltipConfig.visible || crosshairConfig.visible) {
      let { tooltipVisible, tooltipGroupIndex, tooltipSeriesPercentage, tooltipGroupPercentage, tooltipLayoutInfo, tooltipBounds, tooltipValueObject } = this.state;
      tooltipSeriesPercentage = tooltipVisible ? null : seriesPercentage;
      tooltipGroupPercentage = tooltipVisible ? null : groupPercentage;
      tooltipLayoutInfo = getTooltipLayoutInfo(mochartConfig, null);
      tooltipBounds = null;
      tooltipVisible = !tooltipVisible;
      tooltipGroupIndex = tooltipVisible ? groupIndex : -1;
      tooltipValueObject = tooltipVisible ? getGroupSeriesValueObject(chartData, tooltipGroupIndex) : null;
      if ((tooltipConfig.visible && tooltipConfig.applyFocus) || (crosshairConfig.visible && crosshairConfig.applyFocus)) {
        onFocus({ groupIndex: tooltipGroupIndex });
      }
      this.setState({ tooltipVisible, tooltipGroupIndex, tooltipSeriesPercentage, tooltipGroupPercentage, tooltipLayoutInfo, tooltipBounds, tooltipValueObject });
    }
  }

  getChartEventPayload = (chartX, chartY) => {
    const { mochartConfig } = this.props;
    const { axisData, layoutInfo } = this.state;
    const dataGroupPositions = axisData.group.valueData.positions;
    const { seriesLayoutInfo } = layoutInfo;
    const { plotConfig } = mochartConfig;

    let groupPosition = plotConfig.inverted ? chartY : chartX;
    let groupPercentage = groupPosition / seriesLayoutInfo.groupExtent;
    let groupIndex = -1;
    let groupDifference = Number.MAX_VALUE;
    const groupCount = dataGroupPositions.length;
    let dataGroupPosition;
    for (let dataGroupIndex = 0; dataGroupIndex < groupCount; dataGroupIndex++) {
      dataGroupPosition = dataGroupPositions[dataGroupIndex];
      let currentDifference = Math.abs(dataGroupPosition - groupPosition);
      if (currentDifference <= groupDifference) { // <= means we'll pick the greater group value on a tie
        groupDifference = currentDifference;
        groupIndex = dataGroupIndex;
      }
    }
    let seriesPosition = plotConfig.inverted ? chartX : chartY;
    let seriesPercentage = seriesPosition / seriesLayoutInfo.seriesExtent;

    return {
      chartX, chartY, groupPosition, seriesPosition, groupPercentage, seriesPercentage, groupIndex
    };
  }

  onChartMouseEnter = (chartX, chartY) => {
    const { mochartConfig, onChartMouseEnter } = this.props;
    let eventPayload = this.getChartEventPayload(chartX, chartY);
    onChartMouseEnter(eventPayload);
    if (mochartConfig.tooltipConfig.mouseOver) {
      this.toggleTooltip(eventPayload);
    }
  }

  onChartMouseMove = (chartX, chartY) => {
    const { mochartConfig, onFocus, onChartMouseMove } = this.props;
    let eventPayload = this.getChartEventPayload(chartX, chartY);
    onChartMouseMove(eventPayload);
    if (mochartConfig.tooltipConfig.mouseOver) {
      let { seriesPercentage, groupIndex } = eventPayload;
      if (mochartConfig.tooltipConfig.visible) {
        onFocus({ groupIndex });
        this.setState({ tooltipSeriesPercentage: seriesPercentage });
      }
      else {
        this.setState({ tooltipBounds: null });
      }
    }
  }

  onChartMouseLeave = (chartX, chartY) => {
    const { mochartConfig, onChartMouseLeave } = this.props;
    let eventPayload = this.getChartEventPayload(chartX, chartY);
    onChartMouseLeave(eventPayload);
    if (mochartConfig.tooltipConfig.mouseOver) {
      this.toggleTooltip(eventPayload);
    }
  }

  onChartClick = (chartX, chartY) => {
    const { mochartConfig, onChartClick } = this.props;
    let eventPayload = this.getChartEventPayload(chartX, chartY);
    onChartClick(eventPayload);
    if (!mochartConfig.tooltipConfig.mouseOver) {
      this.toggleTooltip(eventPayload);
    }
  }

  onTitleClick = () => {
    const { onTitleClick } = this.props;
    onTitleClick();
  }

  setChartRectRef = (chartRectRef) => {
    this.chartRectRef = chartRectRef;
  }

  create() {
    return this.root.node;
  }

  sync() {
    const {
      mochartConfig, dataProvider, style, width, height, error: propsError, loading: propsLoading,
      getErrorComponent, getLoadingComponent, getNoSizeComponent, getConfigErrorComponent
    } = this.props;

    if ((width === 0 || height === 0) || (mochartConfig && !mochartConfig.validation.valid)) {
      let errorComponent;
      if (width === 0 || height === 0) {
        errorComponent = getNoSizeComponent({ mochartConfig, width, height });
      }
      else if (mochartConfig) {
        errorComponent = getConfigErrorComponent({ mochartConfig, width, height });
      }
      else {
        errorComponent = false;
      }
      this.setPresent(true);
      this.chartRef = null;
      this.root.set({ className: mochartCssClasses['chartError'], style, 'data-mochart-version': getVersionString() });
      this.body.set(null);
      this.setSimpleContent(errorComponent);
      return;
    }

    const error = propsError ? propsError : dataProvider && !isDataProviderValid(dataProvider) ? dataProvider.getError() : false;
    const loading = propsLoading ? propsLoading : dataProvider && dataProvider.getLoading && dataProvider.getLoading();

    if (!mochartConfig) {
      if (error) {
        this.setPresent(true);
        this.chartRef = null;
        this.root.set({ className: mochartCssClasses['chartError'], style, 'data-mochart-version': getVersionString() });
        this.body.set(null);
        this.setSimpleContent(getErrorComponent({ dataProvider, width, height, error }));
      }
      else if (loading) {
        this.setPresent(true);
        this.chartRef = null;
        this.root.set({ className: mochartCssClasses['loading'], style, 'data-mochart-version': getVersionString() });
        this.body.set(null);
        this.setSimpleContent(getLoadingComponent({ width, height }));
      }
      else {
        this.chartRef = null;
        this.setPresent(false);
      }
      return;
    }

    const hasChartDataContent = this.hasChartDataContent(error, loading);
    const chartEventHandler = (hasChartDataContent && !loading) ? this.chartEventHandler : {};

    this.setPresent(true);
    this.root.set({ className: mochartCssClasses['chart'], ...chartEventHandler, style, 'data-mochart-version': getVersionString() });
    this.chartRef = this.root.node;
    this.setSimpleContent(false);
    this.body.set(ChartBody, { chart: this, chartProps: this.props, chartState: this.state, error, loading });
  }

  /** Insert factory-produced content (Node | El | string | falsy) into the simple-content region of the root div. */
  setSimpleContent(content) {
    if (this._simpleNodeContent === content) {
      return;
    }
    this._simpleNodeContent = content;
    if (this._simpleNode && this._simpleNode.parentNode) {
      this._simpleNode.parentNode.removeChild(this._simpleNode);
    }
    this._simpleNode = null;
    if (content === null || content === undefined || content === false) {
      return;
    }
    const node = content instanceof El ? content.node :
      (typeof content === 'string' || typeof content === 'number') ? document.createTextNode(String(content)) : content;
    this.root.node.insertBefore(node, this.simpleContent.anchor);
    this._simpleNode = node;
  }

  hasChartDataContent(error, loading) {
    const { chartData } = this.props;
    const hasChartData = chartData !== null;
    const groupCount = hasChartData ? getChartDataGroupCount(chartData) : 0;
    return !error && hasChartData && groupCount > 0;
  }

  /** Fill in the ChartBody's slots — called from ChartBody.sync with the body renderer. */
  syncBody(body) {
    const {
      mochartConfig, dataProvider, chartData, focusData, onFocus, onSeriesFilter, width, height,
      getErrorComponent, getLoadingComponent, getNoDataComponent, getNoSeriesComponent
    } = this.props;
    const { layoutInfo, tooltipLayoutInfo, axisData, stackData, tooltipVisible, tooltipGroupIndex, tooltipBounds, uniqueIds, tooltipValueObject } = this.state;
    const { error, loading } = body.props;

    const {
      svgUniqueId, tooltipClipPathUniqueId, titleClipPathUniqueId, legendClipPathUniqueId, groupAxisTitleClipPathUniqueId,
      groupAxisTickLabelClipPathUniqueId, seriesAxisTitleClipPathUniqueIds, seriesColorGradientUniqueIds, gradientIdMap,
      linearGradientIdMap, radialGradientIdMap
    } = uniqueIds;
    const {
      chartContentLayoutInfo, titleLayoutInfo, titlePrefixLayoutInfo, titleTextLayoutInfo, titleTextRawLayoutInfo, titleSuffixLayoutInfo,
      legendLayoutInfo, legendItemTextLayoutInfo, legendItemLayoutInfos, legendItemRawLayoutInfos, plotLayoutInfo,
      seriesLayoutInfo, groupAxisLayoutInfo, seriesAxisLayoutInfos
    } = layoutInfo;
    const chartTransform = translateObject(chartContentLayoutInfo);

    const focusedGroupIndex = focusData ? focusData.focusedGroupIndex : -1;
    const focusedSeriesId = focusData ? focusData.focusedSeriesId : null;
    const seriesAxisFocusPercentages = focusData ? focusData.seriesAxisFocusPercentages : {};
    const seriesFocusPercentages = focusData ? focusData.seriesFocusPercentages : {};
    const hasChartData = chartData !== null;
    const groupCount = hasChartData ? getChartDataGroupCount(chartData) : 0;
    const hasChartDataContent = !error && hasChartData && groupCount > 0;
    const tooltipShown = hasChartData && tooltipBounds !== null && tooltipGroupIndex >= 0;
    const filteredFlags = hasChartData ? chartData.seriesData.filteredFlags : emptyFilteredFlags;
    let maxTickLabelLength = seriesLayoutInfo.width;

    let clips = [
      { key: 'title-clip', ctor: TitleClip, props: { titleConfig: mochartConfig.titleConfig, chartContentLayoutInfo,
        titleTextLayoutInfo, titleClipPathUniqueId } },
      { key: 'legend-clip', ctor: LegendClip, props: { legendConfig: mochartConfig.legendConfig, chartContentLayoutInfo,
        legendItemTextLayoutInfo, legendClipPathUniqueId } }
    ];

    if (hasChartDataContent) {
      maxTickLabelLength = axisData.group.maxTickLabelLength;

      clips.push({ key: 'tooltip-clip', ctor: TooltipClip, props: { mochartConfig, tooltipVisible, tooltipShown,
        tooltipLayoutInfo, chartContentLayoutInfo, width, height,
        tooltipClipPathUniqueId } });
    }

    clips.push(
      { key: 'group-axis-title-clip', ctor: AxisTitleClip, props: { axisConfig: mochartConfig.groupAxisConfig, chartContentLayoutInfo,
        axisLayoutInfo: groupAxisLayoutInfo, axisTitleClipPathUniqueId: groupAxisTitleClipPathUniqueId } },
      { key: 'group-axis-tick-label-clip', ctor: GroupAxisTickLabelClip, props: { mochartConfig, maxTickLabelLength,
        chartContentLayoutInfo, groupAxisLayoutInfo,
        groupAxisTickLabelClipPathUniqueId } }
    );

    clips = clips.concat(mochartConfig.seriesAxisConfigs.map(seriesAxisConfig => ({
      key: 'series-axis-clip-' + seriesAxisConfig.id,
      ctor: AxisTitleClip,
      props: { axisConfig: seriesAxisConfig,
        chartContentLayoutInfo, axisLayoutInfo: seriesAxisLayoutInfos[seriesAxisConfig.id],
        axisTitleClipPathUniqueId: seriesAxisTitleClipPathUniqueIds[seriesAxisConfig.id] }
    })));

    const seriesGradientColors = mochartConfig.seriesConfigs.map(seriesConfig => getSeriesGradientColors(seriesConfig));
    const seriesColorGradients = [];
    mochartConfig.seriesConfigs.forEach((seriesConfig, i) => {
      if (seriesGradientColors[i]) {
        seriesColorGradients.push({
          key: seriesConfig.id, ctor: SeriesColorGradient,
          props: { uniqueId: seriesColorGradientUniqueIds[seriesConfig.id], seriesConfig }
        });
      }
    });

    const linearGradients = mochartConfig.linearGradientConfigs.map(linearGradientConfig => ({
      key: linearGradientConfig.id, ctor: LinearGradient,
      props: { uniqueId: linearGradientIdMap[linearGradientConfig.id], linearGradientConfig }
    }));

    const radialGradients = mochartConfig.radialGradientConfigs.map(radialGradientConfig => ({
      key: radialGradientConfig.id, ctor: RadialGradient,
      props: { uniqueId: radialGradientIdMap[radialGradientConfig.id], radialGradientConfig }
    }));

    body.svgSlot.set('svg', () => body.svg);
    body.svg.set({ xmlns: 'http://www.w3.org/2000/svg', id: svgUniqueId, width, height });
    body.clips.sync(clips);
    body.seriesColorGradients.sync(seriesColorGradients);
    body.linearGradients.sync(linearGradients);
    body.radialGradients.sync(radialGradients);
    body.background.set(Background, { config: mochartConfig.chartConfig, classKey: 'background', spacingRelative: false, spacingLayoutInfo: chartContentLayoutInfo });
    body.title.set(Title, { mochartConfig, titleLayoutInfo, titlePrefixLayoutInfo,
      titleTextLayoutInfo, titleTextRawLayoutInfo, titleSuffixLayoutInfo,
      titleClipPathUniqueId, onClick: this.onTitleClick });
    body.contentGroup.set({ transform: chartTransform });

    if (hasChartDataContent) {
      const { group: groupAxisData } = axisData;
      const { valueData: groupValueData } = groupAxisData;

      body.plot.set(Plot, { mochartConfig, gradientIdMap, groupAxisLayoutInfo,
        seriesAxisLayoutInfos, seriesLayoutInfo,
        plotLayoutInfo, chartData, focusData, axisData,
        stackData, groupValueData, onFocus, shapeRef: this.setChartRectRef,
        groupAxisTitleClipPathUniqueId,
        groupAxisTickLabelClipPathUniqueId,
        seriesAxisTitleClipPathUniqueIds,
        tooltipClipPathUniqueId });
      body.plotEmpty.set(null);

      body.tooltip.set(Tooltip, { mochartConfig, tooltipValueObject, tooltipGroupIndex, focusedGroupIndex,
        focusedSeriesId, seriesAxisFocusPercentages, seriesFocusPercentages,
        tooltipVisible, groupCount: chartData.groupData.values.raw.length,
        tooltipLayoutInfo, tooltipBounds, svgUniqueId,
        onClose: this.closeTooltip, updateTooltipGroupIndex: this.updateTooltipGroupIndex, onFocus, onSeriesFilter });

      if (mochartConfig.seriesConfigs.length === 0) {
        const { x, y, width, height } = seriesLayoutInfo;

        const noSeriesStyle = {
          position: 'absolute',
          left: x,
          top: y,
          width,
          maxWidth: width
        };

        const noSeriesEl = body.noSeriesSlot.set('div', () => htmlEl('div'));
        noSeriesEl.set({ className: mochartCssClasses['noSeries'], style: noSeriesStyle });
        setFactoryContent(noSeriesEl, getNoSeriesComponent({ width, height }));
      }
      else {
        body.noSeriesSlot.set(null);
      }

      body.noDataSlot.set(null);
    }
    else {
      body.plot.set(null);
      body.tooltip.set(null);
      body.noSeriesSlot.set(null);

      body.plotEmpty.set(PlotEmpty, { mochartConfig, groupAxisLayoutInfo,
        seriesAxisLayoutInfos, plotLayoutInfo,
        groupAxisTitleClipPathUniqueId,
        groupAxisTickLabelClipPathUniqueId,
        seriesAxisTitleClipPathUniqueIds });

      const { x, y, width, height } = seriesLayoutInfo;

      const noDataStyle = {
        position: 'absolute',
        left: x,
        top: y,
        width,
        maxWidth: width
      };

      let noDataContent = false;
      if (error) {
        noDataContent = getErrorComponent({ mochartConfig, dataProvider, width, height, error });
      }
      else if (!loading && hasChartData && groupCount === 0) {
        noDataContent = getNoDataComponent({ mochartConfig, dataProvider, width, height });
      }
      else {
        noDataContent = getLoadingComponent({ mochartConfig, dataProvider, width, height, hasData: hasChartDataContent });
      }

      const noDataEl = body.noDataSlot.set('div', () => htmlEl('div'));
      noDataEl.set({ className: mochartCssClasses['noData'], style: noDataStyle });
      setFactoryContent(noDataEl, noDataContent);
    }

    body.legend.set(Legend, { mochartConfig, filteredFlags, focusedSeriesId,
      seriesAxisFocusPercentages, seriesFocusPercentages, onFocus,
      uniqueIds, onSeriesFilter, legendLayoutInfo, legendItemTextLayoutInfo,
      legendItemLayoutInfos, legendItemRawLayoutInfos });

    if (loading) {
      const { x, y, width, height } = seriesLayoutInfo;

      const loadingStyle = {
        position: 'absolute',
        left: x,
        top: y,
        width,
        maxWidth: width
      };

      const loadingEl = body.loadingSlot.set('div', () => htmlEl('div'));
      loadingEl.set({ className: mochartCssClasses['loading'], style: loadingStyle });
      setFactoryContent(loadingEl, getLoadingComponent({ mochartConfig, dataProvider, width, height, hasData: hasChartDataContent }));
    }
    else {
      body.loadingSlot.set(null);
    }
  }
}
