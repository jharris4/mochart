import { Component, Input } from '@angular/core';

/**
 * Font Awesome 6 solid icon (css classes only), the Angular equivalent of the
 * react demo's react-fontawesome shim. Relies on the
 * `@fortawesome/fontawesome-free` css being imported.
 */
@Component({
  selector: 'app-icon',
  styles: [':host { display: contents; }'],
  template: '<span aria-hidden="true" [class]="classes"></span>'
})
export class Icon {
  @Input({ required: true }) name!: string;
  @Input() size?: string;
  @Input() fixedWidth = false;
  @Input() flip?: string;

  get classes(): string {
    const list = ['fa-solid', `fa-${this.name}`];
    if (this.size) {
      list.push(`fa-${this.size}`);
    }
    if (this.fixedWidth) {
      list.push('fa-fw');
    }
    if (this.flip) {
      list.push(`fa-flip-${this.flip}`);
    }
    return list.join(' ');
  }
}
