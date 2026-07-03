import React, { Component } from 'react';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { Nav, NavItem, NavLink } from 'reactstrap';
import seedrandom from 'seedrandom';

import { NONE, AUTO, TYPE_DATE, TYPE_NUMBER, SCALE_ORDINAL, isDataProviderValid, getDataErrors } from 'mochart';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import MochartDemosTab from '../demos/DemosTab';
import RandomMochartChartTab from './RandomChartTab';
import RandomMochartConfigTab from './RandomConfigTab';
import RandomMochartDataTab from './RandomDataTab';
import ErrorTab from '../misc/ErrorTab';

const eventKeyChart = 1;
const eventKeyDemo = 2;
const eventKeyConfig = 3;
const eventKeyData = 4;

const noReuse = {
  "minPercentage": 0,
  "maxPercentage": 0,
  "keepSeriesValues": false
}

function getActiveKeyForInitialDemoId(initialDemoId) {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

function getPrevNextRandomId(props) {
  const { randomId } = props;
  let prevRandomId = null;
  let nextRandomId = null;
  if (randomId > Number.MIN_SAFE_INTEGER) {
    if (randomId < Number.MAX_SAFE_INTEGER) {
      prevRandomId = randomId - 1;
      nextRandomId = randomId + 1;
    }
    else {
      throw new Error("randomId was not less than max safe: " + randomId);
    }
  }
  else {
    throw new Error("randomId was not greater than min safe: " + randomId);
  }
  return {
    prevRandomId,
    nextRandomId
  };
}

class MochartDemoRandom extends Component {
  static propTypes = {
    demoData: PropTypes.object.isRequired,
    demoMode: PropTypes.string.isRequired,
    initialDemoId: PropTypes.string.isRequired,
    onDemoModeChanged: PropTypes.func.isRequired,
    onDemoChanged: PropTypes.func.isRequired,
    randomId: PropTypes.number.isRequired,
    incrementRandomId: PropTypes.func.isRequired,
    decrementRandomId: PropTypes.func.isRequired
  };

  static defaultProps = {
    demoData: {
      demoIds: [],
      testDemoIds: [],
      demoObjectMap: {}
    },
    initialDemoId: "",
    onDemoChanged: (demoId) => { }
  };

  constructor(props) {
    super(props);

    const { demoData, initialDemoId, randomId } = props;
    let state = {
      demoId: initialDemoId,
      activeKey: getActiveKeyForInitialDemoId(initialDemoId),
      mochartDemoConfig: null,
      randomConfig: null,
      randomGenerator: null,
      prevRandomId: null,
      nextRandomId: null
    };
    if (initialDemoId !== 'demos') {

      const { demoObjectMap } = demoData;
      const config = demoObjectMap[initialDemoId].config;
      const mochartDemoConfig = buildMochartDemoConfig(config);
      const randomConfig = Object.assign({}, demoData.demoObjectMap[initialDemoId].random, { valid: true });

      const { prevRandomId, nextRandomId } = getPrevNextRandomId(props);
      console.log('prevRandomId: ', prevRandomId, nextRandomId);

      const randomGenerator = seedrandom(randomId);
      state = {
        ...state,
        mochartDemoConfig,
        randomConfig,
        randomGenerator,
        prevRandomId,
        nextRandomId
      };
    }
    this.state = state;
  }

  getPrevNextRandomId(props) {
    props = props === void 0 ? this.props : props;
    const { randomId } = props;
    let prevRandomId = null;
    let nextRandomId = null;
    if (randomId > Number.MIN_SAFE_INTEGER) {
      if (randomId < Number.MAX_SAFE_INTEGER) {
        prevRandomId = randomId - 1;
        nextRandomId = randomId + 1;
      }
      else {
        throw new Error("randomId was not less than max safe: " + randomId);
      }
    }
    else {
      throw new Error("randomId was not greater than min safe: " + randomId);
    }
    return {
      prevRandomId,
      nextRandomId
    };
  }

  componentWillReceiveProps(nextProps) {
    const { demoData, initialDemoId, randomId } = nextProps;
    if (initialDemoId !== 'demos' && initialDemoId !== this.props.initialDemoId) {
      const config = demoData.demoObjectMap[initialDemoId].config;
      const mochartDemoConfig = buildMochartDemoConfig(config);
      const randomConfig = Object.assign({}, demoData.demoObjectMap[initialDemoId].random, { valid: true });
      // const randomGenerator = seedrandom(randomId);
      const { prevRandomId, nextRandomId } = getPrevNextRandomId(nextProps);
      this.setState({
        demoId: initialDemoId,
        activeKey: getActiveKeyForInitialDemoId(initialDemoId),
        mochartDemoConfig,
        randomConfig,
        prevRandomId,
        nextRandomId
      });
    }
    else {
      if (randomId !== this.props.randomId) {
        const { prevRandomId, nextRandomId } = getPrevNextRandomId(nextProps);
        this.setState({
          demoId: initialDemoId,
          activeKey: getActiveKeyForInitialDemoId(initialDemoId),
          prevRandomId,
          nextRandomId
        });
      }
      else {
        this.setState({
          demoId: initialDemoId,
          activeKey: getActiveKeyForInitialDemoId(initialDemoId)
        });
      }
    }
  }

  @autobind
  onDemoChange(demoId) {
    const { onDemoChanged } = this.props;
    this.setState({ demoId });
    onDemoChanged(demoId)
  }

  @autobind
  handleSelect(activeKey) {
    this.setState({ activeKey });
  }

  render() {
    const { demoData, demoMode, initialDemoId, onDemoModeChanged, randomId, incrementRandomId, decrementRandomId } = this.props;
    const { demoId, activeKey, mochartDemoConfig, randomConfig, randomGenerator } = this.state;

    let isDemos = initialDemoId === 'demos';
    let nonDemoNavItemStyle = isDemos ? { display: 'none' } : null;

    return (
      <div className="mochart-demo-container multi">
        <div className="mochart-demo-tabs-container">
          <Nav tabs>
            <NavItem >
              <NavLink active={activeKey === eventKeyDemo} onClick={() => { this.handleSelect(eventKeyDemo) }}>
                Demos
              </NavLink>
            </NavItem>
            <NavItem style={nonDemoNavItemStyle}>
              <NavLink active={activeKey === eventKeyChart} onClick={() => { this.handleSelect(eventKeyChart) }}>
                Chart
              </NavLink>
            </NavItem>
            <NavItem style={nonDemoNavItemStyle}>
              <NavLink active={activeKey === eventKeyConfig} onClick={() => { this.handleSelect(eventKeyConfig) }}>
                Random Config
              </NavLink>
            </NavItem>
            <NavItem style={nonDemoNavItemStyle}>
              <NavLink active={activeKey === eventKeyData} onClick={() => { this.handleSelect(eventKeyData) }}>
                Data
              </NavLink>
            </NavItem>
          </Nav>
        </div>
        <div className="mochart-demo-content-pane">
          <RandomMochartDemoContent demoData={demoData} mochartDemoConfig={mochartDemoConfig} initialRandomConfig={randomConfig}
            randomGenerator={randomGenerator} demoMode={demoMode} initialDemoId={initialDemoId} demoId={demoId}
            onDemoModeChanged={onDemoModeChanged} onDemoChange={this.onDemoChange} activeKey={activeKey}
            randomId={randomId} incrementRandomId={incrementRandomId} decrementRandomId={decrementRandomId} />
        </div>
      </div>
    );
  }
}

class RandomMochartDemoContent extends Component {
  static propTypes = {
    demoData: PropTypes.object.isRequired,
    mochartDemoConfig: PropTypes.object,
    initialRandomConfig: PropTypes.object,
    demoMode: PropTypes.string.isRequired,
    initialDemoId: PropTypes.string.isRequired,
    demoId: PropTypes.string.isRequired,
    onDemoModeChanged: PropTypes.func.isRequired,
    onDemoChange: PropTypes.func.isRequired,
    activeKey: PropTypes.number.isRequired,
    randomId: PropTypes.number.isRequired,
    incrementRandomId: PropTypes.func.isRequired,
    decrementRandomId: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = { randomConfig: null, dataProvider: null, data: null, applyReuse: false };
  }

  componentWillMount() {
    const { initialDemoId, initialRandomConfig } = this.props;
    if (initialDemoId !== 'demos') {
      this.updateDataProvider(this.props, initialRandomConfig);
    }
  }

  componentWillReceiveProps(nextProps) {
    const { initialDemoId, initialRandomConfig, mochartDemoConfig, randomId } = nextProps;
    if (initialDemoId !== this.props.initialDemoId || initialRandomConfig !== this.props.initialRandomConfig ||
      mochartDemoConfig !== this.props.mochartDemoConfig) {
      this.updateDataProvider(nextProps, initialRandomConfig);
    }
    else if (randomId !== this.props.randomId) {
      this.updateDataProvider(nextProps);
    }
  }

  generateError(randomConfig, randomGenerator) {
    return randomGenerator() < randomConfig.error.probability;
  }

  @autobind
  toggleApplyReuse() {
    const { applyReuse } = this.state;
    this.setState({ applyReuse: !applyReuse });
  }

  generateGroupIndicesForReuse(oldGroupValues, groupRandomConfig, randomGenerator) {
    const { applyReuse } = this.state;
    const groupIndicesToReuse = [];
    if (oldGroupValues !== null && oldGroupValues.length > 0 && applyReuse) {
      const { reuse } = groupRandomConfig;
      const { minPercentage, maxPercentage } = reuse;
      const range = maxPercentage - minPercentage;
      const percentage = minPercentage + randomGenerator() * range;
      const reuseCount = Math.round(percentage * oldGroupValues.length);
      let groupIndexMap = {};
      let i, groupIndex, maxGroupIndex = oldGroupValues.length - 1;
      for (i = 0; i < reuseCount; i++) {
        groupIndex = Math.round(randomGenerator() * maxGroupIndex);
        while (groupIndexMap[groupIndex] !== void 0) {
          groupIndex = Math.round(randomGenerator() * maxGroupIndex);
        }
        groupIndexMap[groupIndex] = groupIndexMap;
        groupIndicesToReuse.push(groupIndex);
      }
    }
    return groupIndicesToReuse;
  }

  getGroupValuesForIndices(groupValues, groupIndices) {
    return groupIndices.map(i => groupValues[i]);
  }

  generateGroupValues(groupAxisConfig, groupRandomConfig, randomGenerator, existingValues, forcedCount) {
    const { count, number, string, date } = groupRandomConfig;

    let minGroupCount = count.min;
    let existingCount = existingValues.length;
    if (existingCount > 0) {
      minGroupCount = existingCount;
    }
    let totalCount = forcedCount !== void 0 ? forcedCount : Math.min(count.max, minGroupCount + Math.round(randomGenerator() * (count.max - minGroupCount)));
    let groupCount = totalCount - existingCount;

    let groupValues = [], i, v;
    let groupValueMap = {};

    for (let existingValue of existingValues) {
      groupValues.push(existingValue);
      groupValueMap[existingValue] = existingValue;
    }

    if (groupAxisConfig.type === TYPE_DATE) {
      let minDate = new Date(date.min).getTime();
      let maxDate = new Date(date.max).getTime();
      let dateRange = maxDate - minDate;
      let dateInterval = date.interval;
      let dateUnit = 1;
      if (date.intervalUnit === 'second') {
        dateUnit = 1000;
      }
      else if (date.intervalUnit === 'minute') {
        dateUnit = 60000;
      }
      else if (date.intervalUnit === 'hour') {
        dateUnit = 3600000;
      }
      else if (date.intervalUnit === 'day') {
        dateUnit = 86400000;
      }
      dateInterval *= dateUnit;
      dateRange = Math.floor(dateRange / dateInterval);
      for (i = 0; i < groupCount; i++) {
        v = minDate + Math.round(randomGenerator() * dateRange) * dateInterval;
        while (groupValueMap[v] !== void 0) {
          v = minDate + Math.round(randomGenerator() * dateRange) * dateInterval;
        }
        groupValueMap[v] = v;
        groupValues.push(v);
      }
    }
    else if (groupAxisConfig.type === TYPE_NUMBER) {
      let min = number.min;
      let max = number.max;
      let range = max - min;
      let interval = number.interval;
      range = Math.floor(range / interval);
      for (i = 0; i < groupCount; i++) {
        v = min + Math.round(randomGenerator() * range) * interval;
        while (groupValueMap[v] !== void 0) {
          v = min + Math.round(randomGenerator() * range) * interval;
        }
        groupValueMap[v] = v;
        groupValues.push(v);
      }
    }
    else {
      let min = Math.pow(10, string.minLength - 1);
      let max = Math.pow(10, string.maxLength - 1);
      let range = max - min;
      for (i = 0; i < groupCount; i++) {
        v = '' + (min + Math.round(randomGenerator() * range));
        while (groupValueMap[v] !== void 0) {
          v = '' + (min + Math.round(randomGenerator() * range));
        }
        groupValueMap[v] = v;
        groupValues.push(v);
      }
    }
    return groupValues;
  }

  generateValues(array, min, range, probability, randomGenerator, existingValues) {
    return array.map((g, i) => {
      if (existingValues !== null && existingValues[i] !== void 0) {
        return existingValues[i].value; // wrapped to allow undefined values
      }
      else if (randomGenerator() < probability) {
        return void 0;
      }
      else {
        return min + Math.round(randomGenerator() * range);
      }
    });
  }

  generateSeriesValues(seriesConfigs, groupValues, seriesRandomConfig, randomGenerator, existingValues) {
    const { number, missing } = seriesRandomConfig;
    const { probability } = missing;
    const { min, max, limitToAxisConfig } = number;
    const range = max - min;
    let seriesValues = {};
    let existingValueForKey = (key) => existingValues ? existingValues[key] : null;
    seriesConfigs.forEach(seriesConfig => {
      let axisConfig = seriesConfig.seriesAxisConfig;
      let positionMin = (axisConfig.min === AUTO || !limitToAxisConfig) ? min : axisConfig.min;
      let positionMax = (axisConfig.max === AUTO || !limitToAxisConfig) ? max : axisConfig.max;
      let positionRange = positionMax - positionMin;
      seriesValues[seriesConfig.property] = this.generateValues(groupValues, positionMin, positionRange, probability, randomGenerator, existingValueForKey(seriesConfig.property));
      if (seriesConfig.rangeProperty !== NONE) {
        seriesValues[seriesConfig.rangeProperty] = this.generateValues(groupValues, positionMin, positionRange, probability, randomGenerator, existingValueForKey(seriesConfig.rangeProperty));
      }
      if (seriesConfig.markerProperty !== NONE) {
        seriesValues[seriesConfig.markerProperty] = this.generateValues(groupValues, min, range, probability, randomGenerator, existingValueForKey(seriesConfig.markerProperty));
      }
      if (seriesConfig.colorProperty !== NONE) {
        seriesValues[seriesConfig.colorProperty] = this.generateValues(groupValues, min, range, probability, randomGenerator, existingValueForKey(seriesConfig.colorProperty));
      }
      if (seriesConfig.labelProperty !== NONE) {
        seriesValues[seriesConfig.labelProperty] = this.generateValues(groupValues, min, range, probability, randomGenerator, existingValueForKey(seriesConfig.labelProperty));
      }
    });
    return seriesValues;
  }

  getData(mochartConfig, groupValues, seriesValues) {
    const { groupAxisConfig } = mochartConfig;
    let groupProperty = groupAxisConfig.property;
    let data = groupValues.map(g => ({ [groupProperty]: g }));
    let groupCount = groupValues.length;
    if (groupAxisConfig.displayProperty !== NONE) {
      const displayProperty = groupAxisConfig.displayProperty;
      for (let i = 0; i < groupCount; i++) {
        data[i][displayProperty] = groupValues[i];
      }
    }
    let seriesProperties = Object.keys(seriesValues);
    for (let seriesProperty of seriesProperties) {
      let seriesPropertyValues = seriesValues[seriesProperty];
      for (let i = 0; i < groupCount; i++) {
        data[i][seriesProperty] = seriesPropertyValues[i];
      }
    }
    return data;
  }

  getGroupValues(groupAxisConfig, groupRandomConfig, randomGenerator, forcedCount) {
    const { count, number, string, date } = groupRandomConfig;

    let minGroupCount = count.min;
    let groupCount = forcedCount !== void 0 ? forcedCount : Math.min(count.max, minGroupCount + Math.round(randomGenerator() * (count.max - minGroupCount)));

    let groupValues = [], i, v;
    let groupValueMap = {};

    if (groupAxisConfig.type === TYPE_DATE) {
      let minDate = new Date(date.min).getTime();
      let maxDate = new Date(date.max).getTime();
      let dateRange = maxDate - minDate;
      let dateInterval = date.interval;
      let dateUnit = 1;
      if (date.intervalUnit === 'second') {
        dateUnit = 1000;
      }
      else if (date.intervalUnit === 'minute') {
        dateUnit = 60000;
      }
      else if (date.intervalUnit === 'hour') {
        dateUnit = 3600000;
      }
      else if (date.intervalUnit === 'day') {
        dateUnit = 86400000;
      }
      dateInterval *= dateUnit;
      dateRange = Math.floor(dateRange / dateInterval);
      for (i = 0; i < groupCount; i++) {
        v = minDate + Math.round(randomGenerator() * dateRange) * dateInterval;
        while (groupValueMap[v] !== void 0) {
          v = minDate + Math.round(randomGenerator() * dateRange) * dateInterval;
        }
        groupValueMap[v] = v;
        groupValues.push(v);
      }
    }
    else if (groupAxisConfig.type === TYPE_NUMBER) {
      let min = number.min;
      let max = number.max;
      let range = max - min;
      let interval = number.interval;
      range = Math.floor(range / interval);
      for (i = 0; i < groupCount; i++) {
        v = min + Math.round(randomGenerator() * range) * interval;
        while (groupValueMap[v] !== void 0) {
          v = min + Math.round(randomGenerator() * range) * interval;
        }
        groupValueMap[v] = v;
        groupValues.push(v);
      }
    }
    else {
      let min = Math.pow(10, string.minLength - 1);
      let max = Math.pow(10, string.maxLength - 1);
      let range = max - min;
      for (i = 0; i < groupCount; i++) {
        v = '' + (min + Math.round(randomGenerator() * range));
        while (groupValueMap[v] !== void 0) {
          v = '' + (min + Math.round(randomGenerator() * range));
        }
        groupValueMap[v] = v;
        groupValues.push(v);
      }
    }
    return groupValues;
  }

  getGroupCountForRandomId(randomId, group) {
    const { count } = group;
    const { min, max } = count;
    return Math.floor(min + seedrandom(randomId) * (max - min));
  }

  getSharedPrevNextGroupValues(prevRandomId, nextRandomId, group) {
    const { reuse } = group;
    const { minPercentage, maxPercentage, keepSeriesValues } = reuse;
    if (maxPercentage > 0) {
      const { order, count, number, string, date } = group;
      const { sort } = order;
      const { min, max } = count;
      const { min: numberMin, max: numberMax, interval: numberInterval } = number;
      const { minLength: stringMinLength, maxLength: stringMaxLength } = string;
      const { min: dateMin, max: dateMax, interval: dateInterval, intervalUnit: dateIntervalUnit } = date;

      if (prevRandomId === nextRandomId) {
        if (maxPercentage > 0.5) {
          const diffMaxPercentage = maxPercentage - 0.5;
          const sharedRandomId = prevRandomId + (0 - prevRandomId) / 2.0;

          //  2 =  2 + (0 - 2) / 2.0 =  1
          //  1 =  1 + (0 - 1) / 2.0 =  0.5
          //  0 =  0 + (0 - 0) / 2.0 =  0
          // -1 = -1 + (0 + 1) / 2.0 = -0.5
          // -2 = -2 + (0 + 2) / 2.0 = -1
        }
      }
      else {
        const diffMaxPercentage = Math.min(0.5, maxPercentage);
        const sharedRandomId = prevRandomId + (nextRandomId - prevRandomId) / 2.0;

        // 2
        //
        // 1 2 = 1.5
        // 2 2 = 1
        // 2 3 = 2.5

        // 1
        //
        // 0 1 = 0.5
        // 1 1 = 0.5
        // 1 2 = 1.5

        // 0
        //
        // -1  0 = -0.5
        //  0  0 =  0
        //  0  1 =  0.5

        // -1
        //
        // -2 -1 = -1.5
        // -1 -1 = -0.5
        // -1  0 = -0.5

        // -2
        //
        // -3 -2 = -2.5
        // -2 -2 = -1
        // -2 -1 = -1.5


        //  2  3 =  2 + ( 3 - 2) / 2.0 =  2.5
        //  1  2 =  1 + ( 2 - 1) / 2.0 =  1.5
        //  0  1 =  0 + ( 1 - 0) / 2.0 =  0.5
        // -1  0 = -1 + ( 0 + 1) / 2.0 = -0.5
        // -2 -1 = -2 + (-1 + 2) / 2.0 = -1.5
        // -3 -2 = -3 + (-2 + 3) / 2.0 = -2.5

        const sharedRandomGenerator = seedrandom(sharedRandomId);
        const prevGroupCount = this.getGroupCountForRandomId(prevRandomId);
        const nextGroupCount = this.getGroupCountForRandomId(nextRandomId);
        const minGroupCount = Math.min(prevGroupCount, nextGroupCount);
        const reuseGroupCount = minGroupCount * sharedRandomGenerator() * diffMaxPercentage
      }


    }
    else {
      return [];
    }
  }

  getSharedGroupValues(randomId, randomGroup) {
    const { reuse } = randomGroup;
    const { minPercentage, maxPercentage, keepSeriesValues } = reuse;
    let sharedGroupValues = [];
    let prevGroupValues = [];
    let nextGroupValues = [];
    if (maxPercentage > 0 && maxPercentage <= 1) {
      const { order, count, number, string, date } = randomGroup;
      const { sort } = order;
      const { min, max } = count;
      const { min: numberMin, max: numberMax, interval: numberInterval } = number;
      const { minLength: stringMinLength, maxLength: stringMaxLength } = string;
      const { min: dateMin, max: dateMax, interval: dateInterval, intervalUnit: dateIntervalUnit } = date;
      const extentPercentage = maxPercentage - minPercentage;

      const prevRandomId = randomId - 1;
      const prevSharedRandomId = (randomId - 1) + 0.5;
      const prevSharedPercentage = minPercentage + seedrandom(prevSharedRandomId)() * extentPercentage;

      const nextRandomId = randomId + 1;
      const nextSharedRandomId = randomId + 0.5;
      const nextSharedPercentage = minPercentage + seedrandom(nextSharedRandomId)() * extentPercentage;

      const groupCount = this.getGroupCountForRandomId(randomId, randomGroup);

      const prevGroupCount = this.getGroupCountForRandomId(prevRandomId, randomGroup);
      const prevSharedGroupCount = Math.min(groupCount, prevGroupCount) * (minPercentage + seedrandom(prevSharedRandomId)() * extentPercentage);

      const nextGroupCount = this.getGroupCountForRandomId(nextRandomId, randomGroup);
      const nextSharedGroupCount = Math.min(groupCount, nextGroupCount) * (minPercentage + seedrandom(nextSharedRandomId)() * extentPercentage);

      const sharedGroupCount = groupCount - prevSharedGroupCount - nextSharedGroupCount;

      function createGroupValues(count, randomId) {

        const groupValues = [];
        const generator = seedrandom(randomId);

        // handle types here

        return groupValues;
      }

      this.getGroupValues(groupAxisConfig, randomGroup, )

      sharedGroupValues = createGroupValues(sharedGroupCount, 0);
      prevGroupValues = createGroupValues(prevSharedGroupCount, prevSharedRandomId);
      nextGroupValues = createGroupValues(nextSharedGroupCount, nextSharedRandomId);


      sharedGroupValues = this.getSharedPrevNextGroupValues(randomId, randomId, randomGroup);
      prevGroupValues = this.getSharedPrevNextGroupValues(prevRandomId, randomId, randomGroup);
      nextGroupValues = this.getSharedPrevNextGroupValues(randomId, nextRandomId, randomGroup);

      seedrandom(prevRandomId);
    }
    return {
      sharedGroupValues,
      prevGroupValues,
      nextGroupValues
    };
  }

  updateDataProvider(props, forcedRandomConfig) {
    const { mochartDemoConfig, randomGenerator, randomId } = props;
    const { randomId: oldRandomId } = this.props;
    const { mochartConfig } = mochartDemoConfig;
    const randomConfig = forcedRandomConfig !== void 0 ? forcedRandomConfig : this.state.randomConfig;
    const { dataProvider: oldDataProvider, applyReuse } = this.state;

    if (randomConfig.valid) {
      const isError = this.generateError(randomConfig, randomGenerator);
      if (!isError) {
        const { groupAxisConfig } = mochartConfig;
        const { group, series } = randomConfig;
        const randomGroup = applyReuse ? group : { ...group, reuse: noReuse };
        const { reuse } = randomGroup;
        const hasDisplayProperty = groupAxisConfig.displayProperty !== NONE;

        const { sharedGroupValues, prevGroupValues, nextGroupValues } = this.getSharedGroupValues(randomId, randomGroup);

        const oldGroupValues = (forcedRandomConfig === void 0 && isDataProviderValid(oldDataProvider)) ? oldDataProvider.groupValues : null;
        let groupIndicesToReuse = this.generateGroupIndicesForReuse(oldGroupValues, randomGroup, randomGenerator);
        let groupValuesToReuse = this.getGroupValuesForIndices(oldGroupValues, groupIndicesToReuse);

        let groupValues = this.generateGroupValues(groupAxisConfig, randomGroup, randomGenerator, groupValuesToReuse);
        if (groupAxisConfig.scale !== SCALE_ORDINAL || randomGroup.order.sort) {
          groupValues.sort(function (a, b) {
            if (a < b) {
              return -1;
            }
            if (a > b) {
              return 1;
            }
            return 0;
          });
        }

        //console.log('setting dataProvider with group values: ', groupValues);
        let displayProperty = hasDisplayProperty ? groupAxisConfig.displayProperty : null;

        const oldSeriesValues = isDataProviderValid(oldDataProvider) ? oldDataProvider.seriesValues : null;
        let seriesValuesToReuse = null;
        if (reuse.keepSeriesValues === true && groupValuesToReuse.length > 0) {
          seriesValuesToReuse = {};
          let seriesKeys = Object.keys(oldSeriesValues).filter(s => s !== displayProperty);
          let groupValueToIndexMap = {};
          let i, count = groupValues.length;
          for (i = 0; i < count; i++) {
            groupValueToIndexMap[groupValues[i]] = i;
          }
          let reusedCount = groupValuesToReuse.length;
          let reuseValuesForKey;
          for (let key of seriesKeys) {
            reuseValuesForKey = seriesValuesToReuse[key] = {};
            for (i = 0; i < reusedCount; i++) {
              // wrapped in an object to allow undefined values to be passed through
              reuseValuesForKey[groupValueToIndexMap[groupValuesToReuse[i]]] = { value: oldSeriesValues[key][groupIndicesToReuse[i]] };
            }
          }
        }
        let seriesValues = this.generateSeriesValues(mochartConfig.seriesConfigs, groupValues, series, randomGenerator, seriesValuesToReuse);
        if (displayProperty) {
          seriesValues[displayProperty] = groupValues;
        }
        let dataProvider = {
          groupValues,
          seriesValues,
          getGroupValues: () => groupValues,
          getSeriesValue: (g, i, s) => seriesValues[s][i]
        };
        let data = this.getData(mochartConfig, groupValues, seriesValues);
        let dataErrors = getDataErrors(mochartConfig, dataProvider);
        if (dataErrors.length > 0) {
          console.error('data errors: ', dataErrors);
          console.warn('group values: ', groupValues);
          console.warn('series values: ', seriesValues);
          this.setState({
            dataProvider: {
              getError: () => 'Error creating DataProvider'
            }, data: { error: 'Error creating DataProvider' }, randomConfig
          });
        }
        else {
          this.setState({ dataProvider, data, randomConfig });
        }
      }
      else {
        this.setState({
          dataProvider: {
            getGroupValues: () => [],
            getError: () => 'A Randomized Error'
          },
          data: {
            error: 'A Randomized Error'
          },
          randomConfig
        });
      }
    }
    else {
      this.setState({
        dataProvider: {
          getGroupValues: () => [],
          getError: () => 'Invalid Random Config'
        },
        data: {
          error: 'Invalid Random Config'
        },
        randomConfig
      });
    }
  }

  updateDataProviderOld(props, forcedRandomConfig) {
    const { mochartDemoConfig, randomGenerator, randomId } = props;
    const { randomId: oldRandomId } = this.props;
    const { mochartConfig } = mochartDemoConfig;
    const randomConfig = forcedRandomConfig !== void 0 ? forcedRandomConfig : this.state.randomConfig;
    const { dataProvider: oldDataProvider, applyReuse } = this.state;

    if (randomConfig.valid) {
      const isError = this.generateError(randomConfig, randomGenerator);
      if (!isError) {
        const { groupAxisConfig } = mochartConfig;
        const { group, series } = randomConfig;
        const randomGroup = applyReuse ? group : { ...group, reuse: noReuse };
        const hasDisplayProperty = groupAxisConfig.displayProperty !== NONE;
        const oldGroupValues = (forcedRandomConfig === void 0 && isDataProviderValid(oldDataProvider)) ? oldDataProvider.groupValues : null;
        let groupIndicesToReuse = this.generateGroupIndicesForReuse(oldGroupValues, randomGroup, randomGenerator);
        let groupValuesToReuse = this.getGroupValuesForIndices(oldGroupValues, groupIndicesToReuse);

        let groupValues = this.generateGroupValues(groupAxisConfig, randomGroup, randomGenerator, groupValuesToReuse);
        if (groupAxisConfig.scale !== SCALE_ORDINAL || randomGroup.order.sort) {
          groupValues.sort(function (a, b) {
            if (a < b) {
              return -1;
            }
            if (a > b) {
              return 1;
            }
            return 0;
          });
        }

        //console.log('setting dataProvider with group values: ', groupValues);
        let displayProperty = hasDisplayProperty ? groupAxisConfig.displayProperty : null;

        const oldSeriesValues = isDataProviderValid(oldDataProvider) ? oldDataProvider.seriesValues : null;
        let seriesValuesToReuse = null;
        if (reuse.keepSeriesValues === true && groupValuesToReuse.length > 0) {
          seriesValuesToReuse = {};
          let seriesKeys = Object.keys(oldSeriesValues).filter(s => s !== displayProperty);
          let groupValueToIndexMap = {};
          let i, count = groupValues.length;
          for (i = 0; i < count; i++) {
            groupValueToIndexMap[groupValues[i]] = i;
          }
          let reusedCount = groupValuesToReuse.length;
          let reuseValuesForKey;
          for (let key of seriesKeys) {
            reuseValuesForKey = seriesValuesToReuse[key] = {};
            for (i = 0; i < reusedCount; i++) {
              // wrapped in an object to allow undefined values to be passed through
              reuseValuesForKey[groupValueToIndexMap[groupValuesToReuse[i]]] = { value: oldSeriesValues[key][groupIndicesToReuse[i]] };
            }
          }
        }
        let seriesValues = this.generateSeriesValues(mochartConfig.seriesConfigs, groupValues, series, randomGenerator, seriesValuesToReuse);
        if (displayProperty) {
          seriesValues[displayProperty] = groupValues;
        }
        let dataProvider = {
          groupValues,
          seriesValues,
          getGroupValues: () => groupValues,
          getSeriesValue: (g, i, s) => seriesValues[s][i]
        };
        let data = this.getData(mochartConfig, groupValues, seriesValues);
        let dataErrors = getDataErrors(mochartConfig, dataProvider);
        if (dataErrors.length > 0) {
          console.error('data errors: ', dataErrors);
          console.warn('group values: ', groupValues);
          console.warn('series values: ', seriesValues);
          this.setState({
            dataProvider: {
              getError: () => 'Error creating DataProvider'
            }, data: { error: 'Error creating DataProvider' }, randomConfig
          });
        }
        else {
          this.setState({ dataProvider, data, randomConfig });
        }
      }
      else {
        this.setState({
          dataProvider: {
            getError: () => 'A Randomized Error'
          }, data: { error: 'A Randomized Error' }, randomConfig
        });
      }
    }
    else {
      this.setState({
        dataProvider: {
          getError: () => 'Invalid Random Config'
        }, data: { error: 'Invalid Random Config' }, randomConfig
      });
    }
  }

  @autobind
  onRandomizeBack() {
    const { decrementRandomId } = this.props;
    decrementRandomId();
  }

  @autobind
  onRandomizeNext() {
    const { incrementRandomId } = this.props;
    incrementRandomId();
  }

  onRandomizeReset() {
    //this.updateDataProvider(this.props);
  }

  @autobind
  onUpdateConfig(randomConfig) {
    let callback = randomConfig.valid ? void 0 : () => { this.onRandomizeReset(); };
    this.setState({ randomConfig }, callback);
  }

  @autobind
  onResetConfig() {
    const { initialRandomConfig } = this.props;
    this.setState({ randomConfig: initialRandomConfig });
  }

  render() {
    const { initialDemoId, demoData, mochartDemoConfig, demoMode, demoId, onDemoModeChanged, onDemoChange, activeKey } = this.props;
    const { randomConfig, dataProvider, data, applyReuse } = this.state;

    if (initialDemoId === 'demos') {
      return (
        <div className="mochart-demo-content single-tab">
          <MochartDemosTab demoData={demoData} demoMode={demoMode} demoId={demoId} onDemoModeChanged={onDemoModeChanged}
            onDemoChange={onDemoChange} active={activeKey === eventKeyDemo} />
        </div>
      );
    }
    else {
      const { mochartConfig } = mochartDemoConfig;
      return (
        <div className="mochart-demo-content">
          <ErrorTab active={activeKey === eventKeyDemo}>
            <MochartDemosTab demoData={demoData} demoMode={demoMode} demoId={demoId} onDemoModeChanged={onDemoModeChanged}
              onDemoChange={onDemoChange} />
          </ErrorTab>
          <ErrorTab active={activeKey === eventKeyChart}>
            <RandomMochartChartTab mochartConfig={mochartConfig} dataProvider={dataProvider}
              onRandomizeBack={this.onRandomizeBack} onRandomizeNext={this.onRandomizeNext}
              applyReuse={applyReuse} toggleApplyReuse={this.toggleApplyReuse} />
          </ErrorTab>
          <ErrorTab active={activeKey === eventKeyConfig}>
            <RandomMochartConfigTab randomConfig={randomConfig} onUpdate={this.onUpdateConfig} onReset={this.onResetConfig} />
          </ErrorTab>
          <ErrorTab active={activeKey === eventKeyData}>
            <RandomMochartDataTab data={data} />
          </ErrorTab>
        </div>
      );
    }
  }
}

export default MochartDemoRandom;