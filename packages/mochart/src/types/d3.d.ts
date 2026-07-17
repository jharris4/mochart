declare module 'd3-scale' {
  import type { AxisScale } from './data';

  export function scaleLinear(): AxisScale;
  export function scaleTime(): AxisScale;
  export function scaleUtc(): AxisScale;
}

declare module 'd3-format' {
  export function format(specifier: string): (value: number) => string;
  export function formatSpecifier(specifier: string): unknown;
}

declare module 'd3-time-format' {
  export function timeFormat(specifier: string): (value: Date) => string;
  export function utcFormat(specifier: string): (value: Date) => string;
}

declare module 'd3-shape' {
  export interface CurveFactory {
    tension?(value: number): CurveFactory;
    alpha?(value: number): CurveFactory;
  }

  export interface ShapeGenerator {
    (data: ArrayLike<unknown>): string | null;
    defined(accessor: (datum: unknown, index: number) => boolean): ShapeGenerator;
    x(accessor: (datum: unknown, index: number) => number | undefined): ShapeGenerator;
    y(accessor: (datum: unknown, index: number) => number | undefined): ShapeGenerator;
    x0(accessor: (datum: unknown, index: number) => number | undefined): ShapeGenerator;
    x1(accessor: (datum: unknown, index: number) => number | undefined): ShapeGenerator;
    y0(accessor: (datum: unknown, index: number) => number | undefined): ShapeGenerator;
    y1(accessor: (datum: unknown, index: number) => number | undefined): ShapeGenerator;
    curve(factory: CurveFactory): ShapeGenerator;
  }

  export function line(): ShapeGenerator;
  export function area(): ShapeGenerator;
  export interface SymbolGenerator {
    (): string | null;
    size(value: number): SymbolGenerator;
    type(value: unknown): SymbolGenerator;
  }
  export function symbol(): SymbolGenerator;
  export const symbols: readonly unknown[];
  export const curveMonotoneX: CurveFactory;
  export const curveMonotoneY: CurveFactory;
  export const curveBasis: CurveFactory;
  export const curveCardinal: CurveFactory;
  export const curveCatmullRom: CurveFactory;
  export const curveNatural: CurveFactory;
  export const curveStep: CurveFactory;
  export const curveStepBefore: CurveFactory;
  export const curveStepAfter: CurveFactory;
}

declare module 'd3-path' {
  export interface Path {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
    arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
    rect(x: number, y: number, width: number, height: number): void;
    closePath(): void;
    toString(): string;
  }
  export function path(): Path;
}

declare module 'd3-interpolate' {
  export type ColorInterpolator = (start: string, end: string) => (value: number) => string;
  export const interpolateRgb: ColorInterpolator;
  export const interpolateHsl: ColorInterpolator;
  export const interpolateLab: ColorInterpolator;
  export const interpolateHcl: ColorInterpolator;
}
