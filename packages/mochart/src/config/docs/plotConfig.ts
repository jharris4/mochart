import { style, spacing } from './shared';

export default function getDescriptions() {
  return {
    inverted: 'whether the group axis should be left to right (false) or top to bottom (true)',
    margin: spacing('the margin (in pixels) for the top, right, bottom and left sides of the plot'),
    padding: spacing('the padding (in pixels) for the top, right, bottom and left sides of the plot'),
    backgroundStyle: style('the styles to apply to the plot background (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))')
  };
}
