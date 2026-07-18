export default function getDescriptions() {
  return {
    series: 'the color palette to use for series shapes that are colored by series or group index',
    seriesFocused: 'the color palette to use for focused series shapes that are colored by series or group index',
    seriesDefocused: 'the color palette to use for defocused series shapes that are colored by series or group index',
    marker: 'the color palette to use for series markers that are colored by series or group index',
    markerFocused: 'the color palette to use for focused series markers that are colored by series or group index',
    markerDefocused: 'the color palette to use for defocused series markers that are colored by series or group index',
    label: 'the color palette to use for series labels that are colored by series or group index',
    labelFocused: 'the color palette to use for focused series labels that are colored by series or group index',
    labelDefocused: 'the color palette to use for defocused series labels that are colored by series or group index'
  };
}
export function getDetails() {
  return {
    series: 'The fallback coloring for series that do not set explicit colors: each series takes the palette entry for its series index (or its group index, for series configured to color by group index). The focused/defocused variants apply while another element has focus.'
  };
}
