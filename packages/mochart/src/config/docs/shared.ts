// Description shapes and shared prose for config properties whose value is a nested object. The docs
// generator walks the nested validator shape and requires a description at every level, so a nested
// member cannot ship undocumented.

/** Prose for one config property. */
export type DescriptionEntry = string | NestedDescription;

/** Prose for a property that holds an object, plus prose for its members. */
export interface NestedDescription {
  /**
   * Prose for the property itself. Required in a description map; optional in
   * a details map, where a parent may have no detail of its own.
   */
  description?: string;
  /** Prose for each member of the nested object, keyed by member name. */
  properties: DescriptionMap;
}

/** A section's description (or details) map, keyed by config property. */
export interface DescriptionMap {
  [key: string]: DescriptionEntry;
}

/** The `Style` / `StrokeStyle` members. `null` leaves the svg attribute unset (css can supply it); `'none'` writes it and switches the style off. */
export const styleDescriptions: DescriptionMap = {
  strokeColor: 'the color of the stroke (outline): use null to leave the svg stroke attribute unset so that css can supply it, "none" to switch the stroke off, or "currentColor" to follow the host page\'s css color',
  strokeOpacity: 'the opacity (0 - 1) of the stroke, or null to leave the svg stroke-opacity attribute unset',
  strokeWidth: 'the width (in pixels) of the stroke, or null to leave the svg stroke-width attribute unset',
  fillColor: 'the color of the fill: use null to leave the svg fill attribute unset so that css can supply it, "none" to switch the fill off, or "currentColor" to follow the host page\'s css color',
  fillOpacity: 'the opacity (0 - 1) of the fill, or null to leave the svg fill-opacity attribute unset'
};

/** The `MarginPadding` members, shared by every margin and padding property. */
export const spacingDescriptions: DescriptionMap = {
  top: 'the space (in pixels) along the top edge',
  right: 'the space (in pixels) along the right edge',
  bottom: 'the space (in pixels) along the bottom edge',
  left: 'the space (in pixels) along the left edge'
};

/** The `ColorPalette` members, shared by every color palette entry. */
export const colorPaletteDescriptions: DescriptionMap = {
  strokeColors: 'the colors to use for strokes, taken by series or category index and wrapping around when there are more series than colors',
  fillColors: 'the colors to use for fills, taken by series or category index and wrapping around when there are more series than colors'
};

/** A property holding a `Style` (or the stroke-only `StrokeStyle`). */
export function style(description: string): NestedDescription {
  return { description, properties: styleDescriptions };
}

/** A property holding only some of the style members, e.g. the stroke-only `StrokeStyle`. */
export function partialStyle(description: string, members: string[]): NestedDescription {
  const properties: DescriptionMap = {};
  for (const member of members) {
    properties[member] = styleDescriptions[member] as string;
  }
  return { description, properties };
}

/** A property holding a `MarginPadding` spacing box. */
export function spacing(description: string): NestedDescription {
  return { description, properties: spacingDescriptions };
}

/** A property holding a `ColorPalette`. */
export function colorPalette(description: string): NestedDescription {
  return { description, properties: colorPaletteDescriptions };
}
