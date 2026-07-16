import { createChart } from 'mochart';
import type { ReactElement } from 'react';
import { useChartHost } from './useChartHost';
import type { ChartProps } from './types';

/**
 * React wrapper around mochart's `createChart`: takes an enhanced config
 * (`mochartConfig`) and a data provider. Omit `width`/`height` to have the
 * chart track the container div's size.
 */
export default function Chart(props: ChartProps): ReactElement {
  const { className, style, ...chartProps } = props;
  const containerRef = useChartHost(createChart, chartProps);
  return <div ref={containerRef} className={className} style={{ width: props.width, height: props.height, ...style }} />;
}
