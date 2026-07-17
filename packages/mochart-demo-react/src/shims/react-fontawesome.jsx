import React from 'react';

/**
 * Minimal replacement for the old `react-fontawesome` component (Font Awesome 4
 * css classes). Relies on the `font-awesome` package's css being imported.
 */
export default function FontAwesome(props) {
  const { name, size, fixedWidth, spin, pulse, flip, rotate, stack, inverse, border, className, ...rest } = props;
  const classes = ['fa', `fa-${name}`];
  if (size) classes.push(`fa-${size}`);
  if (fixedWidth) classes.push('fa-fw');
  if (spin) classes.push('fa-spin');
  if (pulse) classes.push('fa-pulse');
  if (flip) classes.push(`fa-flip-${flip}`);
  if (rotate) classes.push(`fa-rotate-${rotate}`);
  if (stack) classes.push(`fa-stack-${stack}`);
  if (inverse) classes.push('fa-inverse');
  if (border) classes.push('fa-border');
  if (className) classes.push(className);
  return <span aria-hidden="true" {...rest} className={classes.join(' ')} />;
}
