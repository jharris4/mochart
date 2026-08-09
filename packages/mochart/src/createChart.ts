import { ChartController } from './chart/ChartController';
import { DefaultChartInput } from './chart/DefaultChartInput';
import type { DefaultChartProps, ManagedChartProps } from './types/chart';
import type { DataProvider } from './types/data';

/** Handle returned by `createChart`/`createDefaultChart` for a mounted chart. */
export interface ChartHandle<TProps extends object = ManagedChartProps> {
  /**
   * Merge new props into the chart. Change detection is by object identity:
   * a config, data, or provider change is only seen when a new reference is
   * passed — mutating the previous object in place is not detected (use
   * `refresh` for that). Config and data changes animate through the staged
   * animation phases when animation is enabled; width/height changes
   * re-layout the chart instantly.
   */
  update(nextProps: Partial<TProps>): void;
  /**
   * Replace the props wholesale: a key absent from `nextProps` is unset and
   * returns to chart-managed behavior, where `update` would keep its previous
   * value. Change detection is by object identity, as with `update`. For
   * hosts that pass the complete prop set on every render.
   */
  replace(nextProps: TProps): void;
  /**
   * Re-read the current data without a new reference: a default chart
   * rebuilds its provider over the `data` array; a managed chart first calls
   * the provider's optional `refresh()` hook (the built-in providers
   * re-index their dataset in it) and then re-reads it. The chart animates
   * to whatever they now return — the escape hatch for hosts that mutate
   * data in place. A custom provider that caches anything should implement
   * `refresh()` to invalidate its cache.
   */
  refresh(): void;
  /** Cancel running tweens and remove the chart's DOM from the container. */
  destroy(): void;
}

/** A delegating copy with a new identity, so the pipeline re-reads a provider it has already seen. */
function withFreshIdentity(dataProvider: DataProvider): DataProvider {
  const fresh: DataProvider = {
    getCategoryValues: () => dataProvider.getCategoryValues(),
    getSeriesValue: (categoryValue, categoryIndex, seriesProperty) =>
      dataProvider.getSeriesValue(categoryValue, categoryIndex, seriesProperty)
  };
  if (dataProvider.getCategoryProperty) {
    fresh.getCategoryProperty = () => dataProvider.getCategoryProperty!();
  }
  if (dataProvider.getError) {
    fresh.getError = () => dataProvider.getError!();
  }
  if (dataProvider.getLoading) {
    fresh.getLoading = () => dataProvider.getLoading!();
  }
  return fresh;
}

/**
 * Imperative entry point: mount a managed chart into a DOM element.
 * Takes an enhanced config (`mochartConfig`) and a data provider. The chart
 * renders with the retained-mode renderer — updates write only the DOM
 * attributes that actually changed; there is no vdom.
 */
export function createChart(container: Element, props: ManagedChartProps): ChartHandle<ManagedChartProps> {
  // props keep the host's own provider (what the state factories get); the pipeline
  // reads through a delegate so refresh() can re-read an unchanged identity
  let currentProps = { ...props };
  let readDataProvider = wrapForReads(currentProps.dataProvider);
  const controller = new ChartController(container, currentProps, readDataProvider);
  return {
    update(nextProps: Partial<ManagedChartProps>) {
      if (nextProps.dataProvider !== undefined && nextProps.dataProvider !== currentProps.dataProvider) {
        readDataProvider = wrapForReads(nextProps.dataProvider);
      }
      currentProps = { ...currentProps, ...nextProps };
      controller.update(currentProps, readDataProvider);
    },
    replace(nextProps: ManagedChartProps) {
      if (nextProps.dataProvider !== currentProps.dataProvider) {
        readDataProvider = wrapForReads(nextProps.dataProvider);
      }
      currentProps = { ...nextProps };
      controller.update(currentProps, readDataProvider);
    },
    refresh() {
      currentProps.dataProvider?.refresh?.();
      readDataProvider = wrapForReads(currentProps.dataProvider);
      controller.update(currentProps, readDataProvider);
    },
    destroy() {
      controller.destroy();
    }
  };
}

/** null stays null: bindings mount with no provider for the loading/error states. */
function wrapForReads(dataProvider: DataProvider | null | undefined): DataProvider | null {
  return dataProvider ? withFreshIdentity(dataProvider) : null;
}

/**
 * Convenience entry point for plain-JavaScript hosts: takes a raw `config`
 * (enhanced internally) and a plain array-of-objects `data`.
 */
export function createDefaultChart(container: Element, props: DefaultChartProps): ChartHandle<DefaultChartProps> {
  let currentProps = { ...props };
  const input = new DefaultChartInput();
  input.start(currentProps);
  // no delegate here: DefaultChartInput mints a new provider whenever it re-reads
  const controller = new ChartController(container, toManagedProps(currentProps, input), input.dataProvider);
  return {
    update(nextProps: Partial<DefaultChartProps>) {
      const prevProps = currentProps;
      currentProps = { ...currentProps, ...nextProps };
      input.update(prevProps, currentProps);
      controller.update(toManagedProps(currentProps, input), input.dataProvider);
    },
    replace(nextProps: DefaultChartProps) {
      const prevProps = currentProps;
      currentProps = { ...nextProps };
      input.update(prevProps, currentProps);
      controller.update(toManagedProps(currentProps, input), input.dataProvider);
    },
    refresh() {
      input.refresh(currentProps);
      controller.update(toManagedProps(currentProps, input), input.dataProvider);
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
