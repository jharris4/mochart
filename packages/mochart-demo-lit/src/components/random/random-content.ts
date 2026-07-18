import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { PropertyValues } from 'lit';

import { NONE, getDataErrors } from '@mochart/core';
import type { MochartConfig, DataProvider } from '@mochart/core';

import { generateChartDataProvider } from './RandomGenerator';

import { LightElement } from '../misc/LightElement';
import '../demos/demos-tab';
import './random-chart-tab';
import './random-config-tab';
import './random-data-tab';
import '../misc/error-tab';

import type { DemoData, DemoMode, MochartDemoConfig, RandomConfigWithValid, DemoDataProvider, GroupValue, OnDemoModeChanged, OnDemoChanged } from '../../types';

interface EventKeys {
  eventKeyChart: number;
  eventKeyDemo: number;
  eventKeyConfig: number;
  eventKeyData: number;
}

@customElement('random-content')
export class RandomContent extends LightElement {
  @property({ attribute: false }) demoData!: DemoData;
  @property({ attribute: false }) mochartDemoConfig!: MochartDemoConfig;
  @property({ attribute: false }) initialRandomConfig!: RandomConfigWithValid;
  @property({ attribute: false }) demoMode!: DemoMode;
  @property({ attribute: false }) initialDemoId!: string;
  @property({ attribute: false }) demoId!: string;
  @property({ attribute: false }) onDemoModeChanged!: OnDemoModeChanged;
  @property({ attribute: false }) onDemoChange!: OnDemoChanged;
  @property({ attribute: false }) activeKey = 0;
  @property({ attribute: false }) eventKeys!: EventKeys;
  @property({ attribute: false }) randomId = 0;
  @property({ attribute: false }) incrementRandomId!: () => void;
  @property({ attribute: false }) decrementRandomId!: () => void;

  @state() private randomConfig!: RandomConfigWithValid;
  @state() private dataProvider: DemoDataProvider | null = null;
  @state() private data: unknown = null;
  // Reuse defaults on to match the generator's historical behavior (the
  // config's reuse settings were always applied before the toggle worked).
  @state() private applyReuse = true;

  private toggleApplyReuse = (): void => {
    this.applyReuse = !this.applyReuse;
    this.updateDataProvider();
  };

  // With reuse off, the generator gets a config whose reuse settings are
  // neutralized, so every dataset is generated independently.
  private withReuseNeutralized(config: RandomConfigWithValid): RandomConfigWithValid {
    return {
      ...config,
      group: { ...config.group, reuse: { globalPercentage: 0, stepPercentage: 0 } },
      series: { ...config.series, reuse: { global: false, step: false } }
    };
  }

  private getData(mochartConfig: MochartConfig, groupValues: GroupValue[], seriesValues: Record<string, (number | undefined)[]>) {
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

  private updateDataProvider(forcedRandomConfig?: RandomConfigWithValid): void {
    const { mochartConfig } = this.mochartDemoConfig;
    const nextRandomConfig = forcedRandomConfig !== void 0 ? forcedRandomConfig : this.randomConfig;

    if (nextRandomConfig.valid) {
      const generatorConfig = this.applyReuse ? nextRandomConfig : this.withReuseNeutralized(nextRandomConfig);
      const nextDataProvider = generateChartDataProvider(mochartConfig, generatorConfig, this.randomId);
      const { groupValues = [], seriesValues = {} } = nextDataProvider;
      const nextData = this.getData(mochartConfig, groupValues, seriesValues);
      const dataErrors = getDataErrors(mochartConfig, nextDataProvider as unknown as DataProvider);
      if (dataErrors.length > 0) {
        console.error('data errors: ', dataErrors);
        console.warn('group values: ', groupValues);
        console.warn('series values: ', seriesValues);
        this.dataProvider = {
          getGroupValues: () => [],
          getError: () => 'Error creating DataProvider'
        };
        this.data = { error: 'Error creating DataProvider' };
        this.randomConfig = nextRandomConfig;
      }
      else {
        this.dataProvider = nextDataProvider;
        this.data = nextData;
        this.randomConfig = nextRandomConfig;
      }
    }
    else {
      this.dataProvider = {
        getGroupValues: () => [],
        getError: () => 'Invalid Random Config'
      };
      this.data = {
        error: 'Invalid Random Config'
      };
      this.randomConfig = nextRandomConfig;
    }
  }

  override willUpdate(changed: PropertyValues<this>): void {
    if (!this.hasUpdated) {
      this.randomConfig = this.initialRandomConfig;
      if (this.initialDemoId !== 'demos') {
        this.updateDataProvider(this.initialRandomConfig);
      }
      return;
    }
    if (changed.has('initialDemoId') || changed.has('initialRandomConfig') || changed.has('mochartDemoConfig')) {
      this.updateDataProvider(this.initialRandomConfig);
    }
    else if (changed.has('randomId')) {
      this.updateDataProvider();
    }
  }

  private onRandomizeBack = (): void => {
    this.decrementRandomId();
  };

  private onRandomizeNext = (): void => {
    this.incrementRandomId();
  };

  // Regenerate immediately so Apply/Reset on the Random Config tab visibly
  // take effect instead of waiting for the next randomize.
  private onUpdateConfig = (nextRandomConfig: RandomConfigWithValid): void => {
    this.updateDataProvider(nextRandomConfig);
  };

  private onResetConfig = (): void => {
    this.updateDataProvider(this.initialRandomConfig);
  };

  override render(): unknown {
    const { eventKeyChart, eventKeyDemo, eventKeyConfig, eventKeyData } = this.eventKeys;
    return html`<div class="mochart-demo-content">
      <error-tab .active=${this.activeKey === eventKeyDemo} .content=${() =>
        html`<demos-tab .active=${this.activeKey === eventKeyDemo} .demoData=${this.demoData} .demoMode=${this.demoMode} .demoId=${this.demoId}
            .onDemoModeChanged=${this.onDemoModeChanged} .onDemoChange=${this.onDemoChange}></demos-tab>`}></error-tab>
      <error-tab .active=${this.activeKey === eventKeyChart} .content=${() =>
        html`<random-chart-tab .active=${this.activeKey === eventKeyChart} .mochartConfig=${this.mochartDemoConfig.mochartConfig} .dataProvider=${this.dataProvider}
            .onRandomizeBack=${this.onRandomizeBack} .onRandomizeNext=${this.onRandomizeNext}
            .applyReuse=${this.applyReuse} .toggleApplyReuse=${this.toggleApplyReuse}></random-chart-tab>`}></error-tab>
      <error-tab .active=${this.activeKey === eventKeyConfig} .content=${() =>
        html`<random-config-tab .active=${this.activeKey === eventKeyConfig} .randomConfig=${this.randomConfig} .onUpdate=${this.onUpdateConfig} .onReset=${this.onResetConfig}></random-config-tab>`}></error-tab>
      <error-tab .active=${this.activeKey === eventKeyData} .content=${() =>
        html`<random-data-tab .active=${this.activeKey === eventKeyData} .data=${this.data}></random-data-tab>`}></error-tab>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'random-content': RandomContent;
  }
}
