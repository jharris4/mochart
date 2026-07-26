import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Icon from './Icon';

import { buildShareUrl, demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

// A collapsed export/share menu placed at the end of each mode's controls row.
// The trigger uses a share icon; the menu holds PNG / SVG downloads and (when a
// share state is provided) a copy-share-link item. The parent supplies the
// export actions so this component stays agnostic about single vs. tiled charts.
//
// The controls strips (and chart panes) use `overflow: hidden`, which would
// clip a normal absolutely-positioned dropdown that opens upward over the
// chart — and the chart's transparent interaction rect would steal clicks. So
// the menu is positioned `fixed` (measured from the trigger) at a high z-index,
// which escapes ancestor clipping and stacks above the chart.
interface Props {
  idPrefix: string;
  exportPng: () => void;
  exportSvg: () => void;
  /** Omit to hide the Share item (e.g. a chart whose state isn't shareable). */
  getShareState?: () => ShareState;
  disabled?: boolean;
}

const copiedFeedbackMs = 1500;
const menuGap = 4;

export default function ExportShareMenu({ idPrefix, exportPng, exportSvg, getShareState, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coords, setCoords] = useState<{ bottom: number; right: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Anchor the fixed menu just above the trigger's top-right corner, so it
  // opens upward and right-aligned. Measured before paint to avoid a flash.
  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({
        bottom: window.innerHeight - rect.top + menuGap,
        right: window.innerWidth - rect.right
      });
    }
  }, [open]);

  // Close on an outside click or Escape while the menu is open.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onDocMouseDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    // A fixed menu would drift on scroll/resize; just close it instead.
    const onReflow = () => setOpen(false);
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [open]);

  useEffect(() => () => {
    if (revertTimer.current !== null) {
      clearTimeout(revertTimer.current);
    }
  }, []);

  const runAndClose = (action: () => void) => {
    action();
    setOpen(false);
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
    setOpen(false);
  };

  const menuOpen = open && coords !== null;

  return (
    <div className="demo-btn-group demo-menu-up mochart-export-share-menu" ref={rootRef}>
      <button id={idPrefix + '-export-share'} type="button" ref={triggerRef}
        className={'demo-btn demo-btn-secondary demo-menu-trigger' + (open ? ' active' : '')}
        disabled={disabled} aria-haspopup="true" aria-expanded={open}
        title={demoText.exportShareMenu.trigger.tooltip} aria-label={demoText.exportShareMenu.trigger.aria}
        onClick={() => setOpen(prev => !prev)}>
        <Icon size="lg" fixedWidth={true} name="share-nodes" />
      </button>
      <div className={'demo-menu' + (menuOpen ? ' open' : '')}
        style={menuOpen ? { position: 'fixed', bottom: coords.bottom, right: coords.right, margin: 0, zIndex: 1080 } : void 0}>
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
