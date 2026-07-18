import type { MochartInputConfig } from '@mochart/core';

export const config: MochartInputConfig = {
  version: '1.0.0',
  titleConfig: { title: 'Store Traffic' },
  groupAxisConfig: { property: 'day', type: 'string', scale: 'ordinal' },
  seriesAllConfig: { renderer: 'bar' },
  seriesConfigs: [
    { property: 'inStore', title: 'In store' },
    { property: 'online', title: 'Online' },
    { property: 'pickup', title: 'Pickup' }
  ],
  legendConfig: {
    filterOnClick: true,
    focusOnMouseOver: true
  }
};

export const data = [
  { day: 'Mon', inStore: 12, online: 20, pickup: 6 },
  { day: 'Tue', inStore: 14, online: 22, pickup: 7 },
  { day: 'Wed', inStore: 11, online: 25, pickup: 9 },
  { day: 'Thu', inStore: 16, online: 24, pickup: 8 },
  { day: 'Fri', inStore: 22, online: 30, pickup: 12 },
  { day: 'Sat', inStore: 30, online: 26, pickup: 15 },
  { day: 'Sun', inStore: 24, online: 21, pickup: 10 }
];
