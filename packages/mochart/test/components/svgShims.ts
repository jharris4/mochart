/**
 * jsdom has no SVG layout engine; return zero sizes so the library takes its
 * documented default-bounds fallbacks (same shims the golden suite installs).
 */
export function installSvgMeasurementShims(): void {
  // Cast: these text-measurement methods live on SVGTextContentElement in the
  // DOM lib, not the SVGElement base prototype we shim here.
  const svgProto = globalThis.SVGElement.prototype as any;
  if (typeof svgProto.getComputedTextLength !== 'function') {
    svgProto.getComputedTextLength = () => 0;
  }
  if (typeof svgProto.getSubStringLength !== 'function') {
    svgProto.getSubStringLength = () => 0;
  }
  if (typeof svgProto.getBBox !== 'function') {
    svgProto.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
  }
}
