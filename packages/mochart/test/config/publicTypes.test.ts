/**
 * API-1: the config union types were named in the public `.d.ts` as the types of public config
 * members but never re-exported, so a TS host could not write `function addSeries(renderer:
 * RendererType)` — only `SeriesConfig['renderer']`. Most of the value constants were missing too.
 *
 * The type half of this is enforced at typecheck time (test/tsconfig.json), not at runtime: if
 * an export is dropped, `npm run typecheck` fails on this file.
 */
import { describe, it, expect } from 'vitest';
import * as mochart from '../../src';
import type {
  CssStyle, MochartInputConfig,
  Auto, Align, VerticalAlign, Anchor, Position, MissingValues, AxisSide, ThresholdTitleSide,
  ChartType, PieLabelType, PieTooltipLabelType, Scale, DataType, RendererType, CurveType,
  CapType, LabelPosition, ColorMode, ColorInterpolation, MarkerShape, MarkerSizeScale
} from '../../src';

// exactly the use the finding calls out: naming a config union in a host's own signature
function describeSeries(renderer: RendererType, curve: CurveType, shape: MarkerShape): string {
  return `${renderer}/${curve}/${shape}`;
}

interface EveryUnion {
  auto: Auto; align: Align; verticalAlign: VerticalAlign; anchor: Anchor; position: Position;
  missingValues: MissingValues; axisSide: AxisSide; thresholdTitleSide: ThresholdTitleSide;
  chartType: ChartType; pieLabelType: PieLabelType; pieTooltipLabelType: PieTooltipLabelType;
  scale: Scale; dataType: DataType; rendererType: RendererType; curveType: CurveType;
  capType: CapType; labelPosition: LabelPosition; colorMode: ColorMode;
  colorInterpolation: ColorInterpolation; markerShape: MarkerShape; markerSizeScale: MarkerSizeScale;
}

describe('public config type surface', () => {
  it('exposes every config union type by name', () => {
    const values: EveryUnion = {
      auto: 'auto', align: 'left', verticalAlign: 'top', anchor: 'start', position: 'top',
      missingValues: 'break', axisSide: 'start', thresholdTitleSide: 'low',
      chartType: 'xy', pieLabelType: 'titlePercent', pieTooltipLabelType: 'value',
      scale: 'linear', dataType: 'number', rendererType: 'bar', curveType: 'stepAfter',
      capType: 'round', labelPosition: 'inside', colorMode: 'seriesIndex',
      colorInterpolation: 'hcl', markerShape: 'star', markerSizeScale: 'sqrt'
    };
    expect(Object.keys(values)).toHaveLength(21);
    expect(describeSeries(values.rendererType, values.curveType, values.markerShape)).toBe('bar/stepAfter/star');
  });

  it('exposes the value constants for every enumerated config member', () => {
    const expected: Record<string, unknown> = {
      CONFIG_VERSION: '1.0.0', AUTO: 'auto', NONE: null,
      ALIGN_LEFT: 'left', ALIGN_CENTER: 'center', ALIGN_RIGHT: 'right',
      VERTICAL_ALIGN_TOP: 'top', VERTICAL_ALIGN_MIDDLE: 'middle', VERTICAL_ALIGN_BOTTOM: 'bottom',
      ANCHOR_START: 'start', ANCHOR_MIDDLE: 'middle', ANCHOR_END: 'end',
      POSITION_TOP: 'top', POSITION_BOTTOM: 'bottom',
      SIDE_START: 'start', SIDE_END: 'end',
      TITLE_SIDE_LOW: 'low', TITLE_SIDE_HIGH: 'high',
      MISSING_VALUES_BREAK: 'break', MISSING_VALUES_CONNECT: 'connect', MISSING_VALUES_BASE: 'base',
      RENDERER_BAR: 'bar', RENDERER_LINE: 'line', RENDERER_AREA: 'area', RENDERER_NONE: 'none',
      CURVE_TYPE_LINEAR: 'linear', CURVE_TYPE_STEP_AFTER: 'stepAfter',
      CAP_TYPE_POINT: 'point', CAP_TYPE_ROUND: 'round',
      LABEL_POSITION_INSIDE: 'inside', LABEL_POSITION_OUTSIDE: 'outside',
      COLOR_SERIES: 'series', COLOR_SAME: 'same', COLOR_CURRENT: 'currentColor',
      COLOR_INTERPOLATION_RGB: 'rgb', COLOR_INTERPOLATION_HCL: 'hcl',
      MARKER_SHAPE_CIRCLE: 'circle', MARKER_SHAPE_WYE: 'wye',
      MARKER_SIZE_SCALE_SQRT: 'sqrt', MARKER_SIZE_SCALE_LINEAR: 'linear',
      PIE_LABEL_TYPE_VALUE: 'value', PIE_LABEL_TYPE_TITLE_PERCENT: 'titlePercent'
    };
    const exported = mochart as unknown as Record<string, unknown>;
    for (const [name, value] of Object.entries(expected)) {
      expect(name in exported, `${name} is not exported`).toBe(true);
      expect(exported[name], name).toBe(value);
    }
  });
});

