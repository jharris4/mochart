import { createDefaultChart } from 'mochart';
import type { ReactElement } from 'react';
import { useChartHost } from './useChartHost';
import type { DefaultChartProps } from './types';

/**
 * React wrapper around mochart's `createDefaultChart`: takes a raw `config`
 * (enhanced internally) and a plain array-of-objects `data`. Omit
 * `width`/`height` to have the chart track the container div's size.
 */
export default function DefaultChart(props: DefaultChartProps): ReactElement {
  const { className, style, ...chartProps } = props;
  const containerRef = useChartHost(createDefaultChart, chartProps);
  return <div ref={containerRef} className={className} style={{ width: props.width, height: props.height, ...style }} />;
}
