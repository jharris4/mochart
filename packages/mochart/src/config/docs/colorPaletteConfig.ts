import { colorPaletteDescriptions } from './shared';
import type { NestedDescription } from './shared';

function palettes(element: string): NestedDescription {
  return {
    description: 'the color palettes to use for series ' + element + ' that are colored by series or group index',
    properties: {
      normal: { description: 'the palette to use while nothing has focus', properties: colorPaletteDescriptions },
      focused: { description: 'the palette to use for the focused ' + element, properties: colorPaletteDescriptions },
      defocused: { description: 'the palette to use for the defocused ' + element, properties: colorPaletteDescriptions }
    }
  };
}

export default function getDescriptions() {
  return {
    series: palettes('shapes'),
    marker: palettes('markers'),
    label: palettes('labels'),
    errorBar: palettes('error bars')
  };
}
export function getDetails() {
  return {
    series: 'The fallback coloring for series that do not set explicit colors: each series takes the palette entry for its series index (or its group index, for series configured to color by group index). The focused/defocused variants apply while another element has focus.'
  };
}