/**
 * CONFIG-5/CONFIG-4: the tooltip background is rendered as a css border, so its style has no
 * strokeDashArray. The type used to allow the key while validation rejected it as unknown, which
 * with strict validation turned a type-checking config into an invalid one.
 */
describe('tooltip background style', () => {
  it('accepts the five keys the validator accepts', () => {
    const config: MochartInputConfig = {
      version: '1.0.0',
      categoryAxis: { property: 'c' },
      series: [{ property: 'v' }],
      tooltip: {
        backgroundStyle: {
          strokeColor: '#000000', strokeOpacity: 1, strokeWidth: 1,
          fillColor: '#ffffff', fillOpacity: 1
        }
      }
    } as unknown as MochartInputConfig;
    expect(config.tooltip).toBeDefined();
  });

  it('rejects strokeDashArray at typecheck time', () => {
    const style: CssStyle = {
      strokeColor: null, strokeOpacity: null, strokeWidth: null,
      fillColor: null, fillOpacity: null,
      // @ts-expect-error the tooltip background has no dash array; validation rejects it too
      strokeDashArray: '4 2'
    };
    expect(style).toBeDefined();
  });
});

/**
 * API-2: `export type *` published the whole measure/layout pipeline, the tween delta types and
 * the axis/scale/series-position internals as named public types. They are internal now —
 * documented only by the shipped `.d.ts`, like types/enhanced.ts and the `internalInterfaces`
 * entries in scripts/apiReferenceModel.ts — while the types a host has to name to implement
 * `DataProvider` or `ChartDataSource` stay exported. Both halves are typecheck-time, not runtime.
 */
import type * as core from '../../src';

// one line per file, so restoring a wildcard makes the directive unused and fails the typecheck
// @ts-expect-error types/geometry.ts internals
export type GeometryInternals = [core.TextBounds];
// @ts-expect-error types/chart.ts internals
export type ChartInternals = [core.ChartDomAccessors];
// @ts-expect-error types/data.ts internals
export type DataInternals = [core.StackData, core.AxisValue, core.TickLabel, core.TickLabelFormatter, core.AxisScale, core.AxisTick, core.CategorySpacingInfo, core.CategoryAxisData, core.SeriesPosition, core.SeriesPositionAccessor, core.SeriesPositionData, core.ValueAxisData, core.AxisData, core.ClippedEdges, core.CategoryValueObject];
// @ts-expect-error types/animation.ts internals
export type AnimationInternals = [core.ArrayFocusDeltaData, core.MapFocusDeltaData, core.FocusAnimationData, core.NumericDomain, core.DateDomain, core.AxisDomain, core.AnimationChartData, core.DomainDelta, core.DomainDeltaMap, core.SeriesDomainDelta, core.SeriesDomainDeltaMap, core.NumericValuesDelta, core.SeriesValueDelta, core.SeriesValueDeltaMap, core.NumericArrayDelta, core.CompleteNumericArrayDelta, core.AxisDeltaData, core.EmptyAxisDeltaData, core.AxisTransitionData, core.ValueChangeData, core.ChartAnimationData, core.CategoryMergedValuesData, core.CategoryMergedIndicesData, core.OuterChangeCounts, core.CategoryDeltaData];
// @ts-expect-error types/layout.ts internals
export type LayoutInternals = [core.SpacingBoundsInput, core.SpacingLayoutInfo, core.LayoutInfo, core.BeforeAfter, core.AxisTickInfo, core.AxisTickInfos, core.AxisLayoutInfo, core.CategoryAxisLayoutInfo, core.TitleLayoutResult, core.LegendLayoutResult, core.PlotLayoutResult, core.ChartLayoutInfo, core.ChartTextBoundsData, core.ChartDataForLayout];

// the kept surface, named the way a host implementing the two extension points has to name it
const rows: readonly core.DataRow[] = [{ month: 'Jan', sales: 10 }, { month: 'Feb', sales: 20 }];

