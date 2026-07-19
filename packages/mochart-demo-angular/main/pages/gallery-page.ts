import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import demoData from '@mochart/demo-data';

import { DemoGallery } from '../../src/components/gallery/demo-gallery';
import { navigate, siteRootUrl } from './navigation';

@Component({
  selector: 'app-gallery-page',
  imports: [DemoGallery],
  styles: [':host { display: contents; }'],
  template: `
    <app-demo-gallery [demoData]="demoData" [siteRootUrl]="siteRootUrl"
                      [onOpenDemo]="onOpenDemo" [onOpenPage]="onOpenPage" />
  `
})
export class GalleryPage {
  private readonly router = inject(Router);

  readonly demoData = demoData;
  readonly siteRootUrl = siteRootUrl;

  onOpenDemo = (demoId: string): void => {
    navigate(this.router, ['/single', demoId]);
  };

  onOpenPage = (mode: 'transition' | 'rotation'): void => {
    navigate(this.router, ['/', mode]);
  };
}
