import type { ChartHandle } from '@mochart/core';
import { createPlaceholderAdapter } from './placeholders';

// `create` is used for both createChart (ManagedChartProps) and
// createDefaultChart (DefaultChartProps); the host passes props through
// opaquely, so it is intentionally typed loosely rather than per-chart.
export type CreateChartFn = (container: Element, props: any) => ChartHandle<any>;

export interface HostHandle {
  update(props: Record<string, any>): void;
  destroy(): void;
}

interface Size {
  width: number;
  height: number;
}

function measure(container: HTMLElement): Size {
  const rect = container.getBoundingClientRect();
  return { width: Math.floor(rect.width), height: Math.floor(rect.height) };
}

function withSize(props: Record<string, any>, measured: Size): Record<string, any> {
  return {
    ...props,
    width: props.width === undefined ? measured.width : props.width,
    height: props.height === undefined ? measured.height : props.height
  };
}

/**
 * Mounts a chart into `container` and keeps it sized: explicit `width`/`height`
 * props always win; whichever dimension is omitted tracks the container's own
 * size (via ResizeObserver, where available).
 */
export function mountChartHost(create: CreateChartFn, container: HTMLElement, props: Record<string, any>): HostHandle {
  const placeholders = createPlaceholderAdapter();
  let lastProps = placeholders.transform(props);
  let measured = measure(container);
  const chart = create(container, withSize(lastProps, measured));

  let observer: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => {
      const next = measure(container);
      if (next.width === measured.width && next.height === measured.height) {
        return;
      }
      measured = next;
      if (lastProps.width === undefined || lastProps.height === undefined) {
        chart.update(withSize(lastProps, measured));
      }
    });
    observer.observe(container);
  }

  return {
    update(nextProps: Record<string, any>) {
      lastProps = placeholders.transform(nextProps);
      chart.update(withSize(lastProps, measured));
    },
    destroy() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      chart.destroy();
      placeholders.destroy();
    }
  };
}
