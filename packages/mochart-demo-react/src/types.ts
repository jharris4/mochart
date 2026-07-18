import type { ConfigValidation, MochartConfig } from '@mochart/core';
import type { DemoData, RandomConfig } from '@mochart/demo-data';

export type { DataRow, Demo, DemoConfig, DemoData, RandomConfig } from '@mochart/demo-data';

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

/** The demo mode routes exposed by the gallery. */
export type DemoMode = 'single' | 'multi' | 'random' | 'transition' | 'rotation';

/** Navigate to a different demo mode (optionally targeting a specific demo). */
export type OnDemoModeChanged = (nextDemoMode: DemoMode, nextDemoId?: string) => void;

/** Navigate to a different demo within the current mode. */
export type OnDemoChanged = (nextDemoId: string) => void;

/** The random config plus the validity flag the random editor tracks. */
export type RandomConfigWithValid = RandomConfig & { valid: boolean };

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

/** Props shared by the top-level demo-mode components (single/multi/random). */
export interface DemoTabProps {
  demoData: DemoData;
  initialDemoId: string;
  demoMode: DemoMode;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChanged: OnDemoChanged;
}
