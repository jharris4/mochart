// The SeriesIconConfig members, the `icon` group of the legend and tooltip descriptions. Only the section
// name and what "auto" sizes against differ between the two.
export function getDescriptions(sectionName: string, autoIconSizeText: string) {
  return {
    showColors: 'whether to show series colors next to series titles in the ' + sectionName,
    showShapes: 'whether to show the series marker shape next to series titles in the ' + sectionName,
    showPlaceholders: 'whether to show placeholder icons next to the series titles in the ' + sectionName,
    size: 'the width and height (in pixels) of the series icons, or "auto" to match ' + autoIconSizeText,
    spacerSize: 'the horizontal space (in pixels) to show between series icons and titles',
    borderSize: 'the width (in pixels) of the border drawn around series icons',
    borderColor: 'the color of the border drawn around series icons',
    borderOpacity: 'the opacity (0 - 1) of the border drawn around series icons',
    filteredColor: 'the color to use for the series icon when the corresponding series is filtered',
    unfilteredColor: 'the color to use for the placeholder series icons when the corresponding series is not filtered'
  };
}
