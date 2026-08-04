// startAngle/endAngle confine the slices to a partial span — here a half
// donut — and the pie center can carry a label plus a live total that counts
// along with value changes and filtering.
import { createPie } from '@mochart/core';
import type { MochartInputConfig } from '@mochart/core';

const gauge = createPie(
  [
    { label: 'Promoters', value: 540 },
    { label: 'Passives', value: 280 },
    { label: 'Detractors', value: 180 }
  ],
  // percentValue pairs each segment's share with its response count, e.g.
  // "54.0% (540)"
  { tooltipValues: 'percentValue' }
);

export const config: MochartInputConfig = {
  version: '1.0.0',
  titleConfig: { title: 'Customer Sentiment (fictional survey)' },
  chartConfig: gauge.chartConfig,
  pieConfig: {
    ...gauge.pieConfig,
    startAngle: -90,
    endAngle: 90,
    innerRadiusFraction: 0.55,
    // a small gap and rounded corners separate the segments
    padAngle: 1,
    cornerRadius: 3,
    showLabels: true,
    labelType: 'title',
    // the center total tracks the unfiltered slices, so clicking a legend
    // entry counts it down; the negative Y offset lifts it off the gauge
    // pivot into the hole
    centerLabel: 'responses',
    showCenterTotal: true,
    centerTotalFormat: ',.0f',
    centerOffsetYFraction: -0.25
  },
  groupAxisConfig: gauge.groupAxisConfig,
  seriesConfigs: gauge.seriesConfigs
};

export const data = gauge.data;
