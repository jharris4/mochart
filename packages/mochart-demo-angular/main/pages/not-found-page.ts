import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  styles: [':host { display: contents; }'],
  template: '<div>No route found matching {{ path }}</div>'
})
export class NotFoundPage {
  private readonly router = inject(Router);

  get path(): string {
    return this.router.url;
  }
}
