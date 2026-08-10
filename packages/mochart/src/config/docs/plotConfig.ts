import { style, spacing } from './shared';

export default function getDescriptions() {
  return {
    inverted: 'whether the category axis should be left to right (false) or top to bottom (true)',
    margin: spacing('the margin (in pixels) for the top, right, bottom and left sides of the plot'),
    padding: spacing('the padding (in pixels) for the top, right, bottom and left sides of the plot'),
    clipOverflow: spacing('how far (in pixels) the series may overflow each side of the plot before being clipped; the sides are screen sides, so with inverted set the value axis runs left/right'),

    showClipIndicator: 'whether to mark the plot edges that have data hidden behind them, which happens when an axis min or max excludes some of the values',
    clipIndicatorSize: 'the depth (in pixels) of the clip indicator band (use "auto" to size it from the indicator font size plus clipIndicatorPadding on both sides)',
    clipIndicatorPadding: 'the space (in pixels) between the clip indicator label and the edges of its band, which also determines the band depth when clipIndicatorSize is "auto"',
    clipIndicatorStyle: style('the styles to apply to the clip indicator band (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))'),
    clipIndicatorFront: 'whether the clip indicator should be shown in front (true) or behind (false) the series shapes',
    backgroundStyle: style('the styles to apply to the plot background (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))')
  };
}
