import type { ReactiveController, ReactiveControllerHost } from 'lit';

import { isPhoneViewport, watchPhoneViewport } from '@mochart/demo-common';

/**
 * Tracks whether the viewport is phone-width (see demo-common's viewport
 * policy), re-rendering the host when it crosses the breakpoint. A controller
 * rather than per-element listener bookkeeping, like ElementSizeController.
 */
export class PhoneViewportController implements ReactiveController {
  isPhone = isPhoneViewport();

  private host: ReactiveControllerHost;
  private unwatch: (() => void) | null = null;

  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  hostConnected(): void {
    // Re-read on connect: the width may have changed while detached.
    this.isPhone = isPhoneViewport();
    this.unwatch = watchPhoneViewport(isPhone => {
      this.isPhone = isPhone;
      this.host.requestUpdate();
    });
  }

  hostDisconnected(): void {
    this.unwatch?.();
    this.unwatch = null;
  }
}
