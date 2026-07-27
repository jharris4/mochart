import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { DemoSparkline } from '../../src/components/sparkline/demo-sparkline';
import { createDemoNavigation, siteRootUrl } from './navigation';

@Component({
  selector: 'app-sparkline-page',
  imports: [DemoSparkline],
  styles: [':host { display: contents; }'],
  template: '<app-demo-sparkline [siteRootUrl]="siteRootUrl" [onBackToDemos]="nav.onBackToDemos" />'
})
export class SparklinePage {
  readonly siteRootUrl = siteRootUrl;
  readonly nav = createDemoNavigation(inject(Router));
}
