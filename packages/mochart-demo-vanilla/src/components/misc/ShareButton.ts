import { buildShareUrl, demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import { buttonWithTooltip, el, icon } from './dom';
import type { ButtonHandle } from './dom';

// Copies a share link for the current chart: the single-demo URL plus the
// current config and data encoded in the hash (see demo-common shareState).
export interface ShareButtonHandle {
  el: HTMLElement;
  setDisabled(disabled: boolean): void;
}

const copiedFeedbackMs = 1500;

export function shareButton(idPrefix: string, getShareState: () => ShareState | null): ShareButtonHandle {
  let revertTimer: ReturnType<typeof setTimeout> | null = null;

  function showCopied(): void {
    button.setTooltip(demoText.shareButton.tooltipCopied);
    button.setContent([icon('check', { size: 'lg', fixedWidth: true })]);
    if (revertTimer !== null) {
      clearTimeout(revertTimer);
    }
    revertTimer = setTimeout(() => {
      button.setTooltip(demoText.shareButton.tooltip);
      button.setContent([icon('link', { size: 'lg', fixedWidth: true })]);
      revertTimer = null;
    }, copiedFeedbackMs);
  }

  function onClick(): void {
    const state = getShareState();
    if (state === null) {
      return;
    }
    const url = buildShareUrl(state);
    navigator.clipboard.writeText(url).then(showCopied, () => {
      // Clipboard access can be unavailable (e.g. insecure context); let the
      // user copy the link manually instead of failing silently.
      window.prompt(demoText.shareButton.tooltip, url);
    });
  }

  const button: ButtonHandle = buttonWithTooltip({
    id: idPrefix + '-share',
    label: demoText.shareButton.label,
    tooltipText: demoText.shareButton.tooltip,
    ariaLabel: demoText.shareButton.aria,
    onClick,
    content: [icon('link', { size: 'lg', fixedWidth: true })]
  });

  return {
    el: el('div', { className: 'btn-group' }, [button.el]),
    setDisabled(disabled: boolean) {
      button.setDisabled(disabled);
    }
  };
}
