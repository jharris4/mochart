// Two value axes: revenue bars scale against the left axis, conversion rate
// (0–1) draws as a line against its own right-hand axis.
import type { MochartInputConfig } from '@mochart/core';

export const config: MochartInputConfig = {
  version: '1.0.0',
  titleConfig: { title: 'Revenue vs Conversion' },
  groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
  seriesAxisConfigs: [
    { id: 'money', title: 'Revenue' },
    { id: 'rate', title: 'Conversion', before: false, tickLabelFormat: '.0%' }
  ],
  seriesConfigs: [
    { property: 'revenue', title: 'Revenue', renderer: 'bar', axis: 'money' },
    { property: 'conversion', title: 'Conversion', renderer: 'line', axis: 'rate', valueFormat: '.1%' }
  ]
};

export const data = [
  { month: 'Jan', revenue: 42, conversion: 0.031 },
  { month: 'Feb', revenue: 48, conversion: 0.034 },
  { month: 'Mar', revenue: 45, conversion: 0.042 },
  { month: 'Apr', revenue: 61, conversion: 0.039 },
  { month: 'May', revenue: 58, conversion: 0.047 },
  { month: 'Jun', revenue: 72, conversion: 0.052 }
];
