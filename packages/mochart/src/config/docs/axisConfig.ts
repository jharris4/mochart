import { style, spacing, styleDescriptions } from './shared';
import type { DescriptionMap, NestedDescription } from './shared';

const strokeMembers = ['strokeColor', 'strokeOpacity', 'strokeWidth', 'strokeDashArray'];
const lineMembers = ['strokeColor', 'strokeOpacity', 'strokeWidth', 'strokeDashArray'];

const sameNote = ', or "same" to use the color of the normal state';
const sameValueNote = ', or "same" to use the value of the normal state';
const sameMembers = new Set(['strokeColor', 'fillColor', 'strokeWidth', 'strokeDashArray']);

function styleMembers(members: string[], allowSame: boolean): DescriptionMap {
  const descriptions: DescriptionMap = {};
  for (const member of members) {
    const description = styleDescriptions[member] as string;
    descriptions[member] = allowSame && sameMembers.has(member)
      ? description + (member.endsWith('Color') ? sameNote : sameValueNote)
      : description;
  }
  return descriptions;
}

function partialStyle(description: string, members: string[]): NestedDescription {
  return { description, properties: styleMembers(members, false) };
}

function styleStates(description: string, members: string[]): NestedDescription {
  return {
    description,
    properties: {
      normal: { description: description + ', while the axis is neither focused nor defocused', properties: styleMembers(members, false) },
      focused: { description: description + ', while the axis is focused', properties: styleMembers(members, true) },
      defocused: { description: description + ', while the axis is defocused', properties: styleMembers(members, true) }
    }
  };
}

