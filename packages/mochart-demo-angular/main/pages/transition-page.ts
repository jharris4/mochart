import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { DemoTransition } from '../../src/components/transition/demo-transition';
import { createDemoNavigation, siteRootUrl } from './navigation';

@Component({
  selector: 'app-transition-page',
  imports: [DemoTransition],
  styles: [':host { display: contents; }'],
  template: '<app-demo-transition [siteRootUrl]="siteRootUrl" [onBackToDemos]="nav.onBackToDemos" />'
})
export class TransitionPage {
  readonly siteRootUrl = siteRootUrl;
  readonly nav = createDemoNavigation(inject(Router));
}
