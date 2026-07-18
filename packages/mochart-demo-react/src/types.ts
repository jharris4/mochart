import type { DemoData, DemoMode, OnDemoModeChanged, OnDemoChanged } from '@mochart/demo-common';

export type {
  DataRow, Demo, DemoConfig, DemoData, RandomConfig,
  GroupValue, FilteredSeriesIds, FocusData, TransitionConfig,
  ChartDataProviderLike, DemoDataProvider, DemoMode,
  OnDemoModeChanged, OnDemoChanged, RandomConfigWithValid, MochartDemoConfig
} from '@mochart/demo-common';

/** Props shared by the top-level demo-mode components (single/multi/random). */
export interface DemoTabProps {
  demoData: DemoData;
  initialDemoId: string;
  demoMode: DemoMode;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChanged: OnDemoChanged;
}
