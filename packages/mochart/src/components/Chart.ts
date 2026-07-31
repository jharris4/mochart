import { Renderer, svgEl, htmlEl, El } from '../render';
import type { ElSlot, RendererItem, RendererList, Slot } from '../render';

import { getVersionString } from '../version';
import { hasConfigStructureChange } from '../config/core/mochartConfig';
import { isDataProviderValid, getGroupSeriesValueObject, getChartDataGroupCount } from '../data/ChartData';
import type { GroupSeriesValueObject } from '../data/ChartData';
import { getChartLayoutInfo, getChartLayoutInfoWithMutations } from '../layout/ChartLayout';
import { getTooltipLayoutInfo, getTooltipLayoutInfoWithMutations } from '../layout/TooltipLayout';
import { getAxisData, getAxisDataWithMutations, getAxisDataForGroupChange, getAxisDataForSeriesChange } from '../data/AxisData';
import { getStackData, getStackDataWithMutations } from '../data/StackData';
import { getChartTextBoundsData, getChartTextBoundsDataWithMutations, getTooltipBounds, getBoundsWithMutations } from '../utils/TextMeasurement';
import { mochartCssClasses, getDomAccessors } from '../utils/ChartDom';
import { CHART_TYPE_PIE } from '../config/core/constants';

import Background from './Background';
import Title from './Title';
import Plot from './Plot';
import RadialPlot from './RadialPlot';
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
import type { ChartFactoryContent, ChartFactoryContext, ChartContentFactory, ChartEventPayload, ChartSliceClickPayload, InternalFocus } from '../types/chart';
import type { LinearGradientConfig, MochartConfig, RadialGradientConfig, SeriesAxisConfig, SeriesConfig } from '../types/config';
import type { AxisData, ChartData, DataProvider, StackData } from '../types/data';
import type { FocusData } from '../types/animation';
import type { ChartLayoutInfo, ChartTextBoundsData, LayoutInfo } from '../types/layout';
import type { Bounds, Size } from '../types/geometry';

export interface ChartProps {
  mochartConfig: MochartConfig;
  dataProvider: DataProvider;
  chartData: ChartData | null;
  focusData: FocusData | null;
  /** 0..1 while the initial value tween runs (pie sweep-in), else null. */
  initialAnimationPercentage?: number | null;
  width: number;
  height: number;
  standalone?: boolean;
  style?: string | Record<string, string | number | null | undefined>;
  loading?: boolean;
  error?: unknown;
  onSeriesLayoutInfoChange?: (bounds: Bounds) => void;
  onFocus?: (focus: InternalFocus) => void;
  onSeriesFilter?: (seriesId: string) => void;
  onChartClick?: (payload: ChartEventPayload) => void;
  onSliceClick?: (payload: ChartSliceClickPayload) => void;
  onChartMouseEnter?: (payload: ChartEventPayload) => void;
  onChartMouseMove?: (payload: ChartEventPayload) => void;
  onChartMouseLeave?: (payload: ChartEventPayload) => void;
  onTitleClick?: () => void;
  getLoadingComponent?: ChartContentFactory;
  getErrorComponent?: ChartContentFactory;
  getNoDataComponent?: ChartContentFactory;
  getNoSizeComponent?: ChartContentFactory;
  getNoSeriesComponent?: ChartContentFactory;
  getConfigErrorComponent?: ChartContentFactory;
}

interface ChartUniqueIds {
  svgUniqueId: string;
  tooltipClipPathUniqueId: string;
  titleClipPathUniqueId: string;
  legendClipPathUniqueId: string;
  groupAxisTitleClipPathUniqueId: string;
  groupAxisTickLabelClipPathUniqueId: string;
  seriesAxisTitleClipPathUniqueIds: Record<string, string>;
  seriesColorGradientUniqueIds: Record<string, string>;
  gradientIdMap: Record<string, string>;
  linearGradientIdMap: Record<string, string>;
  radialGradientIdMap: Record<string, string>;
}

interface ChartState {
  uniqueIds: ChartUniqueIds | null;
  layoutInfo: ChartLayoutInfo | null;
  tooltipLayoutInfo: Bounds | null;
  chartTextBoundsData: ChartTextBoundsData;
  tooltipBounds: Size | null;
  axisData: AxisData | null;
  stackData: StackData | null;
  tooltipVisible: boolean;
  tooltipGroupIndex: number;
  tooltipGroupPercentage: number | null;
  tooltipSeriesPercentage: number | null;
  tooltipValueObject: GroupSeriesValueObject | null;
}

type ChartStateUpdate = Partial<ChartState>;
type ChartPointCallback = (chartX: number, chartY: number) => void;
type ChartPointerEvent = MouseEvent | TouchEvent;
type FactoryContent = ChartFactoryContent | El;
type FactoryEl = El & { _factoryContent?: FactoryContent };

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
// the same.
function buildMessageDiv(style: Record<string, string | number | null | undefined>, message: string): Node {
  const el = htmlEl('div');
  el.set({ style });
  el.node.textContent = message;
  return el.node;
}

