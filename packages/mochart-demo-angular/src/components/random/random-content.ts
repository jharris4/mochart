import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { NONE, getDataErrors } from '@mochart/core';
import type { MochartConfig, DataProvider } from '@mochart/core';

import { DemosTab } from '../demos/demos-tab';
import { RandomChartTab } from './random-chart-tab';
import { RandomConfigTab } from './random-config-tab';
import { RandomDataTab } from './random-data-tab';
import { ErrorTab } from '../misc/error-tab';

import { generateChartDataProvider } from '@mochart/demo-common';

import type { DemoData, DemoMode, MochartDemoConfig, RandomConfigWithValid, DemoDataProvider, GroupValue, OnDemoModeChanged, OnDemoChanged } from '../../types';

interface EventKeys {
  eventKeyChart: number;
  eventKeyDemo: number;
  eventKeyConfig: number;
  eventKeyData: number;
}

@Component({
  selector: 'app-random-content',
  imports: [DemosTab, RandomChartTab, RandomConfigTab, RandomDataTab, ErrorTab],
  styles: [':host { display: contents; }'],
  template: `
    <div class="mochart-demo-content">
      <app-error-tab [active]="activeKey === eventKeys.eventKeyDemo">
        <app-demos-tab [active]="activeKey === eventKeys.eventKeyDemo" [demoData]="demoData" [demoMode]="demoMode" [demoId]="demoId"
                       [onDemoModeChanged]="onDemoModeChanged" [onDemoChange]="onDemoChange" />
      </app-error-tab>
      <app-error-tab [active]="activeKey === eventKeys.eventKeyChart">
        <app-random-chart-tab [active]="activeKey === eventKeys.eventKeyChart" [mochartConfig]="mochartDemoConfig.mochartConfig" [dataProvider]="dataProvider()"
                              [onRandomizeBack]="onRandomizeBack" [onRandomizeNext]="onRandomizeNext"
                              [applyReuse]="applyReuse()" [toggleApplyReuse]="toggleApplyReuse" />
      </app-error-tab>
      <app-error-tab [active]="activeKey === eventKeys.eventKeyConfig">
        <app-random-config-tab [active]="activeKey === eventKeys.eventKeyConfig" [randomConfig]="randomConfig()!" [onUpdate]="onUpdateConfig" [onReset]="onResetConfig" />
      </app-error-tab>
      <app-error-tab [active]="activeKey === eventKeys.eventKeyData">
        <app-random-data-tab [active]="activeKey === eventKeys.eventKeyData" [data]="data()" />
      </app-error-tab>
    </div>
  `
})
export class RandomContent implements OnInit, OnChanges {
  @Input({ required: true }) demoData!: DemoData;
  @Input({ required: true }) mochartDemoConfig!: MochartDemoConfig;
  @Input({ required: true }) initialRandomConfig!: RandomConfigWithValid;
  @Input({ required: true }) demoMode!: DemoMode;
  @Input({ required: true }) initialDemoId!: string;
  @Input({ required: true }) demoId!: string;
  @Input({ required: true }) onDemoModeChanged!: OnDemoModeChanged;
  @Input({ required: true }) onDemoChange!: OnDemoChanged;
  @Input({ required: true }) activeKey!: number;
  @Input({ required: true }) eventKeys!: EventKeys;
  @Input({ required: true }) randomId!: number;
  @Input({ required: true }) incrementRandomId!: () => void;
  @Input({ required: true }) decrementRandomId!: () => void;

  randomConfig = signal<RandomConfigWithValid | null>(null);
  dataProvider = signal<DemoDataProvider | null>(null);
  data = signal<unknown>(null);
  // Reuse defaults on to match the generator's historical behavior (the
  // config's reuse settings were always applied before the toggle worked).
  applyReuse = signal(true);

  ngOnInit(): void {
    this.randomConfig.set(this.initialRandomConfig);
    if (this.initialDemoId !== 'demos') {
      this.updateDataProvider(this.initialRandomConfig);
    }
  }

  toggleApplyReuse = (): void => {
    this.applyReuse.update(applyReuse => !applyReuse);
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

  private getData(mochartConfig: MochartConfig, groupValues: GroupValue[], seriesValues: Record<string, (number | undefined)[]>): Record<string, any>[] {
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
    const nextRandomConfig = forcedRandomConfig !== void 0 ? forcedRandomConfig : this.randomConfig()!;

    if (nextRandomConfig.valid) {
      const generatorConfig = this.applyReuse() ? nextRandomConfig : this.withReuseNeutralized(nextRandomConfig);
      const nextDataProvider = generateChartDataProvider(mochartConfig, generatorConfig, this.randomId);
      const { groupValues = [], seriesValues = {} } = nextDataProvider;
      const nextData = this.getData(mochartConfig, groupValues, seriesValues);
      const dataErrors = getDataErrors(mochartConfig, nextDataProvider as unknown as DataProvider);
      if (dataErrors.length > 0) {
        console.error('data errors: ', dataErrors);
        console.warn('group values: ', groupValues);
        console.warn('series values: ', seriesValues);
        this.dataProvider.set({
          getGroupValues: () => [],
          getError: () => 'Error creating DataProvider'
        });
        this.data.set({ error: 'Error creating DataProvider' });
        this.randomConfig.set(nextRandomConfig);
      }
      else {
        this.dataProvider.set(nextDataProvider);
        this.data.set(nextData);
        this.randomConfig.set(nextRandomConfig);
      }
    }
    else {
      this.dataProvider.set({
        getGroupValues: () => [],
        getError: () => 'Invalid Random Config'
      });
      this.data.set({
        error: 'Invalid Random Config'
      });
      this.randomConfig.set(nextRandomConfig);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (Object.values(changes).some(change => change.firstChange)) {
      return;
    }
    if (changes['initialDemoId'] || changes['initialRandomConfig'] || changes['mochartDemoConfig']) {
      this.updateDataProvider(this.initialRandomConfig);
    }
    else if (changes['randomId']) {
      this.updateDataProvider();
    }
  }

  onRandomizeBack = (): void => {
    this.decrementRandomId();
  };

  onRandomizeNext = (): void => {
    this.incrementRandomId();
  };

  // Regenerate immediately so Apply/Reset on the Random Config tab visibly
  // take effect instead of waiting for the next randomize.
  onUpdateConfig = (nextRandomConfig: RandomConfigWithValid): void => {
    this.updateDataProvider(nextRandomConfig);
  };

  onResetConfig = (): void => {
    this.updateDataProvider(this.initialRandomConfig);
  };
}
