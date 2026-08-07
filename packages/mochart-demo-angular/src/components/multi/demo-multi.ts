import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { demoText } from '@mochart/demo-common';

import { ChartsTab } from './charts-tab';
import { ErrorTab } from '../misc/error-tab';
import { TopBar } from '../misc/top-bar';

import type { DemoData, SwitchableDemoMode } from '../../types';

@Component({
  selector: 'app-demo-multi',
  imports: [ChartsTab, ErrorTab, TopBar],
  styles: [':host { display: contents; }'],
  template: `
    <div class="mochart-demo-container multi">
      <app-top-bar [siteRootUrl]="siteRootUrl" [onBackToDemos]="onBackToDemos" [hasTabs]="true"
                   [notes]="demoData.demoObjectMap[initialDemoId]"
                   [modes]="{ demoMode: 'multi', onModeChanged }">
        <li class="demo-tab-item">
          <button type="button" class="demo-tab active">{{ text.chart }}</button>
        </li>
      </app-top-bar>
      <div class="mochart-demo-content-pane">
        <div class="mochart-demo-content">
          <app-error-tab [active]="true">
            <ng-template>
              <app-charts-tab [active]="true" [demoObject]="demoData.demoObjectMap[demoId()]" />
            </ng-template>
          </app-error-tab>
        </div>
      </div>
    </div>
  `
})
export class DemoMulti implements OnInit, OnChanges {
  @Input({ required: true }) demoData!: DemoData;
  @Input({ required: true }) initialDemoId!: string;
  @Input() siteRootUrl?: string;
  @Input({ required: true }) onModeChanged!: (nextDemoMode: SwitchableDemoMode) => void;
  @Input({ required: true }) onBackToDemos!: () => void;

  readonly text = demoText.tabs;

  demoId = signal('');

  ngOnInit(): void {
    this.demoId.set(this.initialDemoId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const initialDemoIdChange = changes['initialDemoId'];
    if (initialDemoIdChange && !initialDemoIdChange.firstChange) {
      this.demoId.set(this.initialDemoId);
    }
  }
}
