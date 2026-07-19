import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { DemoRotation } from '../../src/components/rotation/demo-rotation';
import { createDemoNavigation, siteRootUrl } from './navigation';

@Component({
  selector: 'app-rotation-page',
  imports: [DemoRotation],
  styles: [':host { display: contents; }'],
  template: '<app-demo-rotation [siteRootUrl]="siteRootUrl" [onBackToDemos]="nav.onBackToDemos" />'
})
export class RotationPage {
  readonly siteRootUrl = siteRootUrl;
  readonly nav = createDemoNavigation(inject(Router));
}
