import type { PropType } from 'vue';
import type { PlaceholderComponent } from './types';

// Runtime prop declarations shared by Chart and DefaultChart. Declaring the
// `on*` callbacks as props keeps them out of fallthrough attrs (they go to the
// chart, not the container div) while still letting templates use `@chart-click`.
const anyProp = { type: null as unknown as PropType<any>, default: undefined };
const requiredAnyProp = { type: null as unknown as PropType<any>, required: true as const };
const callbackProp = { type: Function as PropType<(payload: any) => void>, default: undefined };
// Components are options objects or (functional) render functions.
const placeholderProp = { type: [Object, Function] as PropType<PlaceholderComponent>, default: undefined };

export const baseChartProps = {
  /** Explicit pixel width; omit to track the container element's width. */
  width: { type: Number, default: undefined },
  /** Explicit pixel height; omit to track the container element's height. */
  height: { type: Number, default: undefined },
  onChartClick: callbackProp,
  onSliceClick: callbackProp,
  onChartMouseEnter: callbackProp,
  onChartMouseMove: callbackProp,
  onChartMouseLeave: callbackProp,
  onTitleClick: callbackProp,
  onFocus: callbackProp,
  onSeriesFilter: callbackProp,
  onSeriesLayoutBoundsChange: callbackProp,
  loadingComponent: placeholderProp,
  errorComponent: placeholderProp,
  noDataComponent: placeholderProp,
  noSizeComponent: placeholderProp,
  noSeriesComponent: placeholderProp,
  configErrorComponent: placeholderProp,
  loading: { type: Boolean, default: undefined },
  error: anyProp,
  /**
   * Controlled focused group index (-1 = none). When set it overrides the
   * chart's internal focus on every render; pass back the value reported by
   * `onFocus` to keep several charts in sync. Omit to leave focus
   * chart-managed.
   */
  focusedCategoryIndex: { type: Number, default: undefined },
  /** Controlled focused series-axis id (null = none). See `focusedCategoryIndex`. */
  focusedValueAxisId: { type: String as PropType<string | null>, default: undefined },
  /** Controlled focused series id (null = none). See `focusedCategoryIndex`. */
  focusedSeriesId: { type: String as PropType<string | null>, default: undefined },
  /**
   * Controlled filter map (series id → true = filtered out); pass back the
   * map reported by `onSeriesFilter` to sync legend filtering across charts.
   */
  filteredSeriesIds: { type: Object as PropType<Record<string, boolean>>, default: undefined }
};

export const chartProps = {
  ...baseChartProps,
  mochartConfig: requiredAnyProp,
  dataProvider: requiredAnyProp
};

export const defaultChartProps = {
  ...baseChartProps,
  config: requiredAnyProp,
  data: { type: Array as PropType<any[]>, required: true as const }
};