export default function getDescriptions() {
  return {
    axisLine: 'whether to show a line along the length of the axis',
    axisLineFront: 'whether the axis line should be shown in front (true) or behind (false) the series shapes',
    axisLineMargin: 'the margin (in pixels) between the line shown along the axis and the inner boundary of the axis',
    axisLineStyle: styleStates('the style of the line shown along the axis', strokeMembers),

    backgroundStyle: style('the styles to apply to the axis background (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))'),
    backgroundFront: 'whether the axis background should be shown in front (true) or behind (false) the series shapes',

    side: 'whether the axis is placed at the start (top/left) or end (bottom/right) of the chart',

    collapsed: 'whether the axis should consume space in the layout (false) or not (true)',

    focusRange: 'whether to show the focus range on the axis when it has a focused series domain or category value',
    focusRangeFront: 'whether the focus range should be shown in front (true) or behind (false) the series shapes',
    focusRangeApplyToTitle: 'whether to show the focus range only over tick labels (false) or over both tick labels and title (true)',
    focusRangeStyle: style('the style of the focus range'),

    focusTickMarks: 'whether to show lines perpendicular to the axis showing the focused series domain or category value',
    focusTickMarksFront: 'whether the focus tick marks should be shown in front (true) or behind (false) the series shapes',
    focusTickMarkSize: 'the length (in pixels) of the focus tick mark line(s)',
    focusTickMarkMargin: 'the margin (in pixels) to show between the inside of the axis and the focus tick mark line(s)',
    focusTickMarkStyle: partialStyle('the style of the focus tick mark line(s)', lineMembers),

    gridLines: 'whether to show grid lines perpendicular to each tick on the axis',
    gridLinesFront: 'whether the axis grid lines should be shown in front (true) or behind (false) the series shapes',
    gridLineStyle: styleStates('the style of the axis grid lines', strokeMembers),

    marginInner: 'the inner (closest to chart) margin (in pixels) of the axis',
    marginOuter: 'the outer (furthest from chart) margin (in pixels) of the axis',

    maxTickCount: 'the maximum number of ticks to show along the length of the axis (use 0 to disable the maximum)',

    minTickSpacing: 'the minimum space (in pixels) to allow between the bounds of any tick label text',
    minTickInterval: 'the minimum value interval to use between any two consecutive tick label values',

    paddingInner: 'the inner (closest to chart) padding (in pixels) of the axis',
    paddingOuter: 'the outer (furthest from chart) padding (in pixels) of the axis',


    thresholds: {
      description: 'the threshold lines to draw on the axis, each an object drawing a reference line across the plot at an axis value (the array replaces the default wholesale)',
      properties: {
        value: 'the axis value to draw the threshold line at (on a date category axis, a millisecond timestamp)',
        front: 'whether the line is drawn in front of (true) or behind (false) the series shapes',
        style: styleStates('the style of the threshold line', lineMembers),
        title: 'the title text shown beside the line (use null for none)',
        titleSide: 'which value side of the line the title sits on ("low" for smaller values, "high" for larger)',
        titleSnapToValue: 'whether the title flips to the other side when it has no room',
        titleMargin: spacing('the margin (in pixels) of the threshold title, relative to its orientation'),
        titlePadding: spacing('the padding (in pixels) of the threshold title, relative to its orientation'),
        titleTextStyle: styleStates('the style of the threshold title text', ['strokeColor', 'strokeOpacity', 'strokeWidth', 'strokeDashArray', 'fillColor', 'fillOpacity']),
        titleBackgroundStyle: partialStyle('the styles to apply to the threshold title background', ['strokeColor', 'strokeOpacity', 'strokeWidth', 'strokeDashArray', 'fillColor', 'fillOpacity'])
      }
    },
    tickCount: 'the number of ticks to show along the length of the axis (use "auto" to derive the tick count from the data)',

    tickLabelFront: 'whether the axis tick labels should be shown in front (true) or behind (false) the series shapes',
    tickLabelBackgroundStyle: style('the styles to apply to the axis tick label background (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))'),
    tickLabelSize: 'the space (in pixels) perpendicular to the axis direction to allocate for the tick labels (use "auto" to derive from the font size)',
    tickLabelMarginInner: 'the margin (in pixels) to show between the tick labels and the inside of the axis',
    tickLabelMarginOuter: 'the margin (in pixels) to show between the tick labels and the outside of the axis',
    tickLabelPaddingInner: 'the padding (in pixels) to show between the tick labels and the inside of the axis',
    tickLabelPaddingOuter: 'the padding (in pixels) to show between the tick labels and the outside of the axis',
    tickLabelPrefix: 'the string to prefix to the text of each axis tick label (use null for none)',
    tickLabelSuffix: 'the string to append to the text of each axis tick label (use null for none)',
    tickLabelRotation: 'the rotation (in degrees) to apply to each axis tick label',
    tickLabelAnchor: 'the anchor to use for all axis tick labels (start, end, middle) (use "auto" to determine automatically)',
    tickLabelTextStyle: styleStates('the style of the axis tick label text', ['strokeColor', 'strokeOpacity', 'strokeWidth', 'strokeDashArray', 'fillColor', 'fillOpacity']),

    tickMarks: 'whether to show lines perpendicular to each tick value along the axis',
    tickMarkFront: 'whether the axis tick marks should be shown in front (true) or behind (false) the series shapes',
    tickMarkSize: 'the length (in pixels) of the axis tick mark lines',
    tickMarkMargin: 'the margin (in pixels) to show between the inside of the axis and the axis tick mark lines',
    tickMarkStyle: styleStates('the style of the axis tick mark lines', strokeMembers),

    title: 'the title text to be shown along side to the axis (use null for no title)',
    titleFront: 'whether the axis title should be shown in front (true) or behind (false) the series shapes',
    titleBackgroundStyle: style('the styles to apply to the axis title background (strokeColor, strokeOpacity, strokeWidth, fillColor, fillOpacity (use null for none))'),
    titleTruncationEnabled: 'whether to apply text truncation to the contents of the axis title when it would overflow the axis bounds',
    titleTruncationValue: 'the truncation text to append to the axis title when its length exceeds the bounds of the axis',
    titleSize: 'the space (in pixels) perpendicular to the axis direction to allocate for the axis title (use "auto" to derive from the font size)',
    titleMarginInner: 'the margin (in pixels) to show between the axis title and the inside of the axis',
    titleMarginOuter: 'the margin (in pixels) to show between the axis title and the outside of the axis',
    titlePaddingInner: 'the padding (in pixels) to show between the axis title and the inside of the axis',
    titlePaddingOuter: 'the padding (in pixels) to show between the axis title and the outside of the axis',
    titleTextStyle: styleStates('the style of the axis title text', ['strokeColor', 'strokeOpacity', 'strokeWidth', 'strokeDashArray', 'fillColor', 'fillOpacity']),

    min: 'the forced minimum numeric value for the axis (use "auto" to compute from the values)',
    max: 'the forced maximum numeric value for the axis (use "auto" to compute from the values)',
    softMin: 'the forced minimum numeric value for the axis to be used if no data value is less than this value (use null to disable)',
    softMax: 'the forced maximum numeric value for the axis to be used if no data value is greater than this value (use null to disable)',
    minOffset: 'the numeric offset to apply to the minimum value of the axis',
    maxOffset: 'the numeric offset to apply to the maximum value of the axis',

    visible: 'whether the axis should be visible'
  };
}

export { styleStates as axisStyleStatesDescription, strokeMembers as axisStrokeMembers };
