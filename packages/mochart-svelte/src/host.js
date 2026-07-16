/**
 * @typedef {{ update(props: Record<string, any>): void, destroy(): void }} HostHandle
 * @typedef {(container: Element, props: Record<string, any>) => { update(props: Record<string, any>): void, destroy(): void }} CreateChartFn
 */

function measure(container) {
  const rect = container.getBoundingClientRect();
  return { width: Math.floor(rect.width), height: Math.floor(rect.height) };
}

function withSize(props, measured) {
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
 *
 * @param {CreateChartFn} create
 * @param {HTMLElement} container
 * @param {Record<string, any>} props
 * @returns {HostHandle}
 */
export function mountChartHost(create, container, props) {
  let lastProps = props;
  let measured = measure(container);
  const chart = create(container, withSize(props, measured));

  let observer = null;
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
    update(nextProps) {
      lastProps = nextProps;
      chart.update(withSize(nextProps, measured));
    },
    destroy() {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      chart.destroy();
    }
  };
}
