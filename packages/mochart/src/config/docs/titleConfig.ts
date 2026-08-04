import { style, spacing } from './shared';

export default function getDescriptions() {
  return {
    text: 'the text to display in the title at the top of the chart (use null for none)',
    position: 'the position of the title relative to the chart (top or bottom)',
    prefix: 'the text to display at the start of the title at the top of the chart (use null for none)',
    suffix: 'the text to display at the end of the title at the top of the chart (use null for none)',
    link: 'the link to create for the title (use null for none)',
    linkDisabled: 'whether to prevent default navigation behaviour when the link is clicked',
    truncationEnabled: 'whether to use text truncation when the title width exceeds the width of the chart',
    truncationValue: 'the truncation text to append to the title when its length exceeds the length of the chart',
    alignedToAxes: 'whether the title should be aligned between the axes (true) or the chart bounds (false)',
    align: 'the alignment for the title (left, center, right)',
    verticalAlign: 'the vertical alignment of the prefix/text/suffix within the title',
    verticalExpand: 'whether to expand the padding height of the prefix/text/suffix to match the max section height',
    margin: spacing('the margin (in pixels) for the top, right, bottom and left sides of the title'),
    padding: spacing('the padding (in pixels) for the top, right, bottom and left sides of the title'),
    textMargin: spacing('the margin (in pixels) for the top, right, bottom and left sides of the title text'),
    textPadding: spacing('the padding (in pixels) for the top, right, bottom and left sides of the title text'),
    prefixMargin: spacing('the margin (in pixels) for the top, right, bottom and left sides of the title prefix'),
    prefixPadding: spacing('the padding (in pixels) for the top, right, bottom and left sides of the title prefix'),
    suffixMargin: spacing('the margin (in pixels) for the top, right, bottom and left sides of the title suffix'),
    suffixPadding: spacing('the padding (in pixels) for the top, right, bottom and left sides of the title suffix'),
    backgroundStyle: style('the styles to apply to the title background (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))'),
    textBackgroundStyle: style('the styles to apply to the title text background (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))'),
    textStyle: style('the styles to apply to the title text (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none), use "currentColor" to follow the host page\'s css color and theme)'),
    prefixBackgroundStyle: style('the styles to apply to the title prefix background (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))'),
    prefixTextStyle: style('the styles to apply to the title prefix text (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none), use "currentColor" to follow the host page\'s css color and theme)'),
    suffixBackgroundStyle: style('the styles to apply to the title suffix background (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))'),
    suffixTextStyle: style('the styles to apply to the title suffix text (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none), use "currentColor" to follow the host page\'s css color and theme)')
  };
}
