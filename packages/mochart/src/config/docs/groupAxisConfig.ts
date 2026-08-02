import getAxisDescriptions from './axisConfig';

export default function getDescriptions() {
  return {
    ...getAxisDescriptions(),
    property: 'the property to retrieve from the data provider for the group values',
    displayProperty: 'the property to retrieve from the data provider for the group display values (use null for none)',
    type: 'the type of the displayed group values (number, date, string)',
    scale: 'the scale to use for the displayed group values (ordinal, linear)',
    dateUTC: 'whether dates should be treated as UTC (true) or local (false)',
    valueLabel: 'the label to show before a group value in the tooltip (use null for none)',
    valueFormat: 'the d3 format string to be applied to the group value when displayed in the tooltip (use null for none, use "auto" to derive from data)',
    valuePrefix: 'the text to prefix group values with when showing them in the tooltip (use null for none)',
    valueSuffix: 'the text to append group values with when showing them in the tooltip (use null for none)',
    minGroupValueExtent: 'the minimum group extent (in pixels) for a non-inverted bar this is the minimum width',
    groupPadding: {
      description: 'the padding percentages (0 - 1) of the group extent for all group values (outer) and grouped series (inner)',
      properties: {
        inner: 'the fraction (0 - 1) of a group value\'s extent to leave as space between the series drawn inside it',
        outer: 'the fraction (0 - 1) to trim from each group value\'s extent, leaving space between neighbouring group values'
      }
    },
    groupCountPadding: 'the extra count to be added to the group value count when dividing the group extent for displaying group values',
    tickLabelFormat: 'the d3 format string to be applied to the group values when displayed in axis tick labels (use null for none, use "auto" to derive from data)',
    tickLabelTruncationEnabled: 'whether or not to use text truncation (true) when the axis tick labels would overlap each other instead of skipping ticks (false)',
    tickLabelTruncationValue: 'the truncation text to append to the axis tick label text when its content is truncated',
    tickLabelTruncationMinLength: 'the minimum length at which to apply tick label truncation if the maximum percentage settings is used',
    tickLabelTruncationMaxPercent: 'the maximum percentage (0 - 1) of the chart bounds to allow any tick label text to occupy when they are perpendicular to the axis'
  };
}
export function getDetails() {
  return {
    property: 'The chart reads this property from each entry of the data provider to get the group (category) value. It is required — the only group axis property without a default.',
    type: 'How group values are interpreted: `string` for labels, `number` for numeric values, and `date` for date values (`dateUTC` controls their timezone handling). The type drives parsing, tick label formatting, and which `scale` options make sense.',
    scale: '`ordinal` places the groups at evenly spaced positions in data order regardless of their values; `linear` positions `number`/`date` group values proportionally along the axis, so uneven spacing in the data shows as uneven spacing in the chart.',
    displayProperty: 'When set, this property’s value is used wherever the group value is displayed (tick labels, tooltip), while `property` still drives positioning — useful for pre-formatted or friendly labels.'
  };
}
