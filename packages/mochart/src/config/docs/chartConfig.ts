import { style, spacing } from './shared';

export default function getDescriptions() {
  return {
    type: 'the type of chart to render: an x/y plot with axes (xy) or a pie/donut chart (pie)',
    accessibility: 'whether the chart exposes keyboard navigation and screen-reader semantics',
    margin: spacing('the margin (in pixels) for the top, right, bottom and left sides of the chart'),
    padding: spacing('the padding (in pixels) for the top, right, bottom and left sides of the chart'),
    backgroundStyle: style('the styles to apply to the chart background (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))')
  };
}

export function getDetails() {
  return {
    accessibility: 'When `true`, the chart is keyboard- and screen-reader-accessible: the plot area is a tab stop that opens and steps the tooltip, legend items and interactive pie slices are roving tab stops, and the svg carries roles, labels and `aria-hidden` markers for assistive tech. Set to `false` to render the chart without any of these attributes or key handlers — for example when the host page provides its own accessible alternative. The reduced-motion preference is separate and stays governed by `animation.respectReducedMotion`.'
  };
}
