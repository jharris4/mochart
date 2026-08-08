export default function getDescriptions() {
  return {
    enabled: 'whether the chart exposes keyboard navigation and screen-reader semantics',
    respectReducedMotion: 'whether to respect the user’s reduced-motion system preference',
    chartLabel: 'the screen-reader name for the chart when the title has no text',
    chartRoleDescription: 'the role description screen readers announce for the chart',
    plotLabel: 'the screen-reader label for the keyboard-focusable plot area',
    legendLabel: 'the screen-reader label for the legend',
    tooltipPreviousLabel: 'the label for the tooltip controls’ previous-category button (aria-label and hover title)',
    tooltipNextLabel: 'the label for the tooltip controls’ next-category button (aria-label and hover title)'
  };
}

export function getDetails() {
  return {
    enabled: 'When `true`, the chart is keyboard- and screen-reader-accessible: the plot area is a tab stop that opens and steps the tooltip (with the values spoken through a hidden live region), legend items and interactive pie slices are roving tab stops, and the svg carries roles, labels and `aria-hidden` markers for assistive tech. Set to `false` to render the chart without any of these attributes or key handlers — for example when the host page provides its own accessible alternative. `respectReducedMotion` is not gated by this switch.',
    respectReducedMotion: 'When `true` and the user’s system requests reduced motion (the `prefers-reduced-motion: reduce` accessibility setting, for users sensitive to movement), the chart behaves as if `animation.animate` were `false`: config, data, and focus changes apply instantly. The preference is watched live, so changing the system setting takes effect without re-creating the chart. Set to `false` to animate regardless of the preference. Independent of `enabled`.',
    chartLabel: 'The accessible name of the chart svg when `title.text` is unset; a set title always wins. Replace to localize the announced name.',
    chartRoleDescription: 'Announced by screen readers in place of the generic "group" role, e.g. "Monthly sales, chart". Replace to localize it, as required for `aria-roledescription` values.',
    plotLabel: 'The accessible name of the plot-area tab stop that keyboard users activate to open and step the tooltip. Replace to localize it.',
    legendLabel: 'The accessible name of the legend group that contains the keyboard-reachable legend items. Replace to localize it.',
    tooltipPreviousLabel: 'The accessible name and hover title of the ‹ button shown when `tooltip.showControls` is on; the button itself shows only the glyph. Replace to localize it.',
    tooltipNextLabel: 'The accessible name and hover title of the › button shown when `tooltip.showControls` is on; the button itself shows only the glyph. Replace to localize it.'
  };
}
