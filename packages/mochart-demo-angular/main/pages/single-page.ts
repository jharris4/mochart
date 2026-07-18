import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';

import demoData from 'mochart-demo-data';

import { DemoSingle } from '../../src/components/single/demo-single';
import { createDemoNavigation, isKnownDemo } from './navigation';

@Component({
  selector: 'app-single-page',
  imports: [DemoSingle],
  styles: [':host { display: contents; }'],
  template: `
    @if (!knownDemo) {
      <div>No demo found for id: {{ demoId }}</div>
    } @else {
      <app-demo-single [demoData]="demoData" [initialDemoId]="demoId" [demoMode]="'single'"
                       [onDemoModeChanged]="nav.onDemoModeChanged" [onDemoChanged]="onDemoChanged" />
    }
  `
})
export class SinglePage {
  /** Bound from the :demoId route param (withComponentInputBinding). */
  @Input({ required: true }) demoId!: string;

  readonly demoData = demoData;
  readonly nav = createDemoNavigation(inject(Router));
  readonly onDemoChanged = this.nav.makeOnDemoChanged('single');

  get knownDemo(): boolean {
    return isKnownDemo(this.demoId);
  }
}
