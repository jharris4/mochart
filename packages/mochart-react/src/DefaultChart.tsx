import { createDefaultChart } from '@mochart/core';
import type { ReactElement } from 'react';
import { useChartHost } from './useChartHost.js';
import type { DefaultChartProps } from './types.js';

/**
 * React wrapper around mochart's `createDefaultChart`: takes a raw `config`
 * (enhanced internally) and a plain array-of-objects `data`. Omit
 * `width`/`height` to have the chart track the container div's size.
 */
export default function DefaultChart(props: DefaultChartProps): ReactElement {
  const { className, style, ...chartProps } = props;
  const containerRef = useChartHost(createDefaultChart, chartProps);
  // explicit size props win over the container style, like in the other bindings
  const containerStyle = { ...style };
  if (props.width !== undefined) {
    containerStyle.width = props.width;
  }
  if (props.height !== undefined) {
    containerStyle.height = props.height;
  }
  return <div ref={containerRef} className={className} style={containerStyle} />;
}
