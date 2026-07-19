import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

import { buildShareUrl, demoText } from '@mochart/demo-common';
import type { ShareState } from '@mochart/demo-common';

import ButtonWithTooltip from './ButtonWithTooltip';

// Copies a share link for the current chart: the single-demo URL plus the
// current config and data encoded in the hash (see demo-common shareState).
interface Props {
  idPrefix: string;
  getShareState: () => ShareState;
  disabled?: boolean;
}

const copiedFeedbackMs = 1500;

export default function ShareButton({ idPrefix, getShareState, disabled = false }: Props) {
  const [copied, setCopied] = useState(false);
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (revertTimer.current !== null) {
      clearTimeout(revertTimer.current);
    }
  }, []);

  const onClick = () => {
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
  };

  return (
    <div className="btn-group">
      <ButtonWithTooltip id={idPrefix + "-share"} disabled={disabled} label={demoText.shareButton.label}
        tooltipText={copied ? demoText.shareButton.tooltipCopied : demoText.shareButton.tooltip} tooltipPlacement="top-start"
        onClick={onClick} aria-label={demoText.shareButton.aria}>
        <Icon size="lg" fixedWidth={true} name={copied ? "check" : "link"} />
      </ButtonWithTooltip>
    </div>
  );
}
