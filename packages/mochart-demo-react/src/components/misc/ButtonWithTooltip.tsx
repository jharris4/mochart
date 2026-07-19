import React from 'react';

interface Props {
  children?: React.ReactNode;
  tooltipText?: string;
  // Accepted for call-site parity; the native title attribute covers the
  // same hint without a popper-style positioning library.
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
  // tooltipPlacement is intentionally destructured out and ignored.
  const { children, tooltipText, tooltipPlacement, id, disabled, onClick, color = 'secondary', label, pressed, ...buttonProps } = props;

  return (
    <span className="button-with-tooltip">
      <button id={id} type="button" className={`btn btn-${color}` + (pressed ? ' active' : '')}
        disabled={disabled} title={tooltipText}
        aria-pressed={pressed === void 0 ? void 0 : pressed} onClick={onClick}
        {...(buttonProps as Record<string, unknown>)}>
        {children}{label ? <span className="btn-label">{label}</span> : null}
      </button>
    </span>
  );
}
