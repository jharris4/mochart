import type { ConfigValidation, MochartConfig, MochartInputConfig } from 'mochart';

/** A single data row in a demo's data set. */
export type DataRow = Record<string, unknown>;

/** A value on the group axis of a generated data set. */
export type GroupValue = number | string;

/** Map of series id -> whether that series is currently filtered out. */
export type FilteredSeriesIds = Record<string, boolean>;

/** Focus event payload emitted by the chart interactions. */
export interface FocusData {
  seriesAxisId?: string | null;
  seriesId?: string | null;
  groupIndex?: number;
}

/** The demo mode routes exposed by the gallery. */
export type DemoMode = 'single' | 'multi' | 'random' | 'transition' | 'rotation';

/** Navigate to a different demo mode (optionally targeting a specific demo). */
export type OnDemoModeChanged = (nextDemoMode: DemoMode, nextDemoId?: string) => void;

/** Navigate to a different demo within the current mode. */
export type OnDemoChanged = (nextDemoId: string) => void;

/** The random-generation config (see mochart-demo/demos/random/*.json). */
export interface RandomConfig {
  error: { probability: number };
  group: {
    count: number;
    order: { sort: boolean };
    missing: { probability: number };
    reuse: { globalPercentage: number; stepPercentage: number };
    number: { min: number; max: number; interval: number };
    string: { minLength: number; maxLength: number };
    date: {
      min: string;
      max: string;
      interval: number;
      intervalUnit: 'second' | 'minute' | 'hour' | 'day' | string;
    };
  };
  series: {
    number: { min: number; max: number; round: boolean; limitToAxisConfig: boolean };
    missing: { probability: number };
    reuse: { global: boolean; step: boolean };
  };
}

/** The random config plus the validity flag the random editor tracks. */
export type RandomConfigWithValid = RandomConfig & { valid: boolean };

/** A demo's editable chart config (the input config plus arbitrary edits). */
export type DemoConfig = MochartInputConfig & Record<string, unknown>;

/** A single demo entry assembled from its config/data/random JSON. */
export interface Demo {
  id: string;
  title: string;
  config: DemoConfig;
  data: DataRow[];
  random: RandomConfig;
}

/** The assembled collection of demos loaded at startup. */
export interface DemoData {
  demoIds: string[];
  demoObjectMap: Record<string, Demo>;
  testDemoIds: string[];
}

/** Props shared by the top-level demo-mode components (single/multi/random). */
export interface DemoTabProps {
  demoData: DemoData;
  initialDemoId: string;
  demoMode: DemoMode;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChanged: OnDemoChanged;
}

/**
 * The derived config bundle returned by buildMochartDemoConfig — the built
 * mochart config plus the with/without-defaults variants used by the editors.
 */
export interface MochartDemoConfig {
  config: Record<string, unknown>;
  configDefaults: Record<string, unknown>;
  configWithDefaults: Record<string, unknown>;
  configWithoutDefaults: Record<string, unknown>;
  configValidation: ConfigValidation;
  mochartConfig: MochartConfig;
  valid: boolean;
  groupProperty: string | undefined;
  seriesCount: number;
}

/**
 * The duck-typed data provider produced by the random generator and consumed
 * by the chart / getDataErrors. `getError` marks the error/invalid variants.
 */
export interface DemoDataProvider {
  getGroupValues: () => GroupValue[];
  getSeriesValue?: (groupValue: GroupValue, groupIndex: number, seriesProperty: string) => unknown;
  getError?: () => string;
  groupValues?: GroupValue[];
  seriesValues?: Record<string, (number | undefined)[]>;
}

/** The transition demo's config bundle: one config plus a sequence of datasets. */
export interface TransitionConfig {
  config: Record<string, any>;
  data: Record<string, any>[][];
}

/** Loose structural view of a data provider as consumed by the demo charts. */
export interface ChartDataProviderLike {
  getGroupValues: () => readonly any[];
  getSeriesValue?: (...args: any[]) => any;
  getError?: (...args: any[]) => any;
}
