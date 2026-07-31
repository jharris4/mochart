import { formatData } from '@mochart/demo-common';

import { Component, Input, signal } from '@angular/core';
import type { OnChanges, OnInit, SimpleChanges } from '@angular/core';

import { TextAreaContent } from '../misc/text-area-content';

@Component({
  selector: 'app-random-data-tab',
  imports: [TextAreaContent],
  styles: [':host { display: contents; }'],
  template: `
    <div [class]="'mochart-demo-tab-container demo-layout-col data' + (active ? ' active' : '')" [attr.inert]="active ? null : ''">
      <div class="mochart-demo-tab-content">
        <app-text-area-content [value]="dataText()" [onChange]="noop" />
      </div>
    </div>
  `
})
export class RandomDataTab implements OnInit, OnChanges {
  @Input() active = false;
  @Input({ required: true }) data: unknown;

  dataText = signal('');

  noop = (): void => {};

  ngOnInit(): void {
    this.dataText.set(formatData(this.data));
  }

  ngOnChanges(changes: SimpleChanges): void {
    const dataChange = changes['data'];
    if (dataChange && !dataChange.firstChange) {
      this.dataText.set(formatData(this.data));
    }
  }
}
