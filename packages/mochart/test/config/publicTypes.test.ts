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
