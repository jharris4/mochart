import { Component, Input } from '@angular/core';

import { exportPNG, exportSVG } from '@mochart/export';

import { ButtonWithTooltip } from './button-with-tooltip';
import { Icon } from './icon';

/**
 * Download buttons for the chart found inside the container element
 * (mochart-export locates the chart svg itself).
 */
@Component({
  selector: 'app-export-buttons',
  imports: [ButtonWithTooltip, Icon],
  styles: [':host { display: contents; }'],
  template: `
    <div class="btn-group">
      <app-button-with-tooltip [id]="idPrefix + '-export-png'" [disabled]="disabled" label="PNG"
                               tooltipText="Download the chart as a PNG image" tooltipPlacement="top-start"
                               [onClick]="onExportPng" aria-label="Export PNG">
        <app-icon size="lg" [fixedWidth]="true" name="file-image" />
      </app-button-with-tooltip>
      <app-button-with-tooltip [id]="idPrefix + '-export-svg'" [disabled]="disabled" label="SVG"
                               tooltipText="Download the chart as an SVG image" tooltipPlacement="top-start"
                               [onClick]="onExportSvg" aria-label="Export SVG">
        <app-icon size="lg" [fixedWidth]="true" name="file-code" />
      </app-button-with-tooltip>
    </div>
  `
})
export class ExportButtons {
  @Input({ required: true }) idPrefix!: string;
  @Input({ required: true }) getContainer!: () => Element | null;
  @Input() disabled = false;

  onExportPng = (): void => {
    const container = this.getContainer();
    if (container) {
      void exportPNG(container);
    }
  };

  onExportSvg = (): void => {
    const container = this.getContainer();
    if (container) {
      exportSVG(container);
    }
  };
}
