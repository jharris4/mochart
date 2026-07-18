import { exportPNG, exportSVG } from '@mochart/export';

import { buttonWithTooltip, el, icon } from './dom';
import type { ButtonHandle } from './dom';

// Download buttons for the chart found inside the container element
// (mochart-export locates the chart svg itself).
export interface ExportButtonsHandle {
  el: HTMLElement;
  setDisabled(disabled: boolean): void;
}

export function exportButtons(
  idPrefix: string,
  getContainer: () => Element | null,
  disabled = false
): ExportButtonsHandle {
  const png: ButtonHandle = buttonWithTooltip({
    id: idPrefix + '-export-png',
    disabled,
    label: 'PNG',
    tooltipText: 'Download the chart as a PNG image',
    ariaLabel: 'Export PNG',
    onClick: () => {
      const container = getContainer();
      if (container) {
        void exportPNG(container);
      }
    },
    content: [icon('file-image', { size: 'lg', fixedWidth: true })]
  });
  const svg: ButtonHandle = buttonWithTooltip({
    id: idPrefix + '-export-svg',
    disabled,
    label: 'SVG',
    tooltipText: 'Download the chart as an SVG image',
    ariaLabel: 'Export SVG',
    onClick: () => {
      const container = getContainer();
      if (container) {
        exportSVG(container);
      }
    },
    content: [icon('file-code', { size: 'lg', fixedWidth: true })]
  });

  return {
    el: el('div', { className: 'btn-group' }, [png.el, svg.el]),
    setDisabled(nextDisabled: boolean) {
      png.setDisabled(nextDisabled);
      svg.setDisabled(nextDisabled);
    }
  };
}
