<script lang="ts">
  import { ArrayOfObjectsDataProvider } from 'mochart';

  import buildMochartDemoConfig from '../../config/mochartDemoConfig';

  import TransitionChartTab from './TransitionChartTab.svelte';
  import TransitionConfigTab from './TransitionConfigTab.svelte';

  import type { TransitionConfig, ChartDataProviderLike } from '../../types';

  const eventKeyChart = 1;
  const eventKeyConfig = 2;

  const defaultTransitionConfig = {
    "config": {
      "version": "1.0.0",
      "animationConfig": {
        "initialDuration": 1000,
        "expansionDuration": 3000,
        "valueChangeDuration": 3000,
        "collapseDuration": 3000
      },
      "groupAxisConfig": {
        "property": "timestamp",
        "type": "string",
        "scale": "ordinal",
        "valueLabel": "Date",
        "dateUTC": false
      },
      "legendConfig": {
        "visible": true
      },
      "seriesAxisConfigs": [
        {
          "id": "SA0",
          "min": 0
        }
      ],
      "seriesStackConfigs": [{
        "id": "SS0",
        "axis": "SA0"
      }],
      "seriesConfigs": [
        {
          "axis": "SA0",
          "stack": "SS0",
          "property": "count",
          "title": "Count",
          "renderer": "bar",
          "markerShape": null,
          "valueFormat": ",d"
        }
      ]
    },
    "data": [
      [
        { "timestamp": "aaa", "count": 50 },
        { "timestamp": "bbb", "count": 48 },
        { "timestamp": "ccc", "count": 28 },
        { "timestamp": "ddd", "count": 27 },
        { "timestamp": "eee", "count": 25 },
        { "timestamp": "fff", "count": 22 }
      ],
      [
        { "timestamp": "ccc", "count": 45 },
        { "timestamp": "bbb", "count": 42 },
        { "timestamp": "ddd", "count": 27 },
        { "timestamp": "eee", "count": 25 },
        { "timestamp": "fff", "count": 22 },
        { "timestamp": "ggg", "count": 20 }
      ],
      [
        { "timestamp": "bbb", "count": 42 },
        { "timestamp": "ccc", "count": 45 },
        { "timestamp": "ddd", "count": 27 },
        { "timestamp": "eee", "count": 25 },
        { "timestamp": "fff", "count": 22 },
        { "timestamp": "ggg", "count": 20 }
      ]
    ]
  };

  function getMochartConfig(transitionConfig: TransitionConfig) {
    return buildMochartDemoConfig(transitionConfig.config).mochartConfig;
  }

  function getDataProviders(transitionConfig: TransitionConfig): ChartDataProviderLike[] {
    // TODO - this doesn't handle group display property or extra series properties...
    const groupProperty = transitionConfig.config.groupAxisConfig.property;
    return transitionConfig.data.map(data => new ArrayOfObjectsDataProvider(data, groupProperty));
  }

  let activeKey = $state(eventKeyChart);

  let transitionConfig = $state.raw<TransitionConfig>(defaultTransitionConfig);
  let mochartConfig = $state.raw(getMochartConfig(defaultTransitionConfig));
  let dataProviders = $state.raw(getDataProviders(defaultTransitionConfig));

  function handleSelect(nextActiveKey: number) {
    activeKey = nextActiveKey;
  }

  function onUpdateConfig(nextTransitionConfig: TransitionConfig) {
    transitionConfig = nextTransitionConfig;
    mochartConfig = getMochartConfig(nextTransitionConfig);
    dataProviders = getDataProviders(nextTransitionConfig);
  }

  function onResetConfig() {
    transitionConfig = defaultTransitionConfig;
    mochartConfig = getMochartConfig(defaultTransitionConfig);
    dataProviders = getDataProviders(defaultTransitionConfig);
  }
</script>

<div class="mochart-demo-container multi">
  <div class="mochart-demo-tabs-container">
    <ul class="nav nav-tabs">
      <li class="nav-item">
        <button type="button" class={"nav-link" + (activeKey === eventKeyChart ? " active" : "")}
                onclick={() => handleSelect(eventKeyChart)}>
          Chart
        </button>
      </li>
      <li class="nav-item">
        <button type="button" class={"nav-link" + (activeKey === eventKeyConfig ? " active" : "")}
                onclick={() => handleSelect(eventKeyConfig)}>
          Transition Config
        </button>
      </li>
    </ul>
  </div>
  <div class="mochart-demo-content-pane">
    <div class="mochart-demo-content">
      <TransitionChartTab {mochartConfig} {dataProviders} active={activeKey === eventKeyChart} />
      <TransitionConfigTab {transitionConfig} onUpdate={onUpdateConfig} onReset={onResetConfig}
                           active={activeKey === eventKeyConfig} />
    </div>
  </div>
</div>
