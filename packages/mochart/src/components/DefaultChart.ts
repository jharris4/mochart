import { Renderer, Slot } from '../render';

import { enhanceConfig } from '../config/helper';
import { ArrayOfObjectsDataProvider } from '../data/DataProvider';
import { getDataErrors } from '../data/DataValidator';
import { default as ManagedChart } from './ManagedChart';
import type { ChartEventPayload, ChartFocus, ChartSeriesFilter, DefaultChartProps } from '../types/chart';
import type { MochartConfig, MochartInputConfig } from '../types/config';
import type { DataProvider, DataRow } from '../types/data';
import type { Bounds } from '../types/geometry';

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && v !== void 0 && typeof v === "object";
}

function getGroupProperty(config: MochartInputConfig | MochartConfig): string | undefined {
  let groupProperty: string | undefined = void 0;
  if (isObject(config) && isObject(config.groupAxisConfig)) {
    const property = config.groupAxisConfig.property;
    groupProperty = typeof property === 'string' ? property : undefined;
  }
  return groupProperty;
}

function isArrayOfObjects(data: readonly unknown[]): data is readonly DataRow[] {
  return Array.isArray(data) && !data.some(v => !isObject(v));
}

function buildErrorDataProvider(error: unknown = 'Invalid Data'): DataProvider {
  return {
    getError: () => error,
    getGroupValues: () => [],
    getSeriesValue: () => undefined
  };
}

function createRawDataProvider(mochartConfig: MochartConfig, data: readonly unknown[]): DataProvider | null {
  const groupProperty = getGroupProperty(mochartConfig);
  if (groupProperty !== void 0 && isArrayOfObjects(data)) {
    return new ArrayOfObjectsDataProvider(data, groupProperty) as unknown as DataProvider;
  }
  return null;
}

interface DefaultChartState {
  mochartConfig: MochartConfig | null;
  dataProvider: DataProvider | null;
}

export default class DefaultChart extends Renderer<DefaultChartProps, DefaultChartState> {
  static defaultProps = {
    onChartClick: (_eventPayload: ChartEventPayload) => { },
    onChartMouseEnter: (_eventPayload: ChartEventPayload) => { },
    onChartMouseMove: (_eventPayload: ChartEventPayload) => { },
    onChartMouseLeave: (_eventPayload: ChartEventPayload) => { },
    onFocus: (_focusData: ChartFocus) => { },
    onSeriesFilter: (_filterData: ChartSeriesFilter) => { },
    onSeriesLayoutInfoChange: (_bounds: Bounds) => { }
  };

  chart: Slot | null = null;
  /** provider over the raw data, before validation against the config */
  rawDataProvider: DataProvider | null = null;
  /** shared error provider so staying invalid keeps a stable identity */
  errorDataProvider: DataProvider | null = null;

  constructor() {
    super();
    this.state = { mochartConfig: null, dataProvider: null };
  }

  validateDataProvider(mochartConfig: MochartConfig): DataProvider {
    if (this.rawDataProvider !== null && getDataErrors(mochartConfig, this.rawDataProvider).length === 0) {
      return this.rawDataProvider;
    }
    if (this.errorDataProvider === null) {
      this.errorDataProvider = buildErrorDataProvider();
    }
    return this.errorDataProvider;
  }

  willMount() {
    const { config, data } = this.props;
    const mochartConfig = enhanceConfig(config);
    this.rawDataProvider = createRawDataProvider(mochartConfig, data);
    const dataProvider = this.validateDataProvider(mochartConfig);
    this.setState({ mochartConfig, dataProvider });
  }

  willReceiveProps(nextProps: DefaultChartProps): void {
    const { config, data } = nextProps;
    const configChanged = config !== this.props.config;
    const dataChanged = data !== this.props.data;

    if (configChanged || dataChanged) {
      let { mochartConfig } = this.state;
      const groupPropertyChanged = getGroupProperty(config) !== getGroupProperty(this.props.config);
      if (configChanged) {
        mochartConfig = enhanceConfig(config);
      }
      if (dataChanged || groupPropertyChanged) {
        this.rawDataProvider = createRawDataProvider(mochartConfig!, data);
      }
      // validity depends on the config too (series properties, group axis),
      // so it is rechecked even when only the config changed
      const dataProvider = this.validateDataProvider(mochartConfig!);
      this.setState({ mochartConfig, dataProvider });
    }
  }

  create() {
    this.chart = this.slot();
    return null;
  }

  sync() {
    const { loading, error, style, width, height, onChartClick, onChartMouseEnter, onChartMouseMove, onChartMouseLeave,
      onTitleClick, onFocus, onSeriesFilter, onSeriesLayoutInfoChange,
      getLoadingComponent, getErrorComponent, getNoDataComponent, getNoSizeComponent, getNoSeriesComponent, getConfigErrorComponent } = this.props;
    const { mochartConfig, dataProvider } = this.state;
    this.chart!.set(ManagedChart, { mochartConfig: mochartConfig!, dataProvider: dataProvider!, loading, error, style, width, height,
      onChartClick, onChartMouseEnter,
      onChartMouseMove, onChartMouseLeave,
      onTitleClick, onFocus, onSeriesFilter, onSeriesLayoutInfoChange,
      getLoadingComponent, getErrorComponent,
      getNoDataComponent, getNoSizeComponent,
      getNoSeriesComponent, getConfigErrorComponent });
  }
}