const provider: core.DataProvider<core.CategoryValue> = {
  getCategoryValues: (): readonly core.CategoryValue[] => rows.map(row => row.month as string),
  getSeriesValue: (_categoryValue: core.CategoryValue, categoryIndex: number, property: string): unknown =>
    rows[categoryIndex]?.[property],
  getCategoryProperty: (): string => 'month',
  getError: (): unknown => null,
  getLoading: (): boolean => false,
  refresh: (): void => {}
};

function makeDomain(low: core.DomainValue, high: core.DomainValue): core.NullableDomain<number | Date> {
  return [low, high];
}

function makeCategoryData(values: readonly core.CategoryValue[]): core.CategoryData {
  const axisDomain: core.CategoryAxisDomain = makeDomain(0, values.length - 1);
  const categoryValues: core.CategoryValues = {
    raw: values, display: values, parsed: values, numeric: values.map((_value, index) => index)
  };
  return { axisDomain, renderAxisDomain: axisDomain, values: categoryValues };
}

function makeSeriesData(seriesId: string, plain: core.NumericValues): core.SeriesData {
  const axisDomains: core.AxisDomains = { A0: [0, 100] };
  const seriesDomain: core.SeriesDomainObject = { A0: [0, 100] };
  const domains: core.SeriesDomainObjects = { [seriesId]: seriesDomain };
  const seriesValues: core.SeriesValueObject = {
    plain, range: null, errorLow: null, errorHigh: null, stack: null, prior: null,
    marker: null, label: null, color: null, tooltip: null,
    markerCopyKey: null, labelCopyKey: null, colorCopyKey: null, tooltipCopyKey: null,
    min: plain, max: plain
  };
  const values: core.SeriesValueObjects = { [seriesId]: seriesValues };
  const raw: core.SeriesDataSet = { axisDomains, renderAxisDomains: axisDomains, domains, values };
  return { axisBases: { A0: 0 }, axisSeriesCounts: { A0: 1 }, raw, filteredFlags: {}, filtered: raw };
}

// a host swapping the data pipeline implements this interface, so every type it names must be public
class RecordingDataSource implements core.ChartDataSource {
  readonly animated = false;

  chartData: core.ChartData | null = null;

  focusData: core.FocusData | null = null;

  readonly initialAnimationPercentage: number | null = null;

  start(input: core.ChartDataSourceInput): void {
    const first: core.NumericValue = 10;
    this.chartData = {
      categoryData: makeCategoryData(input.dataProvider.getCategoryValues()),
      seriesData: makeSeriesData('S0', [first, 20])
    };
    const categoryFocusPercentages: core.FocusPercentage[] = [null, null];
    const axisFocusPercentages: core.FocusPercentageMap = { A0: null };
    this.focusData = {
      focusedCategoryIndex: input.focusedCategoryIndex,
      focusedValueAxisId: input.focusedValueAxisId,
      focusedSeriesId: input.focusedSeriesId,
      categoryFocusPercentages,
      valueAxisFocusPercentages: axisFocusPercentages,
      seriesFocusPercentages: { S0: null }
    };
  }

  update(_prevInput: core.ChartDataSourceInput, input: core.ChartDataSourceInput): void {
    this.start(input);
  }

  remapFocus(focus: core.InternalFocus): core.InternalFocus {
    return focus;
  }

  dispose(): void {}
}

describe('public extension-point type surface', () => {
  it('exposes every type a DataProvider implementation names', () => {
    expect(provider.getCategoryValues()).toEqual(['Jan', 'Feb']);
    expect(provider.getSeriesValue('Feb', 1, 'sales')).toBe(20);
  });

  it('exposes every type a ChartDataSource implementation names', () => {
    const source = new RecordingDataSource();
    source.start({
      mochartConfig: null as unknown as core.ChartDataSourceInput['mochartConfig'],
      dataProvider: provider,
      filteredSeriesIds: {},
      focusedCategoryIndex: -1,
      focusedValueAxisId: null,
      focusedSeriesId: null
    });
    expect(source.chartData?.categoryData.values.raw).toEqual(['Jan', 'Feb']);
    expect(source.chartData?.seriesData.raw.values.S0?.plain).toEqual([10, 20]);
    expect(source.focusData?.categoryFocusPercentages).toHaveLength(2);
  });

  it('reports its bounds and spacing types by name', () => {
    const size: core.Size = { width: 10, height: 20 };
    const bounds: core.Bounds = { ...size, x: 0, y: 0 };
    const marginPadding: core.MarginPadding = { top: 1, right: 1, bottom: 1, left: 1 };
    const innerOuter: core.InnerOuter = { inner: 1, outer: 2 };
    expect([bounds.width, marginPadding.top, innerOuter.inner]).toEqual([10, 1, 1]);
  });
});
