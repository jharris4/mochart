import { exportPNG, exportSVG } from '@mochart/export';

import { demoText } from '@mochart/demo-common';

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
    label: demoText.exportButtons.png.label,
    tooltipText: demoText.exportButtons.png.tooltip,
    ariaLabel: demoText.exportButtons.png.aria,
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
    label: demoText.exportButtons.svg.label,
    tooltipText: demoText.exportButtons.svg.tooltip,
    ariaLabel: demoText.exportButtons.svg.aria,
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
