// Font Awesome 6 solid icon (css classes only), the React equivalent of the
// svelte/vue demos' Icon component. Relies on the
// `@fortawesome/fontawesome-free` css being imported.
interface IconProps {
  name: string;
  size?: string;
  fixedWidth?: boolean;
  flip?: string;
}

export default function Icon({ name, size, fixedWidth, flip }: IconProps) {
  const classes = ['fa-solid', `fa-${name}`];
  if (size) {
    classes.push(`fa-${size}`);
  }
  if (fixedWidth) {
    classes.push('fa-fw');
  }
  if (flip) {
    classes.push(`fa-flip-${flip}`);
  }
  return <span aria-hidden="true" className={classes.join(' ')} />;
}
