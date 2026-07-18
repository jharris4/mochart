import { Component, Input } from '@angular/core';

import { exportPNG, exportSVG } from '@mochart/export';

import { demoText } from '@mochart/demo-common';

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
      <app-button-with-tooltip [id]="idPrefix + '-export-png'" [disabled]="disabled" [label]="text.png.label"
                               [tooltipText]="text.png.tooltip" tooltipPlacement="top-start"
                               [onClick]="onExportPng" [aria-label]="text.png.aria">
        <app-icon size="lg" [fixedWidth]="true" name="file-image" />
      </app-button-with-tooltip>
      <app-button-with-tooltip [id]="idPrefix + '-export-svg'" [disabled]="disabled" [label]="text.svg.label"
                               [tooltipText]="text.svg.tooltip" tooltipPlacement="top-start"
                               [onClick]="onExportSvg" [aria-label]="text.svg.aria">
        <app-icon size="lg" [fixedWidth]="true" name="file-code" />
      </app-button-with-tooltip>
    </div>
  `
})
export class ExportButtons {
  readonly text = demoText.exportButtons;

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
