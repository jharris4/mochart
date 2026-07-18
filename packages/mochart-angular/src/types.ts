import type { Type } from '@angular/core';

/** Props mochart passes to placeholder components (loading, error, and empty states). */
export interface PlaceholderProps {
  width?: number;
  height?: number;
  mochartConfig?: any;
  dataProvider?: any;
  error?: any;
  hasData?: boolean;
}

/**
 * An Angular component rendered for one of the chart's placeholder states.
 * The chart context (`width`, `height`, `error`, …) is applied to whichever
 * of the `PlaceholderProps` names the component declares as inputs.
 */
export type PlaceholderComponent = Type<unknown>;
