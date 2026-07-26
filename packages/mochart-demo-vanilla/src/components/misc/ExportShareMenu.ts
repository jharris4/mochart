import { buildShareUrl, demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import { el, icon } from './dom';

// A collapsed export/share menu placed at the end of each mode's controls row.
// The trigger uses a share icon; the menu holds PNG / SVG downloads and (when a
// share state is provided) a copy-share-link item. The caller supplies the
// export actions so this component stays agnostic about single vs. tiled charts.
//
// The controls strips (and chart panes) use `overflow: hidden`, which would
// clip a normal absolutely-positioned dropdown that opens upward over the
// chart — and the chart's transparent interaction rect would steal clicks. So
// the menu is positioned `fixed` (measured from the trigger) at a high z-index,
// which escapes ancestor clipping and stacks above the chart.
export interface ExportShareMenuProps {
  idPrefix: string;
  exportPng: () => void;
  exportSvg: () => void;
  /** Omit to hide the Share item (e.g. a chart whose state isn't shareable). */
  getShareState?: () => ShareState;
  disabled?: boolean;
}

export interface ExportShareMenuHandle {
  el: HTMLElement;
  setDisabled(disabled: boolean): void;
  destroy(): void;
}

const copiedFeedbackMs = 1500;
const menuGap = 4;

export function exportShareMenu(props: ExportShareMenuProps): ExportShareMenuHandle {
  const { idPrefix, exportPng, exportSvg, getShareState } = props;

  let open = false;
  let copied = false;
  let revertTimer: ReturnType<typeof setTimeout> | null = null;

  const trigger = el('button', {
    id: idPrefix + '-export-share',
    className: 'demo-btn demo-btn-secondary demo-menu-trigger',
    attrs: {
      type: 'button',
      'aria-haspopup': 'true',
      'aria-expanded': 'false',
      title: demoText.exportShareMenu.trigger.tooltip,
      'aria-label': demoText.exportShareMenu.trigger.aria
    }
  }, [icon('share-nodes', { size: 'lg', fixedWidth: true })]);
  trigger.disabled = props.disabled ?? false;
  trigger.addEventListener('click', () => toggle());

  const pngItem = el('button', {
    className: 'demo-menu-item',
    attrs: { type: 'button', 'aria-label': demoText.exportButtons.png.aria }
  }, [
    icon('file-image', { fixedWidth: true }), ' ',
    el('span', { className: 'mochart-menu-item-label', text: demoText.exportButtons.png.label })
  ]);
  pngItem.addEventListener('click', () => runAndClose(exportPng));

  const svgItem = el('button', {
    className: 'demo-menu-item',
    attrs: { type: 'button', 'aria-label': demoText.exportButtons.svg.aria }
  }, [
    icon('file-code', { fixedWidth: true }), ' ',
    el('span', { className: 'mochart-menu-item-label', text: demoText.exportButtons.svg.label })
  ]);
  svgItem.addEventListener('click', () => runAndClose(exportSvg));

  const menu = el('div', { className: 'demo-menu' }, [pngItem, svgItem]);

  // Share item is only mounted when the caller offers a share state.
  let shareItem: HTMLButtonElement | null = null;
  let shareIconEl: HTMLSpanElement | null = null;
  let shareLabelSpan: HTMLSpanElement | null = null;
  if (getShareState) {
    shareIconEl = icon('link', { fixedWidth: true });
    shareLabelSpan = el('span', { className: 'mochart-menu-item-label', text: demoText.shareButton.label });
    shareItem = el('button', {
      className: 'demo-menu-item',
      attrs: { type: 'button', 'aria-label': demoText.shareButton.aria }
    }, [shareIconEl, ' ', shareLabelSpan]);
    shareItem.addEventListener('click', onShare);
    menu.append(el('div', { className: 'demo-menu-divider' }), shareItem);
  }

  const root = el('div', { className: 'demo-btn-group demo-menu-up mochart-export-share-menu' }, [trigger, menu]);

  function renderShare(): void {
    if (shareItem === null || shareIconEl === null || shareLabelSpan === null) {
      return;
    }
    const nextIcon = icon(copied ? 'check' : 'link', { fixedWidth: true });
    shareItem.replaceChild(nextIcon, shareIconEl);
    shareIconEl = nextIcon;
    shareLabelSpan.textContent = copied ? demoText.shareButton.tooltipCopied : demoText.shareButton.label;
  }

  // Anchor the fixed menu just above the trigger's top-right corner, so it
  // opens upward and right-aligned; measured before it is shown to avoid a flash.
  function positionMenu(): void {
    const rect = trigger.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.bottom = (window.innerHeight - rect.top + menuGap) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';
    menu.style.margin = '0';
    menu.style.zIndex = '1080';
  }

  function openMenu(): void {
    if (open) {
      return;
    }
    open = true;
    positionMenu();
    menu.classList.add('open');
    trigger.classList.add('active');
    trigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    // A fixed menu would drift on scroll/resize; just close it instead.
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
  }

  function closeMenu(): void {
    if (!open) {
      return;
    }
    open = false;
    menu.classList.remove('open');
    trigger.classList.remove('active');
    trigger.setAttribute('aria-expanded', 'false');
    menu.removeAttribute('style');
    document.removeEventListener('mousedown', onDocMouseDown);
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('scroll', onReflow, true);
    window.removeEventListener('resize', onReflow);
  }

  function toggle(): void {
    if (open) {
      closeMenu();
    }
    else {
      openMenu();
    }
  }

  function onDocMouseDown(event: MouseEvent): void {
    if (!root.contains(event.target as Node)) {
      closeMenu();
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      closeMenu();
    }
  }

  function onReflow(): void {
    closeMenu();
  }

  function runAndClose(action: () => void): void {
    action();
    closeMenu();
  }

  function onShare(): void {
    if (!getShareState) {
      return;
    }
    const url = buildShareUrl(getShareState());
    navigator.clipboard.writeText(url).then(() => {
      copied = true;
      renderShare();
      if (revertTimer !== null) {
        clearTimeout(revertTimer);
      }
      revertTimer = setTimeout(() => {
        copied = false;
        renderShare();
        revertTimer = null;
      }, copiedFeedbackMs);
    }, () => {
      // Clipboard access can be unavailable (e.g. insecure context); let the
      // user copy the link manually instead of failing silently.
      window.prompt(demoText.shareButton.tooltip, url);
    });
    closeMenu();
  }

  return {
    el: root,
    setDisabled(disabled: boolean) {
      trigger.disabled = disabled;
      if (disabled) {
        closeMenu();
      }
    },
    destroy() {
      closeMenu();
      if (revertTimer !== null) {
        clearTimeout(revertTimer);
        revertTimer = null;
      }
    }
  };
}
