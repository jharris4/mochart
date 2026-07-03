// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

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

function getLoadingComponent({ width, height }) {
  return (
    <div style={{ width: width, height: height, textAlign: 'center', verticalAlign: 'middle', display: 'table-cell'}}>
      Loading...
    </div>
  );
}

function getErrorComponent({ width, height, error }) {
  let errorMessage = error ? typeof error === 'object' ? JSON.stringify(error) : error : 'Invalid Chart Config';
  return (
    <div style={{ width: width, height: height, textAlign: 'center', verticalAlign: 'middle', display: 'table-cell'}}>
      {errorMessage}
    </div>
  );
}

function getNoDataComponent({ width, height }) {
  return (
    <div style={{ width: width, height: height, textAlign: 'center', verticalAlign: 'middle', display: 'table-cell'}}>
      No Data
    </div>
  );
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
  return (
    <div style={style}>
      No Size
    </div>
  );
}

function getNoSeriesComponent({ width, height }) {
  return (
    <div style={{ width: width, height: height, textAlign: 'center', verticalAlign: 'middle', display: 'table-cell' }}>
      No Series
    </div>
  );
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
  return (
    <div style={style}>
      Mochart Config Error
    </div>
  );
}

function getBoundsForSeriesLayoutInfo(seriesLayoutInfo) {
  return {
    x: seriesLayoutInfo.x, y: seriesLayoutInfo.y,
    width: seriesLayoutInfo.width, height: seriesLayoutInfo.height
  }
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

export default class Chart extends PureComponent {
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

  constructor(props) {
    super(props);
    this.uniqueId = "" + chartInstanceCounter++;
    this.state = getInitialState();

    // refs created on render
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
    let position = (event.targetTouches && e.targetTouches[0]) || event;
    let chartRect = this.chartRectRef.getBoundingClientRect();
    let chartX = position.clientX - chartRect.left;
    let chartY = position.clientY - chartRect.top;
    if (chartX > 0 && chartY > 0 && chartX < chartRect.width && chartY < chartRect.height) {
      mouseInCallback(chartX, chartY);
    }
    else if(mouseOutCallback) {
      mouseOutCallback(chartY, chartY);
    }
  };

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
      {...this.state, ...state};

    let groupValueData = axisData ? axisData.group.valueData : null;
    return getTooltipLayoutInfo(mochartConfig, tooltipBounds, layoutInfo, groupValueData, tooltipGroupIndex,
      tooltipGroupPercentage, tooltipSeriesPercentage);
  }

  constructUniqueIds(props) {
    const uniqueId = this.uniqueId;
    const { mochartConfig } = props;
    const { seriesAxisConfigs, seriesConfigs, linearGradientConfigs, radialGradientConfigs } = mochartConfig;

    const svgUniqueId = mochartChartIdPrefix+uniqueId;
    const tooltipClipPathUniqueId = tooltipClipPathIdPrefix+uniqueId;
    const titleClipPathUniqueId = titleClipPathIdPrefix+uniqueId;
    const legendClipPathUniqueId = legendClipPathIdPrefix+uniqueId;
    const groupAxisTitleClipPathUniqueId = groupAxisTitleClipPathIdPrefix+uniqueId;
    const groupAxisTickLabelClipPathUniqueId = gridAxisTickLabelClipPathIdPrefix+uniqueId;
    const seriesAxisTitleClipPathUniqueIds = {};
    for (let { id } of seriesAxisConfigs) {
      seriesAxisTitleClipPathUniqueIds[id] = seriesAxisTitleClipPathIdPrefix+uniqueId+'__'+id;
    }
    const linearGradientIdMap = {};
    for (let { id } of linearGradientConfigs) {
      linearGradientIdMap[id] = linearGradientIdPrefix+uniqueId+'__'+id;
    }
    const radialGradientIdMap = {};
    for (let { id } of radialGradientConfigs) {
      radialGradientIdMap[id] = radialGradientIdPrefix+uniqueId+'__'+id;
    }
    const seriesColorGradientUniqueIds = {};
    for (let { id } of seriesConfigs) {
      seriesColorGradientUniqueIds[id] = seriesColorGradientIdPrefix + uniqueId + '__' + id;
    }
    const gradientIdMap = {...linearGradientIdMap, ...radialGradientIdMap};
    const uniqueIds = {
      svgUniqueId, tooltipClipPathUniqueId, titleClipPathUniqueId, legendClipPathUniqueId,
      groupAxisTitleClipPathUniqueId, groupAxisTickLabelClipPathUniqueId, seriesAxisTitleClipPathUniqueIds,
      seriesColorGradientUniqueIds, gradientIdMap, linearGradientIdMap, radialGradientIdMap
    };
    return { uniqueIds };
  }

  componentWillMount() {
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
      this.getTooltipLayoutInfo(this.props, {tooltipBounds}));
    this.setState({tooltipBounds, tooltipLayoutInfo});
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
          this.getTooltipLayoutInfo(this.props, {tooltipBounds}));
        newState.tooltipBounds = tooltipBounds;
        newState.tooltipLayoutInfo = tooltipLayoutInfo;
      }
      if (setState === true) {
        const { layoutInfo: oldLayoutInfo, axisData: oldAxisData} = this.state;
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

  componentWillReceiveProps(nextProps) {
    const { mochartConfig, chartData, focusData, width, height, standalone, } = nextProps;

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

  componentDidMount() {
    this.calculateTextSizes();
  }

  componentDidUpdate(prevProps, prevState) {
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
          const { width, height, standalone } = prevProps;
          const { axisData: oldAxisData, tooltipGroupIndex: oldTooltipGroupIndex, tooltipVisible: oldTooltipVisible } = prevState;
          const { axisData, tooltipGroupIndex, tooltipVisible } = this.state;

          const dataChanged = chartData !== this.props.chartData;

          const sizeChanged = width !== this.props.width || height !== this.props.height;
          const mochartConfigChanged = mochartConfig !== newMochartConfig;
          const mochartConfigStructureChanged = mochartConfigChanged && hasConfigStructureChange(mochartConfig, newMochartConfig)
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
    this.setState({...getInitialTooltipState(), tooltipBounds: null});
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
        this.setState({tooltipBounds: null});
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
    this.chartRectRef = chartRectRef
  }

  setChartRef = (chartRef) => {
    this.chartRef = chartRef;
  }

  render() {
    const {
      mochartConfig, dataProvider, chartData, focusData, style, onFocus, onSeriesFilter, width, height, error: propsError, loading: propsLoading,
      getErrorComponent, getLoadingComponent, getNoDataComponent, getNoSizeComponent, getNoSeriesComponent, getConfigErrorComponent
    } = this.props;
    const { layoutInfo, tooltipLayoutInfo, axisData, stackData, tooltipVisible, tooltipGroupIndex, tooltipBounds, uniqueIds, tooltipValueObject } = this.state;

    let chartContent = false;

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
      chartContent = (
        <div className={mochartCssClasses['chartError']} style={style} data-mochart-version={getVersionString()}>
          {errorComponent}
        </div>
      );
    }
    else {
      const error = propsError ? propsError : dataProvider && !isDataProviderValid(dataProvider) ? dataProvider.getError() : false;
      const loading = propsLoading ? propsLoading : dataProvider && dataProvider.getLoading && dataProvider.getLoading();

      if (!mochartConfig) {
        if (error) {
          chartContent = (
            <div className={mochartCssClasses['chartError']} style={style} data-mochart-version={getVersionString()}>
              {getErrorComponent({ dataProvider, width, height, error })}
            </div>
          );
        }
        else if (loading) {
          chartContent = (
            <div className={mochartCssClasses['loading']} style={style} data-mochart-version={getVersionString()}>
              {getLoadingComponent({ width, height })}
            </div>
          );
        }
      }
      else {
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
        const focusedSeriesAxisId = focusData ? focusData.focusedSeriesAxisId : null;
        const focusedSeriesId = focusData ? focusData.focusedSeriesId : null;
        const seriesAxisFocusPercentages = focusData ? focusData.seriesAxisFocusPercentages : {};
        const seriesFocusPercentages = focusData ? focusData.seriesFocusPercentages : {};
        const hasChartData = chartData !== null;
        const groupCount = hasChartData ? getChartDataGroupCount(chartData) : 0;
        const hasChartDataContent = !error && hasChartData && groupCount > 0;
        const tooltipShown = hasChartData && tooltipBounds !== null && tooltipGroupIndex >= 0;
        const filteredFlags = hasChartData ? chartData.seriesData.filteredFlags : emptyFilteredFlags;
        let maxTickLabelLength = seriesLayoutInfo.width;

        const chartEventHandler = (hasChartDataContent && !loading) ? this.chartEventHandler : {};

        let clips = [
          <TitleClip key="title-clip" titleConfig={mochartConfig.titleConfig} chartContentLayoutInfo={chartContentLayoutInfo}
            titleTextLayoutInfo={titleTextLayoutInfo} titleClipPathUniqueId={titleClipPathUniqueId} />,
          <LegendClip key="legend-clip" legendConfig={mochartConfig.legendConfig} chartContentLayoutInfo={chartContentLayoutInfo}
            legendItemTextLayoutInfo={legendItemTextLayoutInfo} legendClipPathUniqueId={legendClipPathUniqueId} />
        ];
        let seriesColorGradients = [];
        let linearGradients = [];
        let radialGradients = [];

        let plot = false;
        let plotEmpty = false;
        let noDataContainer = false;
        let noSeriesContainer = false;
        let loadingContainer = false;
        let tooltip = false;

        const seriesGradientColors = mochartConfig.seriesConfigs.map(seriesConfig => getSeriesGradientColors(seriesConfig));
        mochartConfig.seriesConfigs.forEach((seriesConfig, i) => {
          if (seriesGradientColors[i]) {
            seriesColorGradients.push(
              <SeriesColorGradient key={seriesConfig.id} uniqueId={seriesColorGradientUniqueIds[seriesConfig.id]} seriesConfig={seriesConfig} />
            );
          }
        });

        linearGradients = mochartConfig.linearGradientConfigs.map(linearGradientConfig => (
          <LinearGradient key={linearGradientConfig.id} uniqueId={linearGradientIdMap[linearGradientConfig.id]} linearGradientConfig={linearGradientConfig} />
        ));

        radialGradients = mochartConfig.radialGradientConfigs.map(radialGradientConfig => (
          <RadialGradient key={radialGradientConfig.id} uniqueId={radialGradientIdMap[radialGradientConfig.id]} radialGradientConfig={radialGradientConfig} />
        ));

        if (hasChartDataContent) {
          const { groupFocusDomainPercentages, seriesFocusDomainPercentages } = focusData;
          const { group: groupAxisData, series: seriesAxisData } = axisData;
          const { valueData: groupValueData } = groupAxisData;
          const { seriesConfigs } = mochartConfig;

          maxTickLabelLength = groupAxisData.maxTickLabelLength;

          clips = clips.concat([
            <TooltipClip key="tooltip-clip" mochartConfig={mochartConfig} tooltipVisible={tooltipVisible} tooltipShown={tooltipShown}
              tooltipLayoutInfo={tooltipLayoutInfo} chartContentLayoutInfo={chartContentLayoutInfo} width={width} height={height}
              tooltipClipPathUniqueId={tooltipClipPathUniqueId} />
          ]);

          tooltip = (
            <Tooltip mochartConfig={mochartConfig} tooltipValueObject={tooltipValueObject} tooltipGroupIndex={tooltipGroupIndex} focusedGroupIndex={focusedGroupIndex}
              focusedSeriesId={focusedSeriesId} seriesAxisFocusPercentages={seriesAxisFocusPercentages} seriesFocusPercentages={seriesFocusPercentages}
              tooltipVisible={tooltipVisible} groupCount={chartData.groupData.values.raw.length}
              tooltipLayoutInfo={tooltipLayoutInfo} tooltipBounds={tooltipBounds} svgUniqueId={svgUniqueId}
              onClose={this.closeTooltip} updateTooltipGroupIndex={this.updateTooltipGroupIndex} onFocus={onFocus} onSeriesFilter={onSeriesFilter} />
          );

          if (seriesConfigs.length === 0) {
            const { x, y, width, height } = seriesLayoutInfo;

            const noSeriesStyle = {
              position: 'absolute',
              left: x,
              top: y,
              width,
              maxWidth: width
            };

            let noSeriesComponent = getNoSeriesComponent({ width, height });

            noSeriesContainer = (
              <div className={mochartCssClasses['noSeries']} style={noSeriesStyle}>
                {noSeriesComponent}
              </div>
            );
          }

          plot = (
            <Plot mochartConfig={mochartConfig} gradientIdMap={gradientIdMap} groupAxisLayoutInfo={groupAxisLayoutInfo}
              seriesAxisLayoutInfos={seriesAxisLayoutInfos} seriesLayoutInfo={seriesLayoutInfo}
              plotLayoutInfo={plotLayoutInfo} chartData={chartData} focusData={focusData} axisData={axisData}
              stackData={stackData} groupValueData={groupValueData} onFocus={onFocus} shapeRef={this.setChartRectRef}
              groupAxisTitleClipPathUniqueId={groupAxisTitleClipPathUniqueId}
              groupAxisTickLabelClipPathUniqueId={groupAxisTickLabelClipPathUniqueId}
              seriesAxisTitleClipPathUniqueIds={seriesAxisTitleClipPathUniqueIds}
              tooltipClipPathUniqueId={tooltipClipPathUniqueId} />
          );
        }
        else {
          plotEmpty = (
            <PlotEmpty mochartConfig={mochartConfig} groupAxisLayoutInfo={groupAxisLayoutInfo}
              seriesAxisLayoutInfos={seriesAxisLayoutInfos} plotLayoutInfo={plotLayoutInfo}
              groupAxisTitleClipPathUniqueId={groupAxisTitleClipPathUniqueId}
              groupAxisTickLabelClipPathUniqueId={groupAxisTickLabelClipPathUniqueId}
              seriesAxisTitleClipPathUniqueIds={seriesAxisTitleClipPathUniqueIds} />
          );

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

          noDataContainer = (
            <div className={mochartCssClasses['noData']} style={noDataStyle}>
              {noDataContent}
            </div>
          );
        }

        if (loading) {
          const { x, y, width, height } = seriesLayoutInfo;

          const loadingStyle = {
            position: 'absolute',
            left: x,
            top: y,
            width,
            maxWidth: width
          };

          loadingContainer = (
            <div className={mochartCssClasses['loading']} style={loadingStyle}>
              {getLoadingComponent({ mochartConfig, dataProvider, width, height, hasData: hasChartDataContent })}
            </div>
          );
        }

        const inverted = mochartConfig.plotConfig.inverted;

        clips = clips.concat([
          <AxisTitleClip key="group-axis-title-clip" axisConfig={mochartConfig.groupAxisConfig} chartContentLayoutInfo={chartContentLayoutInfo}
            axisLayoutInfo={groupAxisLayoutInfo} axisTitleClipPathUniqueId={groupAxisTitleClipPathUniqueId} />,
          <GroupAxisTickLabelClip key="group-axis-tick-label-clip" mochartConfig={mochartConfig} maxTickLabelLength={maxTickLabelLength}
            chartContentLayoutInfo={chartContentLayoutInfo} groupAxisLayoutInfo={groupAxisLayoutInfo}
            groupAxisTickLabelClipPathUniqueId={groupAxisTickLabelClipPathUniqueId} />
        ]);

        clips = clips.concat(mochartConfig.seriesAxisConfigs.map(seriesAxisConfig =>
          <AxisTitleClip key={'series-axis-clip-' + seriesAxisConfig.id} axisConfig={seriesAxisConfig}
            chartContentLayoutInfo={chartContentLayoutInfo} axisLayoutInfo={seriesAxisLayoutInfos[seriesAxisConfig.id]}
            axisTitleClipPathUniqueId={seriesAxisTitleClipPathUniqueIds[seriesAxisConfig.id]} />));

        let legend = (
          <Legend mochartConfig={mochartConfig} filteredFlags={filteredFlags} focusedSeriesId={focusedSeriesId}
            seriesAxisFocusPercentages={seriesAxisFocusPercentages} seriesFocusPercentages={seriesFocusPercentages} onFocus={onFocus}
            uniqueIds={uniqueIds} onSeriesFilter={onSeriesFilter} legendLayoutInfo={legendLayoutInfo} legendItemTextLayoutInfo={legendItemTextLayoutInfo}
            legendItemLayoutInfos={legendItemLayoutInfos} legendItemRawLayoutInfos={legendItemRawLayoutInfos} />
        );

        chartContent = (
          <div className={mochartCssClasses['chart']} ref={this.setChartRef} {...chartEventHandler} style={style} data-mochart-version={getVersionString()}>
            <svg xmlns="http://www.w3.org/2000/svg" id={svgUniqueId} width={width} height={height}>
              <defs>
                {clips}
                {seriesColorGradients}
                {linearGradients}
                {radialGradients}
              </defs>
              <Background config={mochartConfig.chartConfig} classKey='background' spacingRelative={false} spacingLayoutInfo={chartContentLayoutInfo} />
              <Title mochartConfig={mochartConfig} titleLayoutInfo={titleLayoutInfo} titlePrefixLayoutInfo={titlePrefixLayoutInfo}
                titleTextLayoutInfo={titleTextLayoutInfo} titleTextRawLayoutInfo={titleTextRawLayoutInfo} titleSuffixLayoutInfo={titleSuffixLayoutInfo}
                titleClipPathUniqueId={titleClipPathUniqueId} onClick={this.onTitleClick} />
              <g transform={chartTransform}>
                {plot}
                {plotEmpty}
                {legend}
              </g>
            </svg>
            {noDataContainer}
            {noSeriesContainer}
            {loadingContainer}
            {tooltip}
          </div>
        );
      }
    }

    return chartContent;
  }
}