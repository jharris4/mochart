import type { PropType } from 'vue';
import type { NodeFactory } from './types';

// Runtime prop declarations shared by Chart and DefaultChart. Declaring the
// `on*` callbacks as props keeps them out of fallthrough attrs (they go to the
// chart, not the container div) while still letting templates use `@chart-click`.
const anyProp = { type: null as unknown as PropType<any>, default: undefined };
const requiredAnyProp = { type: null as unknown as PropType<any>, required: true as const };
const callbackProp = { type: Function as PropType<(payload: any) => void>, default: undefined };
const factoryProp = { type: Function as PropType<NodeFactory>, default: undefined };

export const baseChartProps = {
  /** Explicit pixel width; omit to track the container element's width. */
  width: { type: Number, default: undefined },
  /** Explicit pixel height; omit to track the container element's height. */
  height: { type: Number, default: undefined },
  onChartClick: callbackProp,
  onChartMouseEnter: callbackProp,
  onChartMouseMove: callbackProp,
  onChartMouseLeave: callbackProp,
  onTitleClick: callbackProp,
  onFocus: callbackProp,
  onSeriesFilter: callbackProp,
  onSeriesLayoutInfoChange: callbackProp,
  getLoadingComponent: factoryProp,
  getErrorComponent: factoryProp,
  getNoDataComponent: factoryProp,
  getNoSizeComponent: factoryProp,
  getNoSeriesComponent: factoryProp
};

export const chartProps = {
  ...baseChartProps,
  mochartConfig: requiredAnyProp,
  dataProvider: requiredAnyProp,
  loading: { type: Boolean, default: undefined },
  error: anyProp
};

export const defaultChartProps = {
  ...baseChartProps,
  config: requiredAnyProp,
  data: { type: Array as PropType<any[]>, required: true as const }
};
