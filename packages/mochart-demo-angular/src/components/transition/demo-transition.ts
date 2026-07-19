import { Component, Input, signal } from '@angular/core';

import { buildMochartDemoConfig, defaultTransitionConfig, demoText, getTransitionDataProviders, getTransitionMochartConfig } from '@mochart/demo-common';

import { TransitionChartTab } from './transition-chart-tab';
import { TransitionConfigTab } from './transition-config-tab';
import { BackToDemosButton, SiteRootButton } from '../misc/mode-switcher';

import type { TransitionConfig } from '../../types';

const eventKeyChart = 1;
const eventKeyConfig = 2;

@Component({
  selector: 'app-demo-transition',
  imports: [TransitionChartTab, TransitionConfigTab, BackToDemosButton, SiteRootButton],
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
              <button type="button" [class]="'nav-link' + (activeKey() === eventKeyChart ? ' active' : '')"
                      (click)="handleSelect(eventKeyChart)">
                {{ text.chart }}
              </button>
            </li>
            <li class="nav-item">
              <button type="button" [class]="'nav-link' + (activeKey() === eventKeyConfig ? ' active' : '')"
                      (click)="handleSelect(eventKeyConfig)">
                {{ text.transitionConfig }}
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div class="mochart-demo-content-pane">
        <div class="mochart-demo-content">
          <app-transition-chart-tab [mochartConfig]="mochartConfig()" [dataProviders]="dataProviders()" [active]="activeKey() === eventKeyChart" />
          <app-transition-config-tab [transitionConfig]="transitionConfig()" [onUpdate]="onUpdateConfig" [onReset]="onResetConfig"
                                     [active]="activeKey() === eventKeyConfig" />
        </div>
      </div>
    </div>
  `
})
export class DemoTransition {
  @Input() siteRootUrl?: string;
  @Input({ required: true }) onBackToDemos!: () => void;

  readonly text = demoText.tabs;

  readonly eventKeyChart = eventKeyChart;
  readonly eventKeyConfig = eventKeyConfig;

  activeKey = signal(eventKeyChart);

  transitionConfig = signal<TransitionConfig>(defaultTransitionConfig);
  mochartConfig = signal(getTransitionMochartConfig(defaultTransitionConfig));
  dataProviders = signal(getTransitionDataProviders(defaultTransitionConfig));

  handleSelect(nextActiveKey: number): void {
    this.activeKey.set(nextActiveKey);
  }

  onUpdateConfig = (nextTransitionConfig: TransitionConfig): void => {
    this.transitionConfig.set(nextTransitionConfig);
    this.mochartConfig.set(getTransitionMochartConfig(nextTransitionConfig));
    this.dataProviders.set(getTransitionDataProviders(nextTransitionConfig));
  };

  onResetConfig = (): void => {
    this.transitionConfig.set(defaultTransitionConfig);
    this.mochartConfig.set(getTransitionMochartConfig(defaultTransitionConfig));
    this.dataProviders.set(getTransitionDataProviders(defaultTransitionConfig));
  };
}
