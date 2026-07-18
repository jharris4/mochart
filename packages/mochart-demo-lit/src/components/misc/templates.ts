import { html, nothing } from 'lit';
import type { TemplateResult } from 'lit';

// Stateless building blocks kept as plain lit-html template functions rather
// than custom elements — the natural Lit altitude for the Vue demo's Icon /
// ButtonWithTooltip / TextAreaContent components.

interface IconProps {
  name: string;
  size?: string;
  fixedWidth?: boolean;
  flip?: string;
}

/**
 * Font Awesome 4 icon (css classes only), same as the Vue demo's Icon
 * component. Relies on the `font-awesome` package's css being imported.
 */
export function icon({ name, size, fixedWidth, flip }: IconProps): TemplateResult {
  const list = ['fa', `fa-${name}`];
  if (size) {
    list.push(`fa-${size}`);
  }
  if (fixedWidth) {
    list.push('fa-fw');
  }
  if (flip) {
    list.push(`fa-flip-${flip}`);
  }
  return html`<span aria-hidden="true" class=${list.join(' ')}></span>`;
}

interface ButtonWithTooltipProps {
  id: string;
  tooltipText?: string;
  tooltipPlacement?: string;
  disabled?: boolean;
  onClick: () => void;
  color?: string;
  ariaLabel?: string;
}

/**
 * The react demo used reactstrap's Tooltip; the native title attribute
 * covers the same hint here without a popper-style positioning library.
 * tooltipPlacement is accepted for call-site parity but unused.
 */
export function buttonWithTooltip(
  { id, tooltipText, disabled = false, onClick, color = 'secondary', ariaLabel }: ButtonWithTooltipProps,
  children: unknown
): TemplateResult {
  return html`<span class="button-with-tooltip">
    <button id=${id} type="button" class=${`btn btn-${color}`} ?disabled=${disabled}
            title=${tooltipText ?? nothing} aria-label=${ariaLabel ?? nothing} @click=${() => onClick()}>
      ${children}
    </button>
  </span>`;
}

interface TextAreaContentProps {
  value: string;
  onChange: (value: string) => void;
}

/** The sized textarea the config/data editor tabs share (css in demo.css). */
export function textAreaContent({ value, onChange }: TextAreaContentProps): TemplateResult {
  return html`<div class="text-area-content">
    <textarea .value=${value} @input=${(event: Event) => onChange((event.currentTarget as HTMLTextAreaElement).value)}></textarea>
  </div>`;
}
