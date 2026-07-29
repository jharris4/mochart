export default function getDescriptions() {
  return {
    innerRadiusPercent: 'the inner radius of the slices as a fraction (0 to 1) of the outer radius (use a value greater than 0 for a donut chart)',
    outerRadiusPercent: 'the outer radius of the slices as a fraction (0 to 1) of the largest radius that fits within the plot',
    startAngle: 'the angle (in degrees, clockwise from the top) at which the first slice starts',
    padAngle: 'the angle (in degrees) of the gap between adjacent slices',
    cornerRadius: 'the corner radius (in pixels) applied to the slice corners',
    showLabels: 'whether labels should be shown on the slices',
    labelType: 'the content of the slice labels: the slice value (value), the slice percentage of the total (percent) or the series title (title)',
    labelFormat: 'the d3 format specifier used to format value and percent slice labels (use auto to derive a format)',
    labelRadiusPercent: 'the radial position of the slice labels as a fraction (0 to 1) between the inner radius and the outer radius',
    labelMinAnglePercent: 'hide the label of any slice whose angle is smaller than this fraction (0 to 1) of the full circle'
  };
}
