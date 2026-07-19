import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

import demoData from '@mochart/demo-data';

import { DemoMulti } from '../../src/components/multi/demo-multi';
import { createDemoNavigation, isKnownDemo, siteRootUrl } from './navigation';

@Component({
  selector: 'app-multi-page',
  imports: [DemoMulti],
  styles: [':host { display: contents; }'],
  template: `
    @if (!knownDemo) {
      <div>No demo found for id: {{ demoId }}</div>
    } @else {
      <app-demo-multi [demoData]="demoData" [initialDemoId]="demoId" [siteRootUrl]="siteRootUrl"
                      [onModeChanged]="onModeChanged" [onBackToDemos]="nav.onBackToDemos" />
    }
  `
})
export class MultiPage {
  /** Bound from the :demoId route param (withComponentInputBinding). */
  @Input({ required: true }) demoId!: string;

  readonly demoData = demoData;
  readonly siteRootUrl = siteRootUrl;
  readonly nav = createDemoNavigation(inject(Router));
  readonly onModeChanged = this.nav.makeOnModeChanged(() => this.demoId);

  get knownDemo(): boolean {
    return isKnownDemo(this.demoId);
  }
}
