import ManagedChart from './components/ManagedChart';
import DefaultChart from './components/DefaultChart';
import type { Renderer, RendererClass } from './render';
import type { DefaultChartProps, ManagedChartProps } from './types/chart';

export interface ChartHandle<TProps extends object = ManagedChartProps> {
  update(nextProps: Partial<TProps>): void;
  destroy(): void;
}

function mountChart<TProps extends object>(ctor: RendererClass<TProps>, container: Element, props: TProps): ChartHandle<TProps> {
  let currentProps = { ...props };
  const chart: Renderer<TProps> = new ctor();
  chart.mount(container, null, currentProps);
  return {
    update(nextProps: Partial<TProps>) {
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
export function createChart(container: Element, props: ManagedChartProps): ChartHandle<ManagedChartProps> {
  return mountChart(ManagedChart, container, props);
}

/**
 * Convenience entry point for plain-JavaScript hosts: takes a raw `config`
 * (enhanced internally) and a plain array-of-objects `data`.
 */
export function createDefaultChart(container: Element, props: DefaultChartProps): ChartHandle<DefaultChartProps> {
  return mountChart(DefaultChart, container, props);
}
