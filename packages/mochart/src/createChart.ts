import { ChartController } from './chart/ChartController';
import { DefaultChartInput } from './chart/DefaultChartInput';
import type { DefaultChartProps, ManagedChartProps } from './types/chart';

/** Handle returned by `createChart`/`createDefaultChart` for a mounted chart. */
export interface ChartHandle<TProps extends object = ManagedChartProps> {
  /**
   * Merge new props into the chart. Config, data, and size changes animate
   * through the staged animation phases when animation is enabled.
   */
  update(nextProps: Partial<TProps>): void;
  /** Cancel running tweens and remove the chart's DOM from the container. */
  destroy(): void;
}

/**
 * Imperative entry point: mount a managed chart into a DOM element.
 * Takes an enhanced config (`mochartConfig`) and a data provider. The chart
 * renders with the retained-mode renderer — updates write only the DOM
 * attributes that actually changed; there is no vdom.
 */
export function createChart(container: Element, props: ManagedChartProps): ChartHandle<ManagedChartProps> {
  let currentProps = { ...props };
  const controller = new ChartController(container, currentProps);
  return {
    update(nextProps: Partial<ManagedChartProps>) {
      currentProps = { ...currentProps, ...nextProps };
      controller.update(currentProps);
    },
    destroy() {
      controller.destroy();
    }
  };
}

/**
 * Convenience entry point for plain-JavaScript hosts: takes a raw `config`
 * (enhanced internally) and a plain array-of-objects `data`.
 */
export function createDefaultChart(container: Element, props: DefaultChartProps): ChartHandle<DefaultChartProps> {
  let currentProps = { ...props };
  const input = new DefaultChartInput();
  input.start(currentProps);
  const controller = new ChartController(container, toManagedProps(currentProps, input));
  return {
    update(nextProps: Partial<DefaultChartProps>) {
      const prevProps = currentProps;
      currentProps = { ...currentProps, ...nextProps };
      input.update(prevProps, currentProps);
      controller.update(toManagedProps(currentProps, input));
    },
    destroy() {
      controller.destroy();
    }
  };
}

function toManagedProps(props: DefaultChartProps, input: DefaultChartInput): ManagedChartProps {
  const { config: _config, data: _data, ...rest } = props;
  return { ...rest, mochartConfig: input.mochartConfig!, dataProvider: input.dataProvider! };
}
