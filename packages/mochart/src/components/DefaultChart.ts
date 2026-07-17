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

function buildDataProvider(mochartConfig: MochartConfig, data: readonly unknown[]): DataProvider {
  const groupProperty = getGroupProperty(mochartConfig);
  if (groupProperty !== void 0 && isArrayOfObjects(data)) {
    const dataProvider = new ArrayOfObjectsDataProvider(data, groupProperty) as unknown as DataProvider;
    const dataErrors = getDataErrors(mochartConfig, dataProvider);
    if (dataErrors.length === 0) {
      return dataProvider;
    }
    else {
      return buildErrorDataProvider();
    }
  }
  else {
    return buildErrorDataProvider();
  }
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

  constructor() {
    super();
    this.state = { mochartConfig: null, dataProvider: null };
  }

  willMount() {
    const { config, data } = this.props;
    const mochartConfig = enhanceConfig(config);
    const dataProvider = buildDataProvider(mochartConfig, data);
    this.setState({ mochartConfig, dataProvider });
  }

  willReceiveProps(nextProps: DefaultChartProps): void {
    const { config, data } = nextProps;
    const configChanged = config !== this.props.config;
    const dataChanged = data !== this.props.data;

    if (configChanged || dataChanged) {
      let { mochartConfig, dataProvider } = this.state;
      const groupPropertyChanged = getGroupProperty(config) !== getGroupProperty(this.props.config);
      if (configChanged) {
        mochartConfig = enhanceConfig(config);
      }
      if (dataChanged || groupPropertyChanged) {
        dataProvider = buildDataProvider(mochartConfig!, data);
      }
      this.setState({ mochartConfig, dataProvider });
    }
  }

  create() {
    this.chart = this.slot();
    return null;
  }

  sync() {
    const { width, height, onChartClick, onChartMouseEnter, onChartMouseMove, onChartMouseLeave,
      onFocus, onSeriesFilter, onSeriesLayoutInfoChange,
      getLoadingComponent, getErrorComponent, getNoDataComponent, getNoSizeComponent, getNoSeriesComponent } = this.props;
    const { mochartConfig, dataProvider } = this.state;
    this.chart!.set(ManagedChart, { mochartConfig: mochartConfig!, dataProvider: dataProvider!, width, height,
      onChartClick, onChartMouseEnter,
      onChartMouseMove, onChartMouseLeave,
      onFocus, onSeriesFilter, onSeriesLayoutInfoChange,
      getLoadingComponent, getErrorComponent,
      getNoDataComponent, getNoSizeComponent,
      getNoSeriesComponent });
  }
}
