import { symbol, symbols } from 'd3-shape';

// The new version of d3 seems to have removed the ability to get a symbol by passing the string,
// so we'll use a map for now to bypass this issue.
// https://github.com/d3/d3-shape/issues/64
const shapeToSymbolIndexMap = {
  circle: symbols[0],
  cross: symbols[1],
  diamond: symbols[2],
  square: symbols[3],
  star: symbols[4],
  triangle: symbols[5],
  wye: symbols[6]
};

export function getSymbolGenerator(size, shape) {
  return symbol().size(size * size).type(shapeToSymbolIndexMap[shape]);
}