// The SeriesIconConfig members, spread into the legend and tooltip descriptions. Only the section
// name and what "auto" sizes against differ between the two.
export function getDescriptions(sectionName: string, autoIconSizeText: string) {
  return {
    showIconColors: 'whether to show series colors next to series titles in the ' + sectionName,
    showIconShapes: 'whether to show series marker shape next to series titles in the ' + sectionName,
    showIconPlaceholders: 'whether to show placeholder icons next to the series titles in the ' + sectionName,
    iconSize: 'the width and height (in pixels) of the series icons, or "auto" to match ' + autoIconSizeText,
    iconSpacerSize: 'the horizontal space (in pixels) to show between series icons and titles',
    iconBorderSize: 'the width (in pixels) of the border drawn around series icons',
    iconBorderColor: 'the color of the border drawn around series icons',
    iconBorderOpacity: 'the opacity (0 - 1) of the border drawn around series icons',
    iconFilteredColor: 'the color to use for the series icon when the corresponding series is filtered',
    iconUnfilteredColor: 'the color to use for the placeholder series icons when the corresponding series is not filtered'
  };
}
