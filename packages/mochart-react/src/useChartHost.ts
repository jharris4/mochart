import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { mountChartHost } from './host.js';
import type { CreateChartFn, HostHandle } from './host.js';

export interface ChartHost {
  containerRef: RefObject<HTMLDivElement | null>;
  refresh: () => void;
}

// useLayoutEffect warns when rendered on the server; charts only mount in the DOM.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Mounts a chart with `create` into the returned ref's element, pushes prop
 * changes through the chart handle on every render, and destroys the chart on
 * unmount.
 */
export function useChartHost(create: CreateChartFn, chartProps: Record<string, any>): ChartHost {
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HostHandle | null>(null);
  const latestPropsRef = useRef(chartProps);
  const justMountedRef = useRef(false);

  // committed-props ref: written in an effect (never during render, where a
  // discarded concurrent render could overwrite it), before the mount effect below
  useIsomorphicLayoutEffect(() => {
    latestPropsRef.current = chartProps;
  });

  useIsomorphicLayoutEffect(() => {
    const host = mountChartHost(create, containerRef.current as HTMLDivElement, latestPropsRef.current);
    hostRef.current = host;
    justMountedRef.current = true;
    return () => {
      hostRef.current = null;
      host.destroy();
    };
  }, [create]);

  useIsomorphicLayoutEffect(() => {
    if (justMountedRef.current) {
      justMountedRef.current = false;
      return;
    }
    hostRef.current?.update(chartProps);
  });

  const refresh = useCallback(() => {
    hostRef.current?.refresh();
  }, []);

  return { containerRef, refresh };
}
