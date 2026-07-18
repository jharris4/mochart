<script lang="ts">
  import { untrack } from 'svelte';

  import { NONE, getDataErrors } from '@mochart/core';
  import type { MochartConfig, DataProvider } from '@mochart/core';

  

  import DemosTab from '../demos/DemosTab.svelte';
  import RandomChartTab from './RandomChartTab.svelte';
  import RandomConfigTab from './RandomConfigTab.svelte';
  import RandomDataTab from './RandomDataTab.svelte';
  import ErrorTab from '../misc/ErrorTab.svelte';

  import { demoText, generateChartDataProvider } from '@mochart/demo-common';

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

  // Props intentionally seed local state with their initial value only; the
  // $effect.pre below re-syncs everything when the inputs change.
  // svelte-ignore state_referenced_locally
  const { eventKeyChart, eventKeyDemo, eventKeyConfig, eventKeyData } = eventKeys;

  // svelte-ignore state_referenced_locally
  let randomConfig = $state.raw<RandomConfigWithValid>(initialRandomConfig);
  let dataProvider = $state.raw<DemoDataProvider | null>(null);
  let data = $state.raw<unknown>(null);
  // Reuse defaults on to match the generator's historical behavior (the
  // config's reuse settings were always applied before the toggle worked).
  let applyReuse = $state(true);

  function toggleApplyReuse() {
    applyReuse = !applyReuse;
    updateDataProvider();
  }

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

  function updateDataProvider(forcedRandomConfig?: RandomConfigWithValid) {
    const { mochartConfig } = mochartDemoConfig;
    const nextRandomConfig = forcedRandomConfig !== void 0 ? forcedRandomConfig : randomConfig;

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
  }

  // svelte-ignore state_referenced_locally
  if (initialDemoId !== 'demos') {
    // svelte-ignore state_referenced_locally
    updateDataProvider(initialRandomConfig);
  }

  // svelte-ignore state_referenced_locally
  let previousInitialDemoId = initialDemoId;
  // svelte-ignore state_referenced_locally
  let previousInitialRandomConfig = initialRandomConfig;
  // svelte-ignore state_referenced_locally
  let previousMochartDemoConfig = mochartDemoConfig;
  // svelte-ignore state_referenced_locally
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

  // Regenerate immediately so Apply/Reset on the Random Config tab visibly
  // take effect instead of waiting for the next randomize.
  function onUpdateConfig(nextRandomConfig: RandomConfigWithValid) {
    updateDataProvider(nextRandomConfig);
  }

  function onResetConfig() {
    updateDataProvider(initialRandomConfig);
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
