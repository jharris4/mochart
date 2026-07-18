import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import buildMochartDemoConfig from '../../config/mochartDemoConfig';

import { DemosTab } from '../demos/demos-tab';
import { RandomContent } from './random-content';

import type { DemoData, DemoMode, MochartDemoConfig, RandomConfigWithValid, OnDemoModeChanged, OnDemoChanged } from '../../types';

const eventKeyChart = 1;
const eventKeyDemo = 2;
const eventKeyConfig = 3;
const eventKeyData = 4;

function getActiveKeyForInitialDemoId(initialDemoId: string): number {
  return initialDemoId === 'demos' ? eventKeyDemo : eventKeyChart;
}

@Component({
  selector: 'app-demo-random',
  imports: [DemosTab, RandomContent],
  styles: [':host { display: contents; }'],
  template: `
    <div class="mochart-demo-container multi">
      <div class="mochart-demo-tabs-container">
        <ul class="nav nav-tabs">
          <li class="nav-item">
            <button type="button" [class]="'nav-link' + (activeKey() === eventKeys.eventKeyDemo ? ' active' : '')"
                    (click)="handleSelect(eventKeys.eventKeyDemo)">
              Demos
            </button>
          </li>
          <li class="nav-item" [style.display]="isDemos ? 'none' : null">
            <button type="button" [class]="'nav-link' + (activeKey() === eventKeys.eventKeyChart ? ' active' : '')"
                    (click)="handleSelect(eventKeys.eventKeyChart)">
              Chart
            </button>
          </li>
          <li class="nav-item" [style.display]="isDemos ? 'none' : null">
            <button type="button" [class]="'nav-link' + (activeKey() === eventKeys.eventKeyConfig ? ' active' : '')"
                    (click)="handleSelect(eventKeys.eventKeyConfig)">
              Random Config
            </button>
          </li>
          <li class="nav-item" [style.display]="isDemos ? 'none' : null">
            <button type="button" [class]="'nav-link' + (activeKey() === eventKeys.eventKeyData ? ' active' : '')"
                    (click)="handleSelect(eventKeys.eventKeyData)">
              Data
            </button>
          </li>
        </ul>
      </div>
      <div class="mochart-demo-content-pane">
        @if (isDemos) {
          <div class="mochart-demo-content single-tab">
            <app-demos-tab [active]="activeKey() === eventKeys.eventKeyDemo" [demoData]="demoData" [demoMode]="demoMode" [demoId]="demoId()"
                           [onDemoModeChanged]="onDemoModeChanged" [onDemoChange]="onDemoChange" />
          </div>
        } @else {
          <app-random-content [demoData]="demoData" [mochartDemoConfig]="mochartDemoConfig()!" [initialRandomConfig]="randomConfig()!"
                              [demoMode]="demoMode" [initialDemoId]="initialDemoId" [demoId]="demoId()"
                              [onDemoModeChanged]="onDemoModeChanged" [onDemoChange]="onDemoChange" [activeKey]="activeKey()"
                              [eventKeys]="eventKeys"
                              [randomId]="randomId" [incrementRandomId]="incrementRandomId" [decrementRandomId]="decrementRandomId" />
        }
      </div>
    </div>
  `
})
export class DemoRandom implements OnInit, OnChanges {
  @Input({ required: true }) demoData!: DemoData;
  @Input({ required: true }) demoMode!: DemoMode;
  @Input({ required: true }) initialDemoId!: string;
  @Input({ required: true }) onDemoModeChanged!: OnDemoModeChanged;
  @Input({ required: true }) onDemoChanged!: OnDemoChanged;
  @Input({ required: true }) randomId!: number;
  @Input({ required: true }) incrementRandomId!: () => void;
  @Input({ required: true }) decrementRandomId!: () => void;

  readonly eventKeys = { eventKeyChart, eventKeyDemo, eventKeyConfig, eventKeyData };

  demoId = signal('');
  activeKey = signal(eventKeyChart);
  mochartDemoConfig = signal<MochartDemoConfig | null>(null);
  randomConfig = signal<RandomConfigWithValid | null>(null);

  private buildStateForDemo(demoId: string): { mochartDemoConfig: MochartDemoConfig; randomConfig: RandomConfigWithValid } {
    const config = this.demoData.demoObjectMap[demoId].config;
    return {
      mochartDemoConfig: buildMochartDemoConfig(config),
      randomConfig: Object.assign({}, this.demoData.demoObjectMap[demoId].random, { valid: true })
    };
  }

  ngOnInit(): void {
    this.demoId.set(this.initialDemoId);
    this.activeKey.set(getActiveKeyForInitialDemoId(this.initialDemoId));
    if (this.initialDemoId !== 'demos') {
      const initialState = this.buildStateForDemo(this.initialDemoId);
      this.mochartDemoConfig.set(initialState.mochartDemoConfig);
      this.randomConfig.set(initialState.randomConfig);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const initialDemoIdChange = changes['initialDemoId'];
    if (!initialDemoIdChange || initialDemoIdChange.firstChange) {
      return;
    }
    const nextInitialDemoId = this.initialDemoId;
    if (nextInitialDemoId !== 'demos') {
      const nextState = this.buildStateForDemo(nextInitialDemoId);
      this.demoId.set(nextInitialDemoId);
      this.activeKey.set(getActiveKeyForInitialDemoId(nextInitialDemoId));
      this.mochartDemoConfig.set(nextState.mochartDemoConfig);
      this.randomConfig.set(nextState.randomConfig);
    }
    else {
      this.demoId.set(nextInitialDemoId);
      this.activeKey.set(getActiveKeyForInitialDemoId(nextInitialDemoId));
    }
  }

  onDemoChange = (nextDemoId: string): void => {
    this.demoId.set(nextDemoId);
    this.onDemoChanged(nextDemoId);
  };

  handleSelect(nextActiveKey: number): void {
    this.activeKey.set(nextActiveKey);
  }

  get isDemos(): boolean {
    return this.initialDemoId === 'demos';
  }
}
