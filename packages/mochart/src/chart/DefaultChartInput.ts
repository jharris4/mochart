import { enhanceConfig } from '../config/helper';
import { ArrayOfObjectsDataProvider } from '../data/DataProvider';
import { getDataErrors } from '../data/DataValidator';
import type { DefaultChartProps } from '../types/chart';
import type { MochartInputConfig } from '../types/config';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { DataProvider, DataRow } from '../types/data';

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && v !== undefined && typeof v === "object";
}

function getCategoryProperty(config: MochartInputConfig | EnhancedMochartConfig): string | undefined {
  let categoryProperty: string | undefined = undefined;
  if (isObject(config) && isObject(config.categoryAxis)) {
    const property = config.categoryAxis.property;
    categoryProperty = typeof property === 'string' ? property : undefined;
  }
  return categoryProperty;
}

function isArrayOfObjects(data: readonly unknown[]): data is readonly DataRow[] {
  return Array.isArray(data) && !data.some(v => !isObject(v));
}

function buildErrorDataProvider(error: unknown = 'Invalid Data'): DataProvider {
  return {
    getError: () => error,
    getCategoryValues: () => [],
    getSeriesValue: () => undefined
  };
}

function createRawDataProvider(mochartConfig: EnhancedMochartConfig, data: readonly unknown[]): DataProvider | null {
  const categoryProperty = getCategoryProperty(mochartConfig);
  if (categoryProperty !== undefined && isArrayOfObjects(data)) {
    return new ArrayOfObjectsDataProvider(data, categoryProperty) as unknown as DataProvider;
  }
  return null;
}

/**
 * Input adapter for createDefaultChart (was the DefaultChart component):
 * enhances the raw `config` and wraps the plain array-of-objects `data` in a
 * validated data provider, producing the enhanced config + provider pair the
 * ChartController consumes.
 */
export class DefaultChartInput {
  mochartConfig: EnhancedMochartConfig | null = null;
  dataProvider: DataProvider | null = null;

  /** provider over the raw data, before validation against the config */
  private rawDataProvider: DataProvider | null = null;
  /** shared error provider so staying invalid keeps a stable identity */
  private errorDataProvider: DataProvider | null = null;

  private validateDataProvider(mochartConfig: EnhancedMochartConfig): DataProvider {
    if (this.rawDataProvider !== null && getDataErrors(mochartConfig, this.rawDataProvider).length === 0) {
      return this.rawDataProvider;
    }
    if (this.errorDataProvider === null) {
      this.errorDataProvider = buildErrorDataProvider();
    }
    return this.errorDataProvider;
  }

  start(props: DefaultChartProps): void {
    const { config, data } = props;
    const mochartConfig = enhanceConfig(config) as EnhancedMochartConfig;
    this.rawDataProvider = createRawDataProvider(mochartConfig, data);
    this.mochartConfig = mochartConfig;
    this.dataProvider = this.validateDataProvider(mochartConfig);
  }

  update(prev: DefaultChartProps, next: DefaultChartProps): void {
    const { config, data } = next;
    const configChanged = config !== prev.config;
    const dataChanged = data !== prev.data;

    if (configChanged || dataChanged) {
      let { mochartConfig } = this;
      const categoryPropertyChanged = getCategoryProperty(config) !== getCategoryProperty(prev.config);
      if (configChanged) {
        mochartConfig = enhanceConfig(config) as EnhancedMochartConfig;
      }
      if (dataChanged || categoryPropertyChanged) {
        this.rawDataProvider = createRawDataProvider(mochartConfig!, data);
      }
      // validity depends on the config too (series properties, group axis),
      // so it is rechecked even when only the config changed
      this.mochartConfig = mochartConfig;
      this.dataProvider = this.validateDataProvider(mochartConfig!);
    }
  }
}
