import ManagedChart from './components/ManagedChart';
import DefaultChart from './components/DefaultChart';
import type { Renderer, RendererClass } from './render';

export interface ChartHandle {
  update(nextProps: Record<string, any>): void;
  destroy(): void;
}

function mountChart(ctor: RendererClass, container: Element, props: Record<string, any>): ChartHandle {
  let currentProps = { ...props };
  const chart: Renderer = new ctor();
  chart.mount(container, null, currentProps);
  return {
    update(nextProps: Record<string, any>) {
      currentProps = { ...currentProps, ...nextProps };
      chart.update(currentProps);
    },
    destroy() {
      chart.destroy();
    }
  };
}

/**
 * Imperative entry point: mount a managed chart into a DOM element.
 * Takes an enhanced config (`mochartConfig`) and a data provider. The chart
 * renders with the retained-mode renderer — updates write only the DOM
 * attributes that actually changed; there is no vdom.
 */
export function createChart(container: Element, props: Record<string, any>): ChartHandle {
  return mountChart(ManagedChart, container, props);
}

/**
 * Convenience entry point for plain-JavaScript hosts: takes a raw `config`
 * (enhanced internally) and a plain array-of-objects `data`.
 */
export function createDefaultChart(container: Element, props: Record<string, any>): ChartHandle {
  return mountChart(DefaultChart, container, props);
}
