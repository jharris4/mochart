<script lang="ts">
  import { untrack } from 'svelte';

  import { NONE, getDataErrors } from 'mochart';
  import type { MochartConfig, DataProvider } from 'mochart';

  import { generateChartDataProvider } from './RandomGenerator';

  import DemosTab from '../demos/DemosTab.svelte';
  import RandomChartTab from './RandomChartTab.svelte';
  import RandomConfigTab from './RandomConfigTab.svelte';
  import RandomDataTab from './RandomDataTab.svelte';
  import ErrorTab from '../misc/ErrorTab.svelte';

  import type { DemoData, DemoMode, MochartDemoConfig, RandomConfigWithValid, DemoDataProvider, GroupValue, OnDemoModeChanged, OnDemoChanged } from '../../types';

  interface EventKeys {
    eventKeyChart: number;
    eventKeyDemo: number;
    eventKeyConfig: number;
    eventKeyData: number;
  }

  interface Props {
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

  let {
    demoData,
    mochartDemoConfig,
    initialRandomConfig,
    demoMode,
    initialDemoId,
    demoId,
    onDemoModeChanged,
    onDemoChange,
    activeKey,
    eventKeys,
    randomId,
    incrementRandomId,
    decrementRandomId
  }: Props = $props();

  const { eventKeyChart, eventKeyDemo, eventKeyConfig, eventKeyData } = eventKeys;

  let randomConfig = $state.raw<RandomConfigWithValid>(initialRandomConfig);
  let dataProvider = $state.raw<DemoDataProvider | null>(null);
  let data = $state.raw<unknown>(null);
  let applyReuse = $state(false);

  function toggleApplyReuse() {
    applyReuse = !applyReuse;
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

  function updateDataProvider(forcedRandomConfig?: RandomConfigWithValid) {
    const { mochartConfig } = mochartDemoConfig;
    const nextRandomConfig = forcedRandomConfig !== void 0 ? forcedRandomConfig : randomConfig;

    if (nextRandomConfig.valid) {
      const nextDataProvider = generateChartDataProvider(mochartConfig, nextRandomConfig, randomId);
      const { groupValues = [], seriesValues = {} } = nextDataProvider;
      const nextData = getData(mochartConfig, groupValues, seriesValues);
      const dataErrors = getDataErrors(mochartConfig, nextDataProvider as unknown as DataProvider);
      if (dataErrors.length > 0) {
        console.error('data errors: ', dataErrors);
        console.warn('group values: ', groupValues);
        console.warn('series values: ', seriesValues);
        dataProvider = {
          getGroupValues: () => [],
          getError: () => 'Error creating DataProvider'
        };
        data = { error: 'Error creating DataProvider' };
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
        getError: () => 'Invalid Random Config'
      };
      data = {
        error: 'Invalid Random Config'
      };
      randomConfig = nextRandomConfig;
    }
  }

  if (initialDemoId !== 'demos') {
    updateDataProvider(initialRandomConfig);
  }

  let previousInitialDemoId = initialDemoId;
  let previousInitialRandomConfig = initialRandomConfig;
  let previousMochartDemoConfig = mochartDemoConfig;
  let previousRandomId = randomId;
  $effect.pre(() => {
    const nextInitialDemoId = initialDemoId;
    const nextInitialRandomConfig = initialRandomConfig;
    const nextMochartDemoConfig = mochartDemoConfig;
    const nextRandomId = randomId;
    untrack(() => {
      if (nextInitialDemoId !== previousInitialDemoId || nextInitialRandomConfig !== previousInitialRandomConfig ||
          nextMochartDemoConfig !== previousMochartDemoConfig) {
        previousInitialDemoId = nextInitialDemoId;
        previousInitialRandomConfig = nextInitialRandomConfig;
        previousMochartDemoConfig = nextMochartDemoConfig;
        previousRandomId = nextRandomId;
        updateDataProvider(nextInitialRandomConfig);
      }
      else if (nextRandomId !== previousRandomId) {
        previousRandomId = nextRandomId;
        updateDataProvider();
      }
    });
  });

  function onRandomizeBack() {
    decrementRandomId();
  }

  function onRandomizeNext() {
    incrementRandomId();
  }

  function onUpdateConfig(nextRandomConfig: RandomConfigWithValid) {
    randomConfig = nextRandomConfig;
  }

  function onResetConfig() {
    randomConfig = initialRandomConfig;
  }
</script>

<div class="mochart-demo-content">
  <ErrorTab active={activeKey === eventKeyDemo}>
    <DemosTab active={activeKey === eventKeyDemo} {demoData} {demoMode} {demoId}
              {onDemoModeChanged} {onDemoChange} />
  </ErrorTab>
  <ErrorTab active={activeKey === eventKeyChart}>
    <RandomChartTab active={activeKey === eventKeyChart} mochartConfig={mochartDemoConfig.mochartConfig} {dataProvider}
                    {onRandomizeBack} {onRandomizeNext}
                    {applyReuse} {toggleApplyReuse} />
  </ErrorTab>
  <ErrorTab active={activeKey === eventKeyConfig}>
    <RandomConfigTab active={activeKey === eventKeyConfig} {randomConfig} onUpdate={onUpdateConfig} onReset={onResetConfig} />
  </ErrorTab>
  <ErrorTab active={activeKey === eventKeyData}>
    <RandomDataTab active={activeKey === eventKeyData} {data} />
  </ErrorTab>
</div>
