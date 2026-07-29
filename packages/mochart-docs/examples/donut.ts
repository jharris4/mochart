// The donut option adds an inner radius, and tooltipValues 'percent'
// precomputes each slice's share into the data row so the tooltip shows
// percentages instead of raw values.
import { createPie } from '@mochart/core';
import type { MochartInputConfig } from '@mochart/core';

const donut = createPie(
  [
    { label: 'Chrome', value: 62 },
    { label: 'Safari', value: 20 },
    { label: 'Edge', value: 6 },
    { label: 'Firefox', value: 5 },
    { label: 'Opera', value: 3 },
    { label: 'Other', value: 4 }
  ],
  { donut: true, tooltipValues: 'percent' }
);

export const config: MochartInputConfig = {
  version: '1.0.0',
  titleConfig: { title: 'Browser Market Share (fictional)' },
  chartConfig: donut.chartConfig,
  // showLabels puts percent labels at the slice centroids (slices thinner
  // than labelMinAnglePercent hide theirs), and focusOffsetPercent explodes
  // the hovered slice away from the center.
  pieConfig: { ...donut.pieConfig, showLabels: true, labelType: 'percent', focusOffsetPercent: 0.05 },
  groupAxisConfig: donut.groupAxisConfig,
  seriesConfigs: donut.seriesConfigs
};

export const data = donut.data;
