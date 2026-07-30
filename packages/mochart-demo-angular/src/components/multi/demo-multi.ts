import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { demoText } from '@mochart/demo-common';

import { ChartsTab } from './charts-tab';
import { ErrorTab } from '../misc/error-tab';
import { BackToDemosButton, ModeSwitcher, SiteRootButton, ThemeToggleButton } from '../misc/mode-switcher';
import { NotesMenu } from '../misc/notes-menu';

import type { DemoData, SwitchableDemoMode } from '../../types';

@Component({
  selector: 'app-demo-multi',
  imports: [ChartsTab, ErrorTab, BackToDemosButton, ModeSwitcher, NotesMenu, SiteRootButton, ThemeToggleButton],
  styles: [':host { display: contents; }'],
  template: `
    <div class="mochart-demo-container multi">
      <div class="mochart-demo-tabs-container">
        <div class="mochart-demo-nav-group">
          @if (siteRootUrl !== undefined) {
            <a appSiteRootButton [href]="siteRootUrl"></a>
          }
          <button appBackToDemosButton (click)="onBackToDemos()"></button>
          <ul class="demo-tabs">
            <li class="demo-tab-item">
              <button type="button" class="demo-tab active">{{ text.chart }}</button>
            </li>
          </ul>
          <app-notes-menu [demoTitle]="demoData.demoObjectMap[initialDemoId].title" [notes]="demoData.demoObjectMap[initialDemoId].notes" />
        </div>
        <div class="mochart-demo-nav-group">
          <app-mode-switcher [demoMode]="'multi'" [onModeChanged]="onModeChanged" />
          <button appThemeToggleButton></button>
        </div>
      </div>
      <div class="mochart-demo-content-pane">
        <div class="mochart-demo-content">
          <app-error-tab [active]="true">
            <app-charts-tab [active]="true" [demoObject]="demoData.demoObjectMap[demoId()]" />
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
