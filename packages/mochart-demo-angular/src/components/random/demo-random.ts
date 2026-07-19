import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { buildMochartDemoConfig, demoText } from '@mochart/demo-common';

import { RandomContent } from './random-content';
import { BackToDemosButton, ModeSwitcher, SiteRootButton } from '../misc/mode-switcher';

import type { DemoData, MochartDemoConfig, RandomConfigWithValid, SwitchableDemoMode } from '../../types';

const eventKeyChart = 1;
const eventKeyConfig = 2;
const eventKeyData = 3;

@Component({
  selector: 'app-demo-random',
  imports: [RandomContent, BackToDemosButton, ModeSwitcher, SiteRootButton],
  styles: [':host { display: contents; }'],
  template: `
    <div class="mochart-demo-container multi">
      <div class="mochart-demo-tabs-container">
        <div class="mochart-demo-nav-group">
          @if (siteRootUrl !== undefined) {
            <a appSiteRootButton [href]="siteRootUrl"></a>
          }
          <button appBackToDemosButton (click)="onBackToDemos()"></button>
          <ul class="nav nav-tabs">
            <li class="nav-item">
              <button type="button" [class]="'nav-link' + (activeKey() === eventKeys.eventKeyChart ? ' active' : '')"
                      (click)="handleSelect(eventKeys.eventKeyChart)">
                {{ text.chart }}
              </button>
            </li>
            <li class="nav-item">
              <button type="button" [class]="'nav-link' + (activeKey() === eventKeys.eventKeyConfig ? ' active' : '')"
                      (click)="handleSelect(eventKeys.eventKeyConfig)">
                {{ text.randomConfig }}
              </button>
            </li>
            <li class="nav-item">
              <button type="button" [class]="'nav-link' + (activeKey() === eventKeys.eventKeyData ? ' active' : '')"
                      (click)="handleSelect(eventKeys.eventKeyData)">
                {{ text.data }}
              </button>
            </li>
          </ul>
        </div>
        <app-mode-switcher [demoMode]="'random'" [onModeChanged]="onModeChanged" />
      </div>
      <div class="mochart-demo-content-pane">
        <app-random-content [mochartDemoConfig]="mochartDemoConfig()!" [initialRandomConfig]="randomConfig()!"
                            [activeKey]="activeKey()" [eventKeys]="eventKeys"
                            [randomId]="randomId" [incrementRandomId]="incrementRandomId" [decrementRandomId]="decrementRandomId" />
      </div>
    </div>
  `
})
export class DemoRandom implements OnInit, OnChanges {
  @Input({ required: true }) demoData!: DemoData;
  @Input({ required: true }) initialDemoId!: string;
  @Input() siteRootUrl?: string;
  @Input({ required: true }) onModeChanged!: (nextDemoMode: SwitchableDemoMode) => void;
  @Input({ required: true }) onBackToDemos!: () => void;
  @Input({ required: true }) randomId!: number;
  @Input({ required: true }) incrementRandomId!: () => void;
  @Input({ required: true }) decrementRandomId!: () => void;

  readonly text = demoText.tabs;

  readonly eventKeys = { eventKeyChart, eventKeyConfig, eventKeyData };

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
    const initialState = this.buildStateForDemo(this.initialDemoId);
    this.mochartDemoConfig.set(initialState.mochartDemoConfig);
    this.randomConfig.set(initialState.randomConfig);
  }

  // When the routed demo changes, rebuild the generator state (RandomContent
  // distinguishes a demo change from a randomId step via its own inputs).
  ngOnChanges(changes: SimpleChanges): void {
    const initialDemoIdChange = changes['initialDemoId'];
    if (!initialDemoIdChange || initialDemoIdChange.firstChange) {
      return;
    }
    const nextState = this.buildStateForDemo(this.initialDemoId);
    this.activeKey.set(eventKeyChart);
    this.mochartDemoConfig.set(nextState.mochartDemoConfig);
    this.randomConfig.set(nextState.randomConfig);
  }

  handleSelect(nextActiveKey: number): void {
    this.activeKey.set(nextActiveKey);
  }
}
