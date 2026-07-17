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
  [key: string]: unknown;
}

export default function ButtonWithTooltip(props: Props) {
  const { children, tooltipText, tooltipPlacement, id, disabled, onClick, ...buttonProps } = props;
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
      <Button id={id} disabled={disabled} onClick={handleClick} {...(buttonProps as Record<string, unknown>)}>
        {children}
      </Button>
      {tooltip}
    </span>
  );
}
