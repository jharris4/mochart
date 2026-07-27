// createWaterfall accumulates signed steps into floating bars — one series
// per direction (increase / decrease / total), each row filling exactly one.
import { createWaterfall } from '@mochart/core';
import type { MochartInputConfig } from '@mochart/core';

const waterfall = createWaterfall([
  { label: 'Product revenue', value: 420 },
  { label: 'Services revenue', value: 210 },
  { label: 'Gross revenue', total: true },
  { label: 'Cost of goods', value: -180 },
  { label: 'Operating expenses', value: -95 },
  { label: 'Marketing', value: -60 },
  { label: 'Tax', value: -22 },
  { label: 'Net income', total: true }
]);

export const config: MochartInputConfig = {
  version: '1.0.0',
  titleConfig: { title: 'Income Statement (fictional, $k)' },
  groupAxisConfig: waterfall.groupAxisConfig,
  seriesAxisConfigs: [{ title: '$ thousands' }],
  seriesConfigs: waterfall.seriesConfigs
};

export const data = waterfall.data;
