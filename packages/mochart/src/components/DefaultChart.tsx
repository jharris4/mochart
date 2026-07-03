// @ts-nocheck — legacy component ported verbatim from React; add types when touched
import { h, PureComponent } from 'mochart-vdom';

import { enhanceConfig } from '../config/helper';
import { ArrayOfObjectsDataProvider } from '../data/DataProvider';
import { getDataErrors } from '../data/DataValidator';
import { default as ManagedChart } from './ManagedChart';

function isObject(v) {
  return v !== null && v !== void 0 && typeof v === "object";
}

function getGroupProperty(config) {
  let groupProperty = void 0;
  if (isObject(config) && isObject(config.groupAxisConfig)) {
    groupProperty = config.groupAxisConfig.property;
  }
  return groupProperty;
}

function isArrayOfObjects(data) {
  return Array.isArray(data) && !data.some(v => !isObject(v));
}

function buildErrorDataProvider(error = 'Invalid Data') {
  return {
    getError: () => error
  };
}

function buildDataProvider(mochartConfig, data) {
  const groupProperty = getGroupProperty(mochartConfig);
  if (groupProperty !== void 0 && isArrayOfObjects(data)) {
    const dataProvider = new ArrayOfObjectsDataProvider(data, groupProperty);
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

export default class DefaultChart extends PureComponent {
  static defaultProps = {
    onChartClick: (eventPayload) => { },
    onChartMouseEnter: (eventPayload) => { },
    onChartMouseMove: (eventPayload) => { },
    onChartMouseLeave: (eventPayload) => { },
    onFocus: (focusData) => { },
    onSeriesFilter: (filterData) => { },
    onSeriesLayoutInfoChange: (bounds) => { }
  };

  constructor(props) {
    super(props);
    this.state = { mochartConfig: null, dataProvider: null };
  }

  componentWillMount() {
    const { config, data } = this.props;
    const groupProperty = getGroupProperty(config);
    const mochartConfig = enhanceConfig(config);
    const dataProvider = buildDataProvider(mochartConfig, data);
    this.setState({ mochartConfig, dataProvider });
  }

  componentWillReceiveProps(nextProps) {
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
        dataProvider = buildDataProvider(mochartConfig, data);
      }
      this.setState({ mochartConfig, dataProvider });
    }
  }

  render() {
    const { width, height, onChartClick, onChartMouseEnter, onChartMouseMove, onChartMouseLeave,
      onFocus, onSeriesFilter, onSeriesLayoutInfoChange,
      getLoadingComponent, getErrorComponent, getNoDataComponent, getNoSizeComponent, getNoSeriesComponent } = this.props;
    const { mochartConfig, dataProvider } = this.state;
    return (
      <ManagedChart mochartConfig={mochartConfig} dataProvider={dataProvider} width={width} height={height}
                    onChartClick={onChartClick} onChartMouseEnter={onChartMouseEnter}
                    onChartMouseMove={onChartMouseMove} onChartMouseLeave={onChartMouseLeave}
                    onFocus={onFocus} onSeriesFilter={onSeriesFilter} onSeriesLayoutInfoChange={onSeriesLayoutInfoChange}
                    getLoadingComponent={getLoadingComponent} getErrorComponent={getErrorComponent}
                    getNoDataComponent={getNoDataComponent} getNoSizeComponent={getNoSizeComponent}
                    getNoSeriesComponent={getNoSeriesComponent}/>
    );
  }
}