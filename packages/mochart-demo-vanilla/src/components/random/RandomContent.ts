import { NONE, getDataErrors } from '@mochart/core';
import type { MochartConfig, DataProvider } from '@mochart/core';

import { el, errorTab } from '../misc/dom';
import type { ErrorTabHandle } from '../misc/dom';
import { demosTab } from '../demos/DemosTab';
import type { DemosTabHandle } from '../demos/DemosTab';
import { randomChartTab } from './RandomChartTab';
import type { RandomChartTabHandle } from './RandomChartTab';
import { randomConfigTab } from './RandomConfigTab';
import type { RandomConfigTabHandle } from './RandomConfigTab';
import { randomDataTab } from './RandomDataTab';
import type { RandomDataTabHandle } from './RandomDataTab';

import { demoText, generateChartDataProvider } from '@mochart/demo-common';

import type { DemoData, DemoMode, MochartDemoConfig, RandomConfigWithValid, DemoDataProvider, GroupValue, OnDemoModeChanged, OnDemoChanged } from '../../types';

interface EventKeys {
  eventKeyChart: number;
  eventKeyDemo: number;
  eventKeyConfig: number;
  eventKeyData: number;
}

export interface RandomContentProps {
  demoData: DemoData;
  mochartDemoConfig: MochartDemoConfig;
  initialRandomConfig: RandomConfigWithValid;
  demoMode: DemoMode;
  initialDemoId: string;
  demoId: string;
  onDemoModeChanged: OnDemoModeChanged;
  onDemoChange: OnDemoChanged;
  activeKey: number;
  eventKeys: EventKeys;
  randomId: number;
  incrementRandomId: () => void;
  decrementRandomId: () => void;
}

export interface RandomContentHandle {
  el: HTMLElement;
  setActiveKey(activeKey: number): void;
  update(next: {
    mochartDemoConfig: MochartDemoConfig;
    initialRandomConfig: RandomConfigWithValid;
    initialDemoId: string;
    demoId: string;
    randomId: number;
  }): void;
  destroy(): void;
}

export function randomContent(props: RandomContentProps): RandomContentHandle {
  const { demoData, demoMode, onDemoModeChanged, onDemoChange, eventKeys, incrementRandomId, decrementRandomId } = props;
  const { eventKeyChart, eventKeyDemo, eventKeyConfig, eventKeyData } = eventKeys;

  let mochartDemoConfig = props.mochartDemoConfig;
  let initialRandomConfig = props.initialRandomConfig;
  let initialDemoId = props.initialDemoId;
  let randomId = props.randomId;
  let activeKey = props.activeKey;

  let randomConfig: RandomConfigWithValid = initialRandomConfig;
  let dataProvider: DemoDataProvider | null = null;
  let data: unknown = null;
  // Reuse defaults on to match the generator's historical behavior (the
  // config's reuse settings were always applied before the toggle worked).
  let applyReuse = true;

  // With reuse off, the generator gets a config whose reuse settings are
  // neutralized, so every dataset is generated independently.
  function withReuseNeutralized(config: RandomConfigWithValid): RandomConfigWithValid {
    return {
      ...config,
      group: { ...config.group, reuse: { globalPercentage: 0, stepPercentage: 0 } },
      series: { ...config.series, reuse: { global: false, step: false } }
    };
  }

  function getData(mochartConfig: MochartConfig, groupValues: GroupValue[], seriesValues: Record<string, (number | undefined)[]>) {
    const { groupAxisConfig } = mochartConfig;
    const groupProperty = groupAxisConfig.property ?? '';
    const nextData: Record<string, any>[] = groupValues.map(g => ({ [groupProperty]: g }));
    const groupCount = groupValues.length;
    if (groupAxisConfig.displayProperty !== NONE) {
      const displayProperty = groupAxisConfig.displayProperty;
      for (let i = 0; i < groupCount; i++) {
        nextData[i][displayProperty] = groupValues[i];
      }
    }
    const seriesProperties = Object.keys(seriesValues);
    for (const seriesProperty of seriesProperties) {
      const seriesPropertyValues = seriesValues[seriesProperty];
      for (let i = 0; i < groupCount; i++) {
        nextData[i][seriesProperty] = seriesPropertyValues[i];
      }
    }
    return nextData;
  }

  function updateDataProvider(forcedRandomConfig?: RandomConfigWithValid): void {
    const { mochartConfig } = mochartDemoConfig;
    const nextRandomConfig = forcedRandomConfig !== undefined ? forcedRandomConfig : randomConfig;

    if (nextRandomConfig.valid) {
      const generatorConfig = applyReuse ? nextRandomConfig : withReuseNeutralized(nextRandomConfig);
      const nextDataProvider = generateChartDataProvider(mochartConfig, generatorConfig, randomId);
      const { groupValues = [], seriesValues = {} } = nextDataProvider;
      const nextData = getData(mochartConfig, groupValues, seriesValues);
      const dataErrors = getDataErrors(mochartConfig, nextDataProvider as unknown as DataProvider);
      if (dataErrors.length > 0) {
        console.error('data errors: ', dataErrors);
        console.warn('group values: ', groupValues);
        console.warn('series values: ', seriesValues);
        dataProvider = {
          getGroupValues: () => [],
          getError: () => demoText.errors.creatingDataProvider
        };
        data = { error: demoText.errors.creatingDataProvider };
        randomConfig = nextRandomConfig;
      }
      else {
        dataProvider = nextDataProvider;
        data = nextData;
        randomConfig = nextRandomConfig;
      }
    }
    else {
      dataProvider = {
        getGroupValues: () => [],
        getError: () => demoText.errors.invalidRandomConfig
      };
      data = {
        error: demoText.errors.invalidRandomConfig
      };
      randomConfig = nextRandomConfig;
    }
    syncChildren();
  }

  function toggleApplyReuse(): void {
    applyReuse = !applyReuse;
    updateDataProvider();
  }

  // Regenerate immediately so Apply/Reset on the Random Config tab visibly
  // take effect instead of waiting for the next randomize.
  function onUpdateConfig(nextRandomConfig: RandomConfigWithValid): void {
    updateDataProvider(nextRandomConfig);
  }

  function onResetConfig(): void {
    updateDataProvider(initialRandomConfig);
  }

  // ---------------------------------------------------------------------
  // children
  // ---------------------------------------------------------------------

  const demos: DemosTabHandle = demosTab({
    active: activeKey === eventKeyDemo,
    demoData,
    demoMode,
    demoId: props.demoId,
    onDemoModeChanged,
    onDemoChange
  });
  const chart: RandomChartTabHandle = randomChartTab({
    active: activeKey === eventKeyChart,
    mochartConfig: mochartDemoConfig.mochartConfig,
    dataProvider,
    onRandomizeBack: decrementRandomId,
    onRandomizeNext: incrementRandomId,
    applyReuse,
    toggleApplyReuse
  });
  const config: RandomConfigTabHandle = randomConfigTab({
    active: activeKey === eventKeyConfig,
    randomConfig,
    onUpdate: onUpdateConfig,
    onReset: onResetConfig
  });
  const dataView: RandomDataTabHandle = randomDataTab({
    active: activeKey === eventKeyData,
    data
  });

  const demosBoundary: ErrorTabHandle = errorTab(() => demos.el, activeKey === eventKeyDemo);
  const chartBoundary: ErrorTabHandle = errorTab(() => chart.el, activeKey === eventKeyChart);
  const configBoundary: ErrorTabHandle = errorTab(() => config.el, activeKey === eventKeyConfig);
  const dataBoundary: ErrorTabHandle = errorTab(() => dataView.el, activeKey === eventKeyData);

  const container = el('div', { className: 'mochart-demo-content' }, [
    demosBoundary.el, chartBoundary.el, configBoundary.el, dataBoundary.el
  ]);

  function syncChildren(): void {
    chartBoundary.guard(() => chart.update({
      mochartConfig: mochartDemoConfig.mochartConfig,
      dataProvider,
      applyReuse
    }));
    configBoundary.guard(() => config.setRandomConfig(randomConfig));
    dataBoundary.guard(() => dataView.setData(data));
  }

  if (initialDemoId !== 'demos') {
    updateDataProvider(initialRandomConfig);
  }

  return {
    el: container,
    setActiveKey(nextActiveKey: number) {
      activeKey = nextActiveKey;
      demos.setActive(activeKey === eventKeyDemo);
      demosBoundary.setActive(activeKey === eventKeyDemo);
      chartBoundary.setActive(activeKey === eventKeyChart);
      configBoundary.setActive(activeKey === eventKeyConfig);
      dataBoundary.setActive(activeKey === eventKeyData);
      chartBoundary.guard(() => chart.setActive(activeKey === eventKeyChart));
      configBoundary.guard(() => config.setActive(activeKey === eventKeyConfig));
      dataBoundary.guard(() => dataView.setActive(activeKey === eventKeyData));
    },
    update(next) {
      const demoChanged = next.initialDemoId !== initialDemoId ||
        next.initialRandomConfig !== initialRandomConfig ||
        next.mochartDemoConfig !== mochartDemoConfig;
      const randomIdChanged = next.randomId !== randomId;
      mochartDemoConfig = next.mochartDemoConfig;
      initialRandomConfig = next.initialRandomConfig;
      initialDemoId = next.initialDemoId;
      randomId = next.randomId;
      demos.setDemoId(next.demoId);
      if (demoChanged) {
        updateDataProvider(next.initialRandomConfig);
      }
      else if (randomIdChanged) {
        updateDataProvider();
      }
    },
    destroy() {
      chart.destroy();
    }
  };
}
