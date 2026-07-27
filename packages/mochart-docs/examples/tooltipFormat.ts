// Per-series tooltip formatting: a d3-format string plus optional prefix and
// suffix around the formatted value, with the series title as the label.
import type { MochartInputConfig } from '@mochart/core';

export const config: MochartInputConfig = {
  version: '1.0.0',
  titleConfig: { title: 'Store Performance' },
  groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
  seriesAxisConfigs: [
    { id: 'money', title: 'Revenue' },
    { id: 'rate', title: 'Refund rate', before: false, tickLabelFormat: '.1%' }
  ],
  seriesConfigs: [
    {
      property: 'revenue',
      title: 'Revenue',
      renderer: 'bar',
      axis: 'money',
      valueFormat: ',.1f',
      valuePrefix: '$',
      valueSuffix: 'k'
    },
    {
      property: 'refunds',
      title: 'Refund rate',
      renderer: 'line',
      axis: 'rate',
      valueFormat: '.1%'
    }
  ],
  tooltipConfig: {
    alignValues: true
  }
};

export const data = [
  { month: 'Jan', revenue: 41.2, refunds: 0.021 },
  { month: 'Feb', revenue: 46.8, refunds: 0.018 },
  { month: 'Mar', revenue: 44.1, refunds: 0.024 },
  { month: 'Apr', revenue: 52.6, refunds: 0.016 },
  { month: 'May', revenue: 57.9, refunds: 0.019 },
  { month: 'Jun', revenue: 63.4, refunds: 0.014 }
];
