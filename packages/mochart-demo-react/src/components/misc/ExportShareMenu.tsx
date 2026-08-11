import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

import { buildShareUrl, demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import { useMenu } from './useMenu';

// A collapsed export/share menu placed at the end of each mode's controls row.
// The trigger uses a share icon; the menu holds PNG / SVG downloads and (when a
// share state is provided) a copy-share-link item. The parent supplies the
// export actions so this component stays agnostic about single vs. tiled charts.
//
// Positioning, dismissal, focus return and the disclosure ARIA come from
// `useMenu` (demo-common's menu geometry + dismissal under react state) —
// including the reason any of it is hand-rolled: the controls strips clip an
// absolutely-positioned dropdown, and the chart's interaction rect eats clicks
// through anything stacked below it. What stays here is what the hook does not
// know about: the items, the copied-link feedback, and `disabled`.
interface Props {
  exportPng: () => void;
  exportSvg: () => void;
  /** Omit to hide the Share item (e.g. a chart whose state isn't shareable). */
  getShareState?: () => ShareState;
  disabled?: boolean;
  /**
   * The hosting pane's active state. A deactivated pane is only marked inert,
   * and an open panel is `position: fixed` — it would keep painting over the
   * pane that replaced this one. False closes the menu.
   */
  active?: boolean;
}

const copiedFeedbackMs = 1500;

export default function ExportShareMenu({ exportPng, exportSvg, getShareState, disabled = false, active = true }: Props) {
  const [copied, setCopied] = useState(false);
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Opens upward (the controls row sits at the bottom of the pane) and
  // right-aligned (the trigger is the last control in the row).
  const menu = useMenu({ placement: { side: 'top', align: 'end', gap: 4 } });
  const { close } = menu;

  // A disabled trigger fires no click, so the menu cannot be opened — but one
  // already open when its trigger is disabled would be stranded.
  useEffect(() => {
    if (disabled || !active) {
      close();
    }
  }, [disabled, active, close]);

  useEffect(() => () => {
    if (revertTimer.current !== null) {
      clearTimeout(revertTimer.current);
    }
  }, []);

  const runAndClose = (action: () => void) => {
    action();
    close();
  };

  const onShare = () => {
    if (!getShareState) {
      return;
    }
    const url = buildShareUrl(getShareState());
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      if (revertTimer.current !== null) {
        clearTimeout(revertTimer.current);
      }
      revertTimer.current = setTimeout(() => setCopied(false), copiedFeedbackMs);
    }, () => {
      // Clipboard access can be unavailable (e.g. insecure context); let the
      // user copy the link manually instead of failing silently.
      window.prompt(demoText.shareButton.tooltip, url);
    });
    close();
  };

  return (
    <div className="demo-btn-group demo-menu-up mochart-export-share-menu">
      <button type="button" ref={menu.triggerRef} {...menu.triggerProps}
        className={'demo-btn demo-btn-secondary demo-menu-trigger' + (menu.open ? ' active' : '')}
        disabled={disabled}
        title={demoText.exportShareMenu.trigger.tooltip} aria-label={demoText.exportShareMenu.trigger.aria}>
        <Icon size="lg" fixedWidth={true} name="share-nodes" />
      </button>
      <div ref={menu.panelRef} {...menu.panelProps}
        className={'demo-menu' + (menu.isPositioned ? ' open' : '')}>
        <button type="button" className="demo-menu-item" onClick={() => runAndClose(exportPng)}
          aria-label={demoText.exportButtons.png.aria}>
          <Icon fixedWidth={true} name="file-image" /> <span className="mochart-menu-item-label">{demoText.exportButtons.png.label}</span>
        </button>
        <button type="button" className="demo-menu-item" onClick={() => runAndClose(exportSvg)}
          aria-label={demoText.exportButtons.svg.aria}>
          <Icon fixedWidth={true} name="file-code" /> <span className="mochart-menu-item-label">{demoText.exportButtons.svg.label}</span>
        </button>
        {getShareState ? (
          <React.Fragment>
            <div className="demo-menu-divider" />
            <button type="button" className="demo-menu-item" onClick={onShare}
              aria-label={demoText.shareButton.aria}>
              <Icon fixedWidth={true} name={copied ? 'check' : 'link'} /> <span className="mochart-menu-item-label">{copied ? demoText.shareButton.tooltipCopied : demoText.shareButton.label}</span>
            </button>
          </React.Fragment>
        ) : null}
      </div>
    </div>
  );
}