function getLoadingComponent({ width = 0, height = 0 }: ChartFactoryContext): Node {
  return buildMessageDiv({ width: width, height: height, textAlign: 'center', verticalAlign: 'middle', display: 'table-cell' }, 'Loading...');
}

function getErrorComponent({ width = 0, height = 0, error }: ChartFactoryContext): Node {
  const errorMessage = error ? typeof error === 'object' ? JSON.stringify(error) : String(error) : 'Invalid Chart Config';
  return buildMessageDiv({ width: width, height: height, textAlign: 'center', verticalAlign: 'middle', display: 'table-cell' }, errorMessage);
}

function getNoDataComponent({ width = 0, height = 0 }: ChartFactoryContext): Node {
  return buildMessageDiv({ width: width, height: height, textAlign: 'center', verticalAlign: 'middle', display: 'table-cell' }, 'No Data');
}

function getNoSizeComponent({ width = 0, height = 0 }: ChartFactoryContext): Node {
  const style: Record<string, string | number> = {
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

function getNoSeriesComponent({ width = 0, height = 0 }: ChartFactoryContext): Node {
  return buildMessageDiv({ width: width, height: height, textAlign: 'center', verticalAlign: 'middle', display: 'table-cell' }, 'No Series');
}

function getConfigErrorComponent({ width = 0, height = 0 }: ChartFactoryContext): Node {
  const style: Record<string, string | number> = {
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
function setFactoryContent(containerEl: FactoryEl, content: FactoryContent): void {
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

function getBoundsForSeriesLayoutInfo(seriesLayoutInfo: LayoutInfo): Bounds {
  return {
    x: seriesLayoutInfo.x, y: seriesLayoutInfo.y,
    width: seriesLayoutInfo.width, height: seriesLayoutInfo.height
  };
}

function getBoundsAreDifferent(oldBounds: Bounds, newBounds: Bounds): boolean {
  return oldBounds.x !== newBounds.x || oldBounds.y !== newBounds.y || oldBounds.width !== newBounds.width || oldBounds.height !== newBounds.height;
}

const getInitialState = (): ChartState => ({
  uniqueIds: null, layoutInfo: null, tooltipLayoutInfo: null, chartTextBoundsData: {} as ChartTextBoundsData, tooltipBounds: null, axisData: null, stackData: null,
  ...getInitialTooltipState()
});

const getInitialTooltipState = (): Pick<ChartState, 'tooltipVisible' | 'tooltipGroupIndex' | 'tooltipGroupPercentage' | 'tooltipSeriesPercentage' | 'tooltipValueObject'> => ({
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
interface ChartBodyProps {
  chart: Chart;
  /** Change tokens that force the pass-through body to resync with its owner. */
  chartProps: ChartProps;
  chartState: ChartState;
  error: unknown;
  loading: boolean;
}

class ChartBody extends Renderer<ChartBodyProps> {
  svg!: El;
  defs!: El;
  clips!: RendererList;
  seriesColorGradients!: RendererList;
  linearGradients!: RendererList;
  radialGradients!: RendererList;
  background!: Slot;
  title!: Slot;
  contentGroup!: El;
  plot!: Slot;
  plotEmpty!: Slot;
  legend!: Slot;
  svgSlot!: ElSlot;
  noDataSlot!: ElSlot;
  noSeriesSlot!: ElSlot;
  loadingSlot!: ElSlot;
  tooltip!: Slot;
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

const defaultChartStyle = { position: 'relative' };

export default class Chart extends Renderer<ChartProps, ChartState> {
  root = htmlEl('div');
  simpleContent = this.elSlot(this.root);
  body = this.slot(this.root);
  uniqueId: string;
  chartRef: Element | null = null;
  chartRectRef: Element | null = null;
  isMouseWithinChart = false;
  chartEventHandler: Record<string, (event: ChartPointerEvent) => void>;
  _simpleNodeContent: FactoryContent = null;
  _simpleNode: Node | null = null;

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
      onMouseEnter: (event: ChartPointerEvent) => {
        this.processChartMotionEvent(event);
      },
      onMouseMove: (event: ChartPointerEvent) => {
        this.processChartMotionEvent(event);
      },
      onMouseLeave: (event: ChartPointerEvent) => {
        this.processChartMotionEvent(event);
      },
      onClick: (event: ChartPointerEvent) => {
        this.processChartEvent(event, this.onChartClick);
      }
    };
  }

  processChartMotionEvent(event: ChartPointerEvent): void {
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

  processChartEvent(event: ChartPointerEvent, mouseInCallback: ChartPointCallback, mouseOutCallback?: ChartPointCallback): void {
    let position: MouseEvent | Touch;
    if ('targetTouches' in event) {
      const touch = event.targetTouches[0] ?? event.changedTouches[0];
      if (!touch) {
        return;
      }
      position = touch;
    }
    else {
      position = event;
    }
    const chartRect = this.chartRectRef!.getBoundingClientRect();
    const chartX = position.clientX - chartRect.left;
    const chartY = position.clientY - chartRect.top;
    if (chartX > 0 && chartY > 0 && chartX < chartRect.width && chartY < chartRect.height) {
      mouseInCallback(chartX, chartY);
    }
    else if (mouseOutCallback) {
      mouseOutCallback(chartX, chartY);
    }
  }

  /**
   * Finalize a state delta that carries a new layoutInfo: reuse unchanged
   * layout identities, notify onSeriesLayoutInfoChange when the series area
   * moved, and refresh the tooltip layout. Returns the delta for the caller
   * to merge (derive) or setState (post-commit).
   */
  applyLayoutInfo(props: ChartProps, state: ChartStateUpdate & { layoutInfo: ChartLayoutInfo | null }): ChartStateUpdate {
    if (state.layoutInfo !== null) {
      state.layoutInfo = getChartLayoutInfoWithMutations(this.state.layoutInfo, state.layoutInfo);
      if (this.state.layoutInfo !== state.layoutInfo) {
        const newBounds = getBoundsForSeriesLayoutInfo(state.layoutInfo.seriesLayoutInfo);
        if (this.state.layoutInfo === null) {
          this.onSeriesLayoutInfoChange(newBounds);
        }
        else if (state.layoutInfo.seriesLayoutInfo !== this.state.layoutInfo.seriesLayoutInfo) {
          const oldBounds = getBoundsForSeriesLayoutInfo(this.state.layoutInfo.seriesLayoutInfo);
          if (getBoundsAreDifferent(oldBounds, newBounds)) {
            this.onSeriesLayoutInfoChange(newBounds);
          }
        }
      }
      state.tooltipLayoutInfo = getTooltipLayoutInfoWithMutations(this.state.tooltipLayoutInfo,
        this.getTooltipLayoutInfo(props, state));
    }
    return state;
  }

  getTooltipLayoutInfo(props: ChartProps, state: ChartStateUpdate): Bounds {
    const { mochartConfig } = props;
    const { layoutInfo, axisData, tooltipGroupIndex, tooltipSeriesPercentage, tooltipGroupPercentage, tooltipBounds } =
      { ...this.state, ...state };

    const groupValueData = axisData?.group?.valueData;
    if (tooltipBounds === null) {
      return getTooltipLayoutInfo(mochartConfig, null);
    }
    return getTooltipLayoutInfo(mochartConfig, tooltipBounds, layoutInfo!, groupValueData!, tooltipGroupIndex,
      tooltipGroupPercentage!, tooltipSeriesPercentage!);
  }

  constructUniqueIds(props: ChartProps): Pick<ChartState, 'uniqueIds'> {
    const uniqueId = this.uniqueId;
    const { mochartConfig } = props;
    const { seriesAxisConfigs, seriesConfigs, linearGradientConfigs, radialGradientConfigs } = mochartConfig;

    const svgUniqueId = mochartChartIdPrefix + uniqueId;
    const tooltipClipPathUniqueId = tooltipClipPathIdPrefix + uniqueId;
    const titleClipPathUniqueId = titleClipPathIdPrefix + uniqueId;
    const legendClipPathUniqueId = legendClipPathIdPrefix + uniqueId;
    const groupAxisTitleClipPathUniqueId = groupAxisTitleClipPathIdPrefix + uniqueId;
    const groupAxisTickLabelClipPathUniqueId = gridAxisTickLabelClipPathIdPrefix + uniqueId;
    const seriesAxisTitleClipPathUniqueIds: Record<string, string> = {};
    for (const { id } of seriesAxisConfigs) {
      seriesAxisTitleClipPathUniqueIds[id] = seriesAxisTitleClipPathIdPrefix + uniqueId + '__' + id;
    }
    const linearGradientIdMap: Record<string, string> = {};
    for (const { id } of linearGradientConfigs) {
      linearGradientIdMap[id] = linearGradientIdPrefix + uniqueId + '__' + id;
    }
    const radialGradientIdMap: Record<string, string> = {};
    for (const { id } of radialGradientConfigs) {
      radialGradientIdMap[id] = radialGradientIdPrefix + uniqueId + '__' + id;
    }
    const seriesColorGradientUniqueIds: Record<string, string> = {};
    for (const { id } of seriesConfigs) {
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

  init(props: ChartProps, warn = false): ChartStateUpdate {
    const { mochartConfig, chartData, width, height, standalone } = props;
    const newState = getInitialState();
    if (mochartConfig) {
      const { validation } = mochartConfig;
      const { valid, errors, warnings } = validation;

      if (valid) {
        const uniqueIdState = this.constructUniqueIds(props);
        const domAccessors = this.chartRef ? getDomAccessors(this.chartRef) : null;
        const chartTextBoundsData = getChartTextBoundsData(mochartConfig, domAccessors);

        const layoutInfo = getChartLayoutInfo(mochartConfig, chartData, chartTextBoundsData, width, height);
        let axisData = null;
        let stackData = null;
        if (chartData !== null && getChartDataGroupCount(chartData) > 0) {
          axisData = getAxisData(mochartConfig, layoutInfo, chartData);
          stackData = getStackData(mochartConfig, chartData);
        }
        return this.applyLayoutInfo(props, { ...newState, layoutInfo, axisData, stackData, chartTextBoundsData, ...uniqueIdState });
      }
      if (warn && standalone) {
        if (errors.length > 0) {
          console.warn('mochart config had error messages: ', errors.join('\n'));
        }
        if (warnings.length > 0) {
          console.warn('mochart config had warning messages: ', warnings.join('\n'));
        }
      }
      return newState;
    }
    return newState;
  }

  calculateTooltipTextSize = () => {
    const { mochartConfig } = this.props;
    let { tooltipBounds } = this.state;
    tooltipBounds = getBoundsWithMutations(tooltipBounds, getTooltipBounds(mochartConfig, getDomAccessors(this.chartRef!)));
    const tooltipLayoutInfo = getTooltipLayoutInfoWithMutations(this.state.tooltipLayoutInfo,
      this.getTooltipLayoutInfo(this.props, { tooltipBounds }));
    this.setState({ tooltipBounds, tooltipLayoutInfo });
  }

  calculateInitialTextSizes() {
    if (this.chartRef) {
      const { mochartConfig, chartData } = this.props;
      const newState = this.calculateTextSizes(false);
      if (newState.layoutInfo == null) {
        // measurements were unchanged; push any tooltip remeasure through on its own
        if (newState.tooltipBounds !== undefined) {
          this.setState(newState);
        }
        return;
      }
      if (chartData) {
        newState.axisData = getAxisDataWithMutations(this.state.axisData, mochartConfig, newState.layoutInfo, chartData);
      }
      this.setState(this.applyLayoutInfo(this.props, { ...newState, layoutInfo: newState.layoutInfo }));
    }
  }

  calculateTextSizes(setState = true): ChartStateUpdate {
    let newState: ChartStateUpdate = {};
    if (this.chartRef) {
      const { mochartConfig, chartData, width, height } = this.props;
      const domAccessors = getDomAccessors(this.chartRef);
      let chartTextBoundsData = getChartTextBoundsData(mochartConfig, domAccessors);
      chartTextBoundsData = getChartTextBoundsDataWithMutations(this.state.chartTextBoundsData, chartTextBoundsData);
      let layoutInfo = this.state.layoutInfo;
      if (chartTextBoundsData !== this.state.chartTextBoundsData || layoutInfo === null) {
        layoutInfo = getChartLayoutInfo(mochartConfig, chartData, chartTextBoundsData, width, height);
        newState = { chartTextBoundsData, layoutInfo };
      }
      const { tooltipVisible } = this.state;
      if (tooltipVisible) {
        let { tooltipBounds } = this.state;
        tooltipBounds = getBoundsWithMutations(tooltipBounds, getTooltipBounds(mochartConfig, domAccessors));
        const tooltipLayoutInfo = getTooltipLayoutInfoWithMutations(this.state.tooltipLayoutInfo,
          this.getTooltipLayoutInfo(this.props, { tooltipBounds }));
        newState.tooltipBounds = tooltipBounds;
        newState.tooltipLayoutInfo = tooltipLayoutInfo;
      }
      if (setState === true && (newState.layoutInfo !== undefined || newState.tooltipBounds !== undefined)) {
        const { layoutInfo: oldLayoutInfo, axisData: oldAxisData } = this.state;
        const groupExtentChanged = oldLayoutInfo === null || oldLayoutInfo.seriesLayoutInfo.groupExtent !== layoutInfo.seriesLayoutInfo.groupExtent;
        const seriesExtentChanged = oldLayoutInfo === null || oldLayoutInfo.seriesLayoutInfo.seriesExtent !== layoutInfo.seriesLayoutInfo.seriesExtent;
        if (chartData) {
          if (oldAxisData === null || groupExtentChanged && seriesExtentChanged) {
            newState.axisData = getAxisDataWithMutations(this.state.axisData, mochartConfig, layoutInfo, chartData);
          }
          else if (groupExtentChanged || seriesExtentChanged) {
            const { axisData } = this.state;
            if (groupExtentChanged) {
              newState.axisData = getAxisDataForGroupChange(axisData!, mochartConfig, layoutInfo, chartData);
            }
            else {
              newState.axisData = getAxisDataForSeriesChange(axisData!, mochartConfig, layoutInfo, chartData);
            }
          }
        }
        this.setState(this.applyLayoutInfo(this.props, { ...newState, layoutInfo }));
      }
    }
    return newState;
  }

  updateTextSizes() {
    if (this.chartRef) {
      const { mochartConfig, chartData, width, height } = this.props;
      const domAccessors = getDomAccessors(this.chartRef);
      let chartTextBoundsData = getChartTextBoundsData(mochartConfig, domAccessors);
      chartTextBoundsData = getChartTextBoundsDataWithMutations(this.state.chartTextBoundsData, chartTextBoundsData);
      if (chartTextBoundsData !== this.state.chartTextBoundsData) {
        let layoutInfo = getChartLayoutInfo(mochartConfig, chartData, chartTextBoundsData, width, height);
        layoutInfo = getChartLayoutInfoWithMutations(this.state.layoutInfo, layoutInfo);
        this.setState({ chartTextBoundsData, layoutInfo });
      }
    }
  }

  derive(nextProps: ChartProps, _state: ChartState, prevProps: ChartProps | null): ChartStateUpdate | null {
    if (prevProps === null) {
      return this.init(nextProps, true);
    }
    const { mochartConfig, chartData, width, height } = nextProps;

    const dataChanged = chartData !== prevProps.chartData;
    const sizeChanged = width !== prevProps.width || height !== prevProps.height;
    const mochartConfigChanged = mochartConfig !== prevProps.mochartConfig;
    const mochartConfigStructureChanged = mochartConfigChanged && (!mochartConfig || hasConfigStructureChange(prevProps.mochartConfig, mochartConfig));

    if (mochartConfigChanged || dataChanged || sizeChanged) {
      if (!mochartConfig || mochartConfigStructureChanged || (dataChanged && chartData === null)) {
        return this.init(nextProps, mochartConfigStructureChanged);
      }
      else if (mochartConfig.validation.valid) {
        const { chartTextBoundsData, axisData: oldAxisData, stackData: oldStackData } = this.state;
        let { uniqueIds, layoutInfo, axisData, stackData } = this.state;

        const groupAxisChanged = chartData === null || prevProps.chartData === null || prevProps.chartData.groupData !== chartData.groupData;
        const seriesAxisChanged = chartData === null || prevProps.chartData === null || prevProps.chartData.seriesData.raw.axisDomains !== chartData.seriesData.raw.axisDomains ||
          prevProps.chartData.seriesData.filtered.axisDomains !== chartData.seriesData.filtered.axisDomains;
        // TODO - what about if seriesData.axisSeriesCounts changes? how should that be handled?
        // layout reads chartData only through seriesData.axisSeriesCounts (ChartDataForLayout),
        // so value-tween frames that keep that identity can keep the current layout
        const layoutInputsChanged = mochartConfigChanged || sizeChanged || this.state.layoutInfo === null ||
          chartData === null || prevProps.chartData === null ||
          chartData.seriesData.axisSeriesCounts !== prevProps.chartData.seriesData.axisSeriesCounts;
        if (layoutInputsChanged) {
          layoutInfo = getChartLayoutInfo(mochartConfig, chartData, chartTextBoundsData, width, height);
          layoutInfo = getChartLayoutInfoWithMutations(this.state.layoutInfo, layoutInfo);
        }

        let tooltipStateSource: ChartState | ReturnType<typeof getInitialTooltipState> = this.state;
        if (chartData !== null) {
          if (oldAxisData === null || mochartConfigChanged || sizeChanged || (groupAxisChanged && seriesAxisChanged)) {
            axisData = getAxisDataWithMutations(oldAxisData, mochartConfig, layoutInfo!, chartData);
          }
          else {
            if (groupAxisChanged) {
              axisData = getAxisDataForGroupChange(axisData!, mochartConfig, layoutInfo!, chartData);
            }
            else if (seriesAxisChanged) {
              axisData = getAxisDataForSeriesChange(axisData!, mochartConfig, layoutInfo!, chartData);
            }
          }
          if (mochartConfigChanged || dataChanged) {
            stackData = getStackDataWithMutations(oldStackData, mochartConfig, chartData);
          }

          if (dataChanged && prevProps.chartData !== null) {
            let { tooltipGroupIndex, tooltipValueObject } = this.state;
            if (tooltipGroupIndex >= 0) {
              const oldGroupValues = prevProps.chartData.groupData.values.raw;
              const newGroupValues = chartData.groupData.values.raw;
              if (oldGroupValues && newGroupValues) {
                const groupValue = oldGroupValues[tooltipGroupIndex];
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
        return this.applyLayoutInfo(nextProps, newState);
      }
      else {
        return getInitialState();
      }
    }
    return null;
  }

  measure(prevProps: ChartProps | null, prevState: ChartState | null): void {
    if (prevProps === null || prevState === null) {
      this.calculateTextSizes();
      return;
    }
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
          const axisDataChanged = oldAxisData !== axisData;
          // rendered chart text comes from the config (titles, legend) and from
          // axisData (tick labels); a data change that keeps both identities cannot
          // change any measured text, so value-tween frames skip the DOM remeasure.
          // hasDefault keeps retrying bounds that could not be measured yet.
          const textMayHaveChanged = axisDataChanged || this.state.chartTextBoundsData.hasDefault === true;

          if (mochartConfigChanged || sizeChanged || (dataChanged && textMayHaveChanged)) {
            this.calculateInitialTextSizes();
          }

          if (tooltipVisible) {
            // dataChanged: an open tooltip renders the new values, so its bounds
            // need remeasuring even when the chart text is untouched
            if (dataChanged || !oldTooltipVisible || oldTooltipGroupIndex !== tooltipGroupIndex) {
              this.calculateTooltipTextSize();
            }
          }
        }
      }
    }
  }

  onSeriesLayoutInfoChange(layoutBounds: Bounds): void {
    this.props.onSeriesLayoutInfoChange?.(layoutBounds);
  }

  closeTooltip = () => {
    this.setState({ ...getInitialTooltipState(), tooltipBounds: null });
  }

  updateTooltipGroupIndex = (tooltipGroupIndex: number): void => {
    const { chartData } = this.props;
    const tooltipValueObject = getGroupSeriesValueObject(chartData!, tooltipGroupIndex);
    const tooltipLayoutInfo = this.getTooltipLayoutInfo(this.props, { ...this.state, tooltipGroupIndex });
    this.setState({ tooltipGroupIndex, tooltipValueObject, tooltipLayoutInfo });
  }

  toggleTooltip({ groupIndex, groupPercentage, seriesPercentage }: ChartEventPayload): void {
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
      tooltipValueObject = tooltipVisible ? getGroupSeriesValueObject(chartData!, tooltipGroupIndex) : null;
      if ((tooltipConfig.visible && tooltipConfig.applyFocus) || (crosshairConfig.visible && crosshairConfig.applyFocus)) {
        onFocus?.({ groupIndex: tooltipGroupIndex });
      }
      this.setState({ tooltipVisible, tooltipGroupIndex, tooltipSeriesPercentage, tooltipGroupPercentage, tooltipLayoutInfo, tooltipBounds, tooltipValueObject });
    }
  }

  getChartEventPayload = (chartX: number, chartY: number): ChartEventPayload => {
    const { mochartConfig } = this.props;
    const { axisData, layoutInfo } = this.state;
    const dataGroupPositions = axisData!.group!.valueData.positions;
    const { seriesLayoutInfo } = layoutInfo!;
    const { plotConfig } = mochartConfig;

    const groupPosition = plotConfig.inverted ? chartY : chartX;
    const groupPercentage = groupPosition / seriesLayoutInfo.groupExtent;
    let groupIndex = -1;
    let groupDifference = Number.MAX_VALUE;
    const groupCount = dataGroupPositions.length;
    let dataGroupPosition;
    for (let dataGroupIndex = 0; dataGroupIndex < groupCount; dataGroupIndex++) {
      dataGroupPosition = dataGroupPositions[dataGroupIndex];
      const currentDifference = Math.abs(dataGroupPosition - groupPosition);
      if (currentDifference <= groupDifference) { // <= means we'll pick the greater group value on a tie
        groupDifference = currentDifference;
        groupIndex = dataGroupIndex;
      }
    }
    const seriesPosition = plotConfig.inverted ? chartX : chartY;
    const seriesPercentage = seriesPosition / seriesLayoutInfo.seriesExtent;

    return {
      chartX, chartY, groupPosition, seriesPosition, groupPercentage, seriesPercentage, groupIndex
    };
  }

  onChartMouseEnter = (chartX: number, chartY: number): void => {
    const { mochartConfig, onChartMouseEnter } = this.props;
    const eventPayload = this.getChartEventPayload(chartX, chartY);
    onChartMouseEnter?.(eventPayload);
    if (mochartConfig.tooltipConfig.mouseOver) {
      this.toggleTooltip(eventPayload);
    }
  }

  onChartMouseMove = (chartX: number, chartY: number): void => {
    const { mochartConfig, onFocus, onChartMouseMove } = this.props;
    const eventPayload = this.getChartEventPayload(chartX, chartY);
    onChartMouseMove?.(eventPayload);
    if (mochartConfig.tooltipConfig.mouseOver) {
      const { seriesPercentage, groupIndex } = eventPayload;
      if (mochartConfig.tooltipConfig.visible) {
        onFocus?.({ groupIndex });
        this.setState({ tooltipSeriesPercentage: seriesPercentage });
      }
      else {
        this.setState({ tooltipBounds: null });
      }
    }
  }

  onChartMouseLeave = (chartX: number, chartY: number): void => {
    const { mochartConfig, onChartMouseLeave } = this.props;
    const eventPayload = this.getChartEventPayload(chartX, chartY);
    onChartMouseLeave?.(eventPayload);
    if (mochartConfig.tooltipConfig.mouseOver) {
      this.toggleTooltip(eventPayload);
    }
  }

  onChartClick = (chartX: number, chartY: number): void => {
    const { mochartConfig, onChartClick } = this.props;
    const eventPayload = this.getChartEventPayload(chartX, chartY);
    onChartClick?.(eventPayload);
    if (!mochartConfig.tooltipConfig.mouseOver) {
      this.toggleTooltip(eventPayload);
    }
  }

  onTitleClick = () => {
    const { onTitleClick } = this.props;
    onTitleClick?.();
  }

  setChartRectRef = (chartRectRef: Element | null): void => {
    this.chartRectRef = chartRectRef;
  }

  create() {
    return this.root.node;
  }

  sync() {
    const {
      mochartConfig, dataProvider, style = defaultChartStyle, width, height, error: propsError, loading: propsLoading,
      getErrorComponent: errorFactory = getErrorComponent,
      getLoadingComponent: loadingFactory = getLoadingComponent,
      getNoSizeComponent: noSizeFactory = getNoSizeComponent,
      getConfigErrorComponent: configErrorFactory = getConfigErrorComponent
    } = this.props;

    if ((width === 0 || height === 0) || (mochartConfig && !mochartConfig.validation.valid)) {
      let errorComponent: FactoryContent = false;
      if (width === 0 || height === 0) {
        errorComponent = noSizeFactory({ mochartConfig, width, height });
      }
      else if (mochartConfig) {
        errorComponent = configErrorFactory({ mochartConfig, width, height });
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

    const error = propsError ? propsError : dataProvider && !isDataProviderValid(dataProvider) ? dataProvider.getError?.() : false;
    const loading = Boolean(propsLoading ? propsLoading : dataProvider && dataProvider.getLoading?.());

    if (!mochartConfig) {
      if (error) {
        this.setPresent(true);
        this.chartRef = null;
        this.root.set({ className: mochartCssClasses['chartError'], style, 'data-mochart-version': getVersionString() });
        this.body.set(null);
        this.setSimpleContent(errorFactory({ dataProvider, width, height, error }));
      }
      else if (loading) {
        this.setPresent(true);
        this.chartRef = null;
        this.root.set({ className: mochartCssClasses['loading'], style, 'data-mochart-version': getVersionString() });
        this.body.set(null);
        this.setSimpleContent(loadingFactory({ width, height }));
      }
      else {
        this.chartRef = null;
        this.setPresent(false);
      }
      return;
    }

    const hasChartDataContent = this.hasChartDataContent(error);
    const chartEventHandler = (hasChartDataContent && !loading) ? this.chartEventHandler : {};

    this.setPresent(true);
    this.root.set({ className: mochartCssClasses['chart'], ...chartEventHandler, style, 'data-mochart-version': getVersionString() });
    this.chartRef = this.root.node;
    this.setSimpleContent(false);
    this.body.set(ChartBody, { chart: this, chartProps: this.props, chartState: this.state, error, loading });
  }

  /** Insert factory-produced content (Node | El | string | falsy) into the simple-content region of the root div. */
  setSimpleContent(content: FactoryContent): void {
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

  hasChartDataContent(error: unknown): boolean {
    const { chartData } = this.props;
    const hasChartData = chartData !== null;
    const groupCount = hasChartData ? getChartDataGroupCount(chartData) : 0;
    return !error && hasChartData && groupCount > 0;
  }

  /** Fill in the ChartBody's slots — called from ChartBody.sync with the body renderer. */
  syncBody(body: ChartBody): void {
    const {
      mochartConfig, dataProvider, chartData, focusData, onFocus, onSeriesFilter, width, height,
      getErrorComponent: errorFactory = getErrorComponent,
      getLoadingComponent: loadingFactory = getLoadingComponent,
      getNoDataComponent: noDataFactory = getNoDataComponent,
      getNoSeriesComponent: noSeriesFactory = getNoSeriesComponent
    } = this.props;
    const { layoutInfo, tooltipLayoutInfo, axisData, stackData, tooltipVisible, tooltipGroupIndex, tooltipBounds, uniqueIds, tooltipValueObject } = this.state;
    const { error, loading } = body.props;

    const {
      svgUniqueId, tooltipClipPathUniqueId, titleClipPathUniqueId, legendClipPathUniqueId, groupAxisTitleClipPathUniqueId,
      groupAxisTickLabelClipPathUniqueId, seriesAxisTitleClipPathUniqueIds, seriesColorGradientUniqueIds, gradientIdMap,
      linearGradientIdMap, radialGradientIdMap
    } = uniqueIds!;
    const {
      chartContentLayoutInfo, titleLayoutInfo, titlePrefixLayoutInfo, titleTextLayoutInfo, titleTextRawLayoutInfo, titleSuffixLayoutInfo,
      legendLayoutInfo, legendItemTextLayoutInfo, legendItemLayoutInfos, legendItemRawLayoutInfos, plotLayoutInfo,
      seriesLayoutInfo, groupAxisLayoutInfo, seriesAxisLayoutInfos
    } = layoutInfo!;
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

    let clips: RendererItem[] = [
      { key: 'title-clip', ctor: TitleClip, props: { titleConfig: mochartConfig.titleConfig, chartContentLayoutInfo,
        titleTextLayoutInfo, titleClipPathUniqueId } },
      { key: 'legend-clip', ctor: LegendClip, props: { legendConfig: mochartConfig.legendConfig, chartContentLayoutInfo,
        legendItemTextLayoutInfo, legendClipPathUniqueId } }
    ];

    if (hasChartDataContent) {
      maxTickLabelLength = axisData!.group!.maxTickLabelLength;

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

    clips = clips.concat(mochartConfig.seriesAxisConfigs.map((seriesAxisConfig: SeriesAxisConfig) => ({
      key: 'series-axis-clip-' + seriesAxisConfig.id,
      ctor: AxisTitleClip,
      props: { axisConfig: seriesAxisConfig,
        chartContentLayoutInfo, axisLayoutInfo: seriesAxisLayoutInfos[seriesAxisConfig.id],
        axisTitleClipPathUniqueId: seriesAxisTitleClipPathUniqueIds[seriesAxisConfig.id] }
    })));

    const seriesGradientColors = mochartConfig.seriesConfigs.map((seriesConfig: SeriesConfig) => getSeriesGradientColors(seriesConfig));
    const seriesColorGradients: RendererItem[] = [];
    mochartConfig.seriesConfigs.forEach((seriesConfig: SeriesConfig, i: number) => {
      if (seriesGradientColors[i]) {
        seriesColorGradients.push({
          key: seriesConfig.id, ctor: SeriesColorGradient,
          props: { uniqueId: seriesColorGradientUniqueIds[seriesConfig.id], seriesConfig }
        });
      }
    });

    const linearGradients: RendererItem[] = mochartConfig.linearGradientConfigs.map((linearGradientConfig: LinearGradientConfig) => ({
      key: linearGradientConfig.id, ctor: LinearGradient,
      props: { uniqueId: linearGradientIdMap[linearGradientConfig.id], linearGradientConfig }
    }));

    const radialGradients: RendererItem[] = mochartConfig.radialGradientConfigs.map((radialGradientConfig: RadialGradientConfig) => ({
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
      const { group: groupAxisData } = axisData!;
      const { valueData: groupValueData } = groupAxisData!;

      if (mochartConfig.chartConfig.type === CHART_TYPE_PIE) {
        body.plot.set(RadialPlot, { mochartConfig, gradientIdMap, seriesLayoutInfo,
          plotLayoutInfo, chartData: chartData!, focusData: focusData!,
          initialAnimationPercentage: this.props.initialAnimationPercentage ?? null,
          onFocus: onFocus ?? (() => {}), onSliceClick: this.props.onSliceClick,
          shapeRef: this.setChartRectRef });
      }
      else {
        body.plot.set(Plot, { mochartConfig, gradientIdMap, groupAxisLayoutInfo,
          seriesAxisLayoutInfos, seriesLayoutInfo,
          plotLayoutInfo, chartData: chartData!, focusData, axisData: axisData!,
          stackData: stackData!, groupValueData, onFocus: onFocus ?? (() => {}), shapeRef: this.setChartRectRef,
          groupAxisTitleClipPathUniqueId,
          groupAxisTickLabelClipPathUniqueId,
          seriesAxisTitleClipPathUniqueIds,
          tooltipClipPathUniqueId });
      }
      body.plotEmpty.set(null);

      body.tooltip.set(Tooltip, { mochartConfig, tooltipValueObject: tooltipValueObject!, tooltipGroupIndex, focusedGroupIndex,
        focusedSeriesId, seriesAxisFocusPercentages, seriesFocusPercentages,
        tooltipVisible, groupCount: chartData.groupData.values.raw.length,
        tooltipLayoutInfo: tooltipLayoutInfo!, tooltipBounds, svgUniqueId,
        onClose: this.closeTooltip, updateTooltipGroupIndex: this.updateTooltipGroupIndex,
        onFocus: onFocus ?? (() => {}), onSeriesFilter: onSeriesFilter ?? (() => {}) });

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
        noSeriesEl!.set({ className: mochartCssClasses['noSeries'], style: noSeriesStyle });
        setFactoryContent(noSeriesEl!, noSeriesFactory({ width, height }));
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

      let noDataContent: FactoryContent = false;
      if (error) {
        noDataContent = errorFactory({ mochartConfig, dataProvider, width, height, error });
      }
      else if (!loading && hasChartData && groupCount === 0) {
        noDataContent = noDataFactory({ mochartConfig, dataProvider, width, height });
      }
      else {
        noDataContent = loadingFactory({ mochartConfig, dataProvider, width, height, hasData: hasChartDataContent });
      }

      const noDataEl = body.noDataSlot.set('div', () => htmlEl('div'));
      noDataEl!.set({ className: mochartCssClasses['noData'], style: noDataStyle });
      setFactoryContent(noDataEl!, noDataContent);
    }

    body.legend.set(Legend, { mochartConfig, filteredFlags, focusedSeriesId,
      seriesAxisFocusPercentages, seriesFocusPercentages, onFocus: onFocus ?? (() => {}),
      uniqueIds: uniqueIds!, onSeriesFilter: onSeriesFilter ?? (() => {}), legendLayoutInfo: legendLayoutInfo!, legendItemTextLayoutInfo: legendItemTextLayoutInfo!,
      legendItemLayoutInfos: legendItemLayoutInfos!, legendItemRawLayoutInfos: legendItemRawLayoutInfos! });

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
      loadingEl!.set({ className: mochartCssClasses['loading'], style: loadingStyle });
      setFactoryContent(loadingEl!, loadingFactory({ mochartConfig, dataProvider, width, height, hasData: hasChartDataContent }));
    }
    else {
      body.loadingSlot.set(null);
    }
  }
}
