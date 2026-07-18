import { Component, Input } from '@angular/core';

/**
 * The react demo used reactstrap's Tooltip; the native title attribute
 * covers the same hint here without a popper-style positioning library.
 * tooltipPlacement is accepted for call-site parity but unused. `label`
 * renders visible text beside the icon; `pressed` marks the button as a
 * toggle (aria-pressed + active styling). The aria-label lands on the
 * button element via the `aria-label` input alias.
 */
@Component({
  selector: 'app-button-with-tooltip',
  styles: [':host { display: contents; }'],
  template: `
    <span class="button-with-tooltip">
      <button [id]="id" type="button" [class]="'btn btn-' + color + (pressed ? ' active' : '')"
              [disabled]="disabled" [attr.title]="tooltipText ?? null"
              [attr.aria-pressed]="pressed === undefined ? null : pressed"
              [attr.aria-label]="ariaLabel ?? null" (click)="onClick()">
        <ng-content />@if (label) {<span class="btn-label">{{ label }}</span>}
      </button>
    </span>
  `
})
export class ButtonWithTooltip {
  @Input({ required: true }) id!: string;
  @Input() tooltipText?: string;
  @Input() tooltipPlacement?: string;
  @Input() disabled = false;
  @Input({ required: true }) onClick!: () => void;
  @Input() color = 'secondary';
  @Input() label?: string;
  @Input() pressed?: boolean;
  @Input('aria-label') ariaLabel?: string;
}
