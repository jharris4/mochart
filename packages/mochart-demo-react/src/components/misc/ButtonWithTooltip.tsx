import React, { useState } from 'react';
import { Button, Tooltip } from 'reactstrap';

function getIsTouchDevice() {
  const win = window as unknown as { DocumentTouch?: unknown };
  return true == ("ontouchstart" in window || (win.DocumentTouch !== void 0 && document instanceof (win.DocumentTouch as never)));
}

const isTouchDevice = getIsTouchDevice();

interface Props {
  children?: React.ReactNode;
  tooltipText?: string;
  tooltipPlacement?: string;
  id?: string;
  disabled?: boolean;
  onClick?: () => void;
  color?: string;
  // `label` renders visible text beside the icon; `pressed` marks the button
  // as a toggle (aria-pressed + active styling).
  label?: string;
  pressed?: boolean;
  [key: string]: unknown;
}

export default function ButtonWithTooltip(props: Props) {
  const { children, tooltipText, tooltipPlacement, id, disabled, onClick, label, pressed, ...buttonProps } = props;
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const toggle = () => setTooltipOpen(open => !open);
  const handleClick = () => {
    setTooltipOpen(false);
    if (onClick) {
      onClick();
    }
  };

  let tooltip: React.ReactNode = false;
  if (!isTouchDevice) {
    tooltip = (
      <Tooltip placement={tooltipPlacement as never} isOpen={tooltipOpen && !disabled} target={id ?? ''} toggle={toggle} delay={{ show: 100, hide: 0 }}>
        {tooltipText}
      </Tooltip>
    );
  }

  return (
    <span className="button-with-tooltip">
      <Button id={id} disabled={disabled} onClick={handleClick} active={pressed === true}
        aria-pressed={pressed === void 0 ? void 0 : pressed} {...(buttonProps as Record<string, unknown>)}>
        {children}{label ? <span className="btn-label">{label}</span> : null}
      </Button>
      {tooltip}
    </span>
  );
}
