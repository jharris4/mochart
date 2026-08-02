// jsdom has no layout, so Range lacks the CSSOM View methods CodeMirror measures selections with
const rangeProto = Range.prototype as unknown as {
  getClientRects: () => DOMRectList;
  getBoundingClientRect: () => DOMRect;
};

if (typeof rangeProto.getClientRects !== 'function') {
  rangeProto.getClientRects = () => Object.assign([], { item: () => null }) as unknown as DOMRectList;
}

if (typeof rangeProto.getBoundingClientRect !== 'function') {
  rangeProto.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
}
