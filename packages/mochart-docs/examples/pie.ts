// createPie turns labelled values into pie pieces: every slice is its own
// series (so the legend lists the slices and clicking one suppresses it),
// and the data is a single row holding every slice value.
import { createPie } from '@mochart/core';
import type { MochartInputConfig } from '@mochart/core';

const pie = createPie(
  [
    { label: 'Subscriptions', value: 420 },
    { label: 'Services', value: 210 },
    { label: 'Hardware', value: 140 },
    { label: 'Licensing', value: 75 },
    { label: 'Support', value: 65 },
    { label: 'Other', value: 30 }
  ],
  { valueFormat: ',.0f' }
);

export const config: MochartInputConfig = {
  version: '1.0.0',
  titleConfig: { title: 'Revenue by Product (fictional, $k)' },
  // chartConfig.type 'pie' swaps the axis plot for the radial plot.
  chartConfig: pie.chartConfig,
  groupAxisConfig: pie.groupAxisConfig,
  seriesConfigs: pie.seriesConfigs
};

export const data = pie.data;
