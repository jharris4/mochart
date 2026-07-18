// plotConfig.inverted swaps the axes: groups run down the left side and
// values extend horizontally.
import type { MochartInputConfig } from '@mochart/core';

export const config: MochartInputConfig = {
  version: '1.0.0',
  titleConfig: { title: 'Support Tickets by Team' },
  plotConfig: { inverted: true },
  groupAxisConfig: { property: 'team', type: 'string', scale: 'ordinal' },
  seriesAllConfig: { renderer: 'bar' },
  seriesConfigs: [{ property: 'tickets', title: 'Open tickets' }]
};

export const data = [
  { team: 'Platform', tickets: 34 },
  { team: 'Billing', tickets: 27 },
  { team: 'Mobile', tickets: 21 },
  { team: 'Integrations', tickets: 15 },
  { team: 'Onboarding', tickets: 9 }
];

export const altData = [
  { team: 'Platform', tickets: 22 },
  { team: 'Billing', tickets: 31 },
  { team: 'Mobile', tickets: 12 },
  { team: 'Integrations', tickets: 25 },
  { team: 'Onboarding', tickets: 17 }
];
