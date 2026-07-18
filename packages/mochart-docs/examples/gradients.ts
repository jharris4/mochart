// Series reference a gradient by id. The gradient's x1/y1 → x2/y2 vector is
// in 0–1 shape coordinates (here top → bottom), and each stop sets an
// offset, color, and opacity.
import type { MochartInputConfig } from '@mochart/core';

export const config: MochartInputConfig = {
  version: '1.0.0',
  titleConfig: { title: 'Bandwidth' },
  groupAxisConfig: { property: 'hour', type: 'string', scale: 'ordinal' },
  linearGradientConfigs: [
    {
      id: 'fade',
      x1: 0, y1: 0, x2: 0, y2: 1,
      stops: [
        { offset: 0, color: '#1f77b4', opacity: 0.9 },
        { offset: 1, color: '#1f77b4', opacity: 0.05 }
      ]
    }
  ],
  seriesConfigs: [
    {
      property: 'gbps',
      title: 'Throughput',
      renderer: 'area',
      gradient: 'fade'
    }
  ]
};

export const data = [
  { hour: '00:00', gbps: 14 },
  { hour: '04:00', gbps: 9 },
  { hour: '08:00', gbps: 32 },
  { hour: '12:00', gbps: 45 },
  { hour: '16:00', gbps: 51 },
  { hour: '20:00', gbps: 38 }
];
