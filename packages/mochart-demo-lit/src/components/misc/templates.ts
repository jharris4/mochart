import { html, nothing } from 'lit';
import type { TemplateResult } from 'lit';

import { exportPNG, exportSVG } from '@mochart/export';

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
 * Font Awesome 6 solid icon (css classes only), same as the Vue demo's Icon
 * component. Relies on the `@fortawesome/fontawesome-free` css being imported.
 */
export function icon({ name, size, fixedWidth, flip }: IconProps): TemplateResult {
  const list = ['fa-solid', `fa-${name}`];
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
  // `label` renders visible text beside the icon; `pressed` marks the button
  // as a toggle (aria-pressed + active styling).
  label?: string;
  pressed?: boolean;
}

/**
 * The react demo used reactstrap's Tooltip; the native title attribute
 * covers the same hint here without a popper-style positioning library.
 * tooltipPlacement is accepted for call-site parity but unused.
 */
export function buttonWithTooltip(
  { id, tooltipText, disabled = false, onClick, color = 'secondary', ariaLabel, label, pressed }: ButtonWithTooltipProps,
  children: unknown
): TemplateResult {
  return html`<span class="button-with-tooltip">
    <button id=${id} type="button" class=${`btn btn-${color}` + (pressed ? ' active' : '')} ?disabled=${disabled}
            title=${tooltipText ?? nothing} aria-label=${ariaLabel ?? nothing}
            aria-pressed=${pressed === void 0 ? nothing : String(pressed)} @click=${() => onClick()}>
      ${children}${label ? html`<span class="btn-label">${label}</span>` : nothing}
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

interface ExportButtonsProps {
  idPrefix: string;
  getContainer: () => Element | null;
  disabled?: boolean;
}

/**
 * Download buttons for the chart found inside the container element
 * (mochart-export locates the chart svg itself).
 */
export function exportButtons({ idPrefix, getContainer, disabled = false }: ExportButtonsProps): TemplateResult {
  const onExportPng = () => {
    const container = getContainer();
    if (container) {
      void exportPNG(container);
    }
  };
  const onExportSvg = () => {
    const container = getContainer();
    if (container) {
      exportSVG(container);
    }
  };
  return html`<div class="btn-group">
    ${buttonWithTooltip(
      { id: idPrefix + '-export-png', disabled, label: 'PNG', tooltipText: 'Download the chart as a PNG image', tooltipPlacement: 'top-start', onClick: onExportPng, ariaLabel: 'Export PNG' },
      icon({ size: 'lg', fixedWidth: true, name: 'file-image' })
    )}
    ${buttonWithTooltip(
      { id: idPrefix + '-export-svg', disabled, label: 'SVG', tooltipText: 'Download the chart as an SVG image', tooltipPlacement: 'top-start', onClick: onExportSvg, ariaLabel: 'Export SVG' },
      icon({ size: 'lg', fixedWidth: true, name: 'file-code' })
    )}
  </div>`;
}
