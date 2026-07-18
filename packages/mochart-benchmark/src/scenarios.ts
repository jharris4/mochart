export type ScenarioType = 'bar' | 'line' | 'line-markers' | 'area' | 'dashboard';

export interface ScenarioSpec {
  type: ScenarioType;
  seriesCount: number;
  groupCount: number;
  /** Number of charts mounted side by side; 1 for everything except dashboard. */
  chartCount: number;
}

export interface ScenarioOptions {
  animate: boolean;
  legend: boolean;
}

export const seriesProperty = (index: number): string => 's' + index;

/** Dashboard cells render the simple scenario below, many times over. */
export const DASHBOARD_SERIES = 3;
export const DASHBOARD_GROUPS = 50;

export function scenarioLabel(spec: ScenarioSpec): string {
  if (spec.type === 'dashboard') {
    return 'dashboard ×' + spec.chartCount;
  }
  return spec.type;
}

export function scenarioSize(spec: ScenarioSpec): string {
  return spec.seriesCount + '×' + spec.groupCount + (spec.chartCount > 1 ? ' ×' + spec.chartCount : '');
}

export function scenarioPoints(spec: ScenarioSpec): number {
  return spec.seriesCount * spec.groupCount * spec.chartCount;
}

/** Build a raw (unenhanced) mochart config for a generated scenario. */
export function makeConfig(type: ScenarioType, seriesCount: number, options: ScenarioOptions): any {
  const renderer = type === 'bar' ? 'bar' : type === 'area' ? 'area' : 'line';
  const seriesAllConfig: any = { axis: 'SA0', renderer };
  if (type === 'line-markers') {
    seriesAllConfig.markerShape = 'circle';
  }
  else if (renderer === 'line') {
    seriesAllConfig.markerShape = null;
  }
  const seriesConfigs: any[] = [];
  for (let i = 0; i < seriesCount; i++) {
    seriesConfigs.push({ property: seriesProperty(i), title: 'Series ' + (i + 1) });
  }
  return {
    // current CONFIG_VERSION; configs are generated in current shape, no migration
    version: '1.0.3',
    titleConfig: { title: 'Benchmark' },
    animationConfig: {
      animate: options.animate,
      expansionDuration: 300,
      valueChangeDuration: 300,
      collapseDuration: 300,
      focusDuration: 300
    },
    legendConfig: { visible: options.legend },
    groupAxisConfig: {
      valueLabel: 'Group',
      property: 'group',
      type: 'number',
      scale: 'ordinal'
    },
    seriesAxisConfigs: [{ id: 'SA0', before: true, min: 0, max: 500 }],
    seriesGroupConfigs: {},
    seriesAllConfig,
    seriesConfigs
  };
}

export function makeData(seriesCount: number, groupCount: number): any[] {
  const rows: any[] = [];
  for (let g = 0; g < groupCount; g++) {
    const row: any = { group: g };
    for (let s = 0; s < seriesCount; s++) {
      row[seriesProperty(s)] = Math.round(Math.random() * 500);
    }
    rows.push(row);
  }
  return rows;
}

/** New random values for every series in every row (fresh row objects). */
export function randomizeData(data: any[], seriesCount: number): any[] {
  return data.map((row) => {
    const next: any = { ...row };
    for (let s = 0; s < seriesCount; s++) {
      next[seriesProperty(s)] = Math.round(Math.random() * 500);
    }
    return next;
  });
}

/** The default matrix the "Run suite" button executes, small to large. */
export const SUITE_ROWS: ScenarioSpec[] = [
  { type: 'bar', seriesCount: 5, groupCount: 50, chartCount: 1 },
  { type: 'bar', seriesCount: 10, groupCount: 200, chartCount: 1 },
  { type: 'bar', seriesCount: 10, groupCount: 500, chartCount: 1 },
  { type: 'bar', seriesCount: 10, groupCount: 1000, chartCount: 1 },
  { type: 'line', seriesCount: 10, groupCount: 1000, chartCount: 1 },
  { type: 'line-markers', seriesCount: 10, groupCount: 1000, chartCount: 1 },
  { type: 'area', seriesCount: 10, groupCount: 1000, chartCount: 1 },
  { type: 'dashboard', seriesCount: DASHBOARD_SERIES, groupCount: DASHBOARD_GROUPS, chartCount: 24 }
];
