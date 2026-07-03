import { h, render, unmountAtNode } from 'mochart-vdom';
import ManagedChart from './components/ManagedChart';

export interface ChartHandle {
  update(nextProps: Record<string, any>): void;
  destroy(): void;
}

/**
 * Imperative entry point: mount a managed chart into a DOM element.
 * Replaces the old ReactDOM.render(<ManagedChart .../>, container) usage.
 */
export function createChart(container: Element, props: Record<string, any>): ChartHandle {
  let currentProps = { ...props };
  render(h(ManagedChart, currentProps), container);
  return {
    update(nextProps: Record<string, any>) {
      currentProps = { ...currentProps, ...nextProps };
      render(h(ManagedChart, currentProps), container);
    },
    destroy() {
      unmountAtNode(container);
    }
  };
}
