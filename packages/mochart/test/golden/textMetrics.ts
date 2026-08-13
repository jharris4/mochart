/**
 * Deterministic text metrics for the golden suite.
 *
 * jsdom has no layout or font engine: `getComputedTextLength()` and `getBBox()`
 * do not exist, and `getComputedStyle().fontSize` resolves to the keyword
 * `medium`. Stubbing those with zeros (what the suite used to do) makes every
 * measured text element fall into the library's `defaultBounds` fallback, so
 * every truncation, tick-pruning and layout-fitting decision in the goldens is
 * taken against 20x20 placeholder text — the truncation demo produced no
 * ellipsis at all.
 *
 * Instead of zeros, this module models one synthetic proportional font:
 *
 *   - a fixed em box of EM_PX pixels for every text element (no CSS is loaded
 *     in jsdom, so the DOM carries no per-element font size to honour);
 *   - a per-character advance table in fractions of the em, grouped the way a
 *     Helvetica/Arial-class face is proportioned (narrow `il.`, wide `MW`, …);
 *   - a text width that is the sum of its characters' advances, counted in
 *     code points so a surrogate pair measures once;
 *   - a text height of the em box times LINE_HEIGHT_FRACTION, matching the
 *     1.15-1.25em the library documents real browsers report.
 *
 * The model is a pure function of the string's code points and two constants,
 * so it is identical on every machine, Node version and installed font set —
 * which is what checked-in snapshots require. It is deliberately *not* an
 * attempt to reproduce any real font's metrics; it only has to be proportional,
 * non-zero and stable so the measured code paths actually run.
 *
 * Box layout stays unmodelled: `getBoundingClientRect` is still jsdom's 0x0, so
 * the legend container keeps the library's default-bounds marker (its layout
 * uses the per-item text bounds, which are measured here).
 */

/** Nominal font size, in pixels, for every text element the chart renders. */
export const EM_PX = 16;

/** Measured text height as a fraction of the em box (real browsers report 1.15-1.25em). */
const LINE_HEIGHT_FRACTION = 1.2;

/** Advance widths in fractions of the em, by character group. */
const ADVANCE_FRACTION_GROUPS: readonly [number, string][] = [
  [0.28, ' iljI.,:;!|\'`'],
  [0.33, 'tfr-()[]{}/\\"'],
  [0.56, 'abcdeghknopqsuvxyz0123456789$?+*&#%'],
  [0.67, 'ABCDEFGHJKLNOPQRSTUVXYZ'],
  [0.83, 'mw'],
  [0.94, 'MW']
];

const advanceFractions = new Map<string, number>();
for (const [fraction, characters] of ADVANCE_FRACTION_GROUPS) {
  for (const character of characters) {
    advanceFractions.set(character, fraction);
  }
}

/** Anything at or above this code point is treated as full-width (CJK, symbols, emoji). */
const FULL_WIDTH_MIN_CODE_POINT = 0x2e80;
/** Everything else (accented Latin, unlisted punctuation) gets a middling advance. */
const DEFAULT_ADVANCE_FRACTION = 0.6;

function getAdvanceFraction(character: string): number {
  const known = advanceFractions.get(character);
  if (known !== undefined) {
    return known;
  }
  return (character.codePointAt(0) ?? 0) >= FULL_WIDTH_MIN_CODE_POINT ? 1 : DEFAULT_ADVANCE_FRACTION;
}

/** Width in pixels of `text` in the synthetic font. */
export function measureTextWidth(text: string): number {
  let fraction = 0;
  // by code point, so an astral character is one advance and not two
  for (const character of text) {
    fraction += getAdvanceFraction(character);
  }
  return fraction * EM_PX;
}

/** Height in pixels of a non-empty line of text in the synthetic font. */
export function getTextHeight(): number {
  return EM_PX * LINE_HEIGHT_FRACTION;
}

function getTextContent(element: Element): string {
  return element.textContent ?? '';
}

/**
 * Install the metrics on every measurement entry point the chart uses:
 * `getComputedTextLength` (text truncation), `getBBox` (all measured text
 * bounds) and the `fontSize` of computed styles (legend icon sizing and empty
 * clip-indicator bands). All three report the same model, so the library never
 * sees a width that disagrees with a font size.
 */
export function installTextMetrics(): void {
  // Cast: the text-measurement methods live on SVGTextContentElement in the DOM
  // lib, not on the SVGElement base prototype that jsdom gives every SVG node.
  const svgProto = globalThis.SVGElement.prototype as any;

  svgProto.getComputedTextLength = function (this: SVGTextContentElement): number {
    return measureTextWidth(getTextContent(this));
  };

  // Only text carries metrics here: the library measures bounds of <text> nodes
  // exclusively, and shapes would need a real layout engine to box correctly.
  svgProto.getBBox = function (this: SVGGraphicsElement) {
    const text = this.tagName === 'text' || this.tagName === 'tspan' ? getTextContent(this) : '';
    if (text.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    return { x: 0, y: 0, width: measureTextWidth(text), height: getTextHeight() };
  };

  // jsdom resolves font-size to the keyword `medium`, which the library reads as
  // NaN and discards; report the em the widths above are built from.
  const nativeGetComputedStyle = globalThis.getComputedStyle;
  globalThis.getComputedStyle = function (element: Element, pseudoElement?: string | null) {
    const style = nativeGetComputedStyle.call(globalThis, element, pseudoElement ?? undefined);
    if (style.fontSize !== EM_PX + 'px') {
      style.fontSize = EM_PX + 'px';
    }
    return style;
  } as typeof globalThis.getComputedStyle;
}
