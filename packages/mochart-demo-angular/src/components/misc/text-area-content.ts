import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-text-area-content',
  styles: [
    ':host { display: contents; }',
    /* No JS measurement needed for the pane; plain css sizing sets the
       textarea dimensions here. */
    '.text-area-content { display: flex; flex: 1 1 auto; width: 100%; min-width: 0; min-height: 0; }',
    'textarea { width: 100%; height: 100%; resize: none; }'
  ],
  template: `
    <div class="text-area-content">
      <textarea [value]="value" (input)="onInput($event)"></textarea>
    </div>
  `
})
export class TextAreaContent {
  @Input({ required: true }) value!: string;
  @Input({ required: true }) onChange!: (value: string) => void;

  onInput(event: Event): void {
    this.onChange((event.currentTarget as HTMLTextAreaElement).value);
  }
}
