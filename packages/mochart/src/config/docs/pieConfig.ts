export default function getDescriptions() {
  return {
    innerRadiusPercent: 'the inner radius of the slices as a fraction (0 to 1) of the outer radius (use a value greater than 0 for a donut chart)',
    outerRadiusPercent: 'the outer radius of the slices as a fraction (0 to 1) of the largest radius that fits within the plot',
    startAngle: 'the angle (in degrees, clockwise from the top) at which the first slice starts',
    endAngle: 'the angle (in degrees, clockwise from the top) at which the last slice ends (use startAngle -90 and endAngle 90 for a half/gauge pie)',
    padAngle: 'the angle (in degrees) of the gap between adjacent slices',
    cornerRadius: 'the corner radius (in pixels) applied to the slice corners',
    focusOffsetPercent: 'offset the focused slice away from the center by this fraction (0 to 1) of the outer radius (an exploded slice)',
    showLabels: 'whether labels should be shown on the slices',
    labelType: 'the content of the slice labels: the slice value (value), the slice percentage of the total (percent) or the series title (title)',
    labelFormat: 'the d3 format specifier used to format value and percent slice labels (use auto to derive a format)',
    labelRadiusPercent: 'the radial position of the slice labels as a fraction (0 to 1) between the inner radius and the outer radius',
    labelMinAnglePercent: 'hide the label of any slice whose value is smaller than this fraction (0 to 1) of the slice total',
    adjustLabelsForSuppression: 'whether percent slice labels (and the labelMinAnglePercent threshold) renormalize against the unsuppressed slices (true) or always use every slice\'s share of the full total (false)',
    centerLabel: 'a text label shown at the center of the pie (use null for none; most useful for donut and gauge charts)',
    showCenterTotal: 'whether the total of the slice values should be shown at the center of the pie',
    centerTotalFormat: 'the d3 format specifier used to format the center total (use auto to derive a format)',
    adjustCenterTotalForSuppression: 'whether the center total counts only the unsuppressed slices (true) or always shows the full total (false)'
  };
}
