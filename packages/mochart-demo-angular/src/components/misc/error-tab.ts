import { Component, Input } from '@angular/core';

/**
 * Structural stand-in for the react demo's ErrorTab error boundary. Angular
 * has no subtree error capture (errors reach the global ErrorHandler), so
 * this wrapper only preserves the call-site structure shared with the other
 * framework ports; `active` is accepted for parity. The :host display keeps
 * the projected tab pane a direct flex child of the surrounding content.
 */
@Component({
  selector: 'app-error-tab',
  styles: [':host { display: contents; }'],
  template: '<ng-content />'
})
export class ErrorTab {
  @Input() active = false;
}
