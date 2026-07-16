import { createBoundsLayoutInfo } from './LayoutInfo';

export const emptyMarginPadding = { top: 0, right: 0, bottom: 0, left: 0 };
export const emptyInnerOuter = 0;
export const getAll = (accessor, margin, padding) => Math.ceil((margin ? accessor(margin) : 0) + (padding ? accessor(padding) : 0));
export const getLeft = ({ left }) => left;
export const getSpacingLeft = (margin, padding) => getAll(getLeft, margin, padding);
export const getRight = ({ right }) => right;
export const getSpacingRight = (margin, padding) => getAll(getRight, margin, padding);
export const getLeftRight = ({ left, right }) => Math.ceil(left + right);
export const getTop = ({ top }) => top;
export const getSpacingTop = (margin, padding) => getAll(getTop, margin, padding);
export const getBottom = ({ bottom }) => bottom;
export const getSpacingBottom = (margin, padding) => getAll(getBottom, margin, padding);
export const getTopBottom = ({ top, bottom }) => Math.ceil(top + bottom);
export const getSpacingWidth = (margin, padding) => getAll(getLeftRight, margin, padding);
export const getOuterWidth = (width, margin, padding) => Math.ceil(width + getSpacingWidth(margin, padding));
export const getInnerWidth = (width, margin, padding) => Math.ceil(width - getSpacingWidth(margin, padding));
export const getSpacingOuterWidth = ({ width }, margin, padding) => getOuterWidth(width, margin, padding);
export const getSpacingInnerWidth = ({ width }, margin, padding) => getInnerWidth(width, margin, padding);
export const getSpacingHeight = (margin, padding) => getAll(getTopBottom, margin, padding);
export const getOuterHeight = (height, margin, padding) => height + getSpacingHeight(margin, padding);
export const getInnerHeight = (height, margin, padding) => height - getSpacingHeight(margin, padding);
export const getSpacingOuterHeight = ({ height }, margin, padding?) => getOuterHeight(height, margin, padding);
export const getSpacingInnerHeight = ({ height }, margin, padding) => getInnerHeight(height, margin, padding);
export const getMaxSpacingHeight = (max, bounds, margin, padding) => Math.max(max, getSpacingOuterHeight(bounds, margin, padding));
export const getRelativeBounds = ({x, y}, innerBounds) => ({ ...innerBounds, x: Math.floor(innerBounds.x - x), y: Math.floor(innerBounds.y - y) });

export function getSpacingOuterBounds(bounds, margin, padding = emptyMarginPadding) {
  const { x = 0, y = 0 } = bounds;
  return {
    x: x - getSpacingLeft(margin, padding),
    y: y - getSpacingTop(margin, padding),
    width: getSpacingOuterWidth(bounds, margin, padding),
    height: getSpacingOuterHeight(bounds, margin, padding)
  }
}

export function getSpacingInnerBounds(bounds, margin, padding = emptyMarginPadding) {
  const { x = 0, y = 0 } = bounds;
  return {
    x: x + getSpacingLeft(margin, padding),
    y: y + getSpacingTop(margin, padding),
    width: getSpacingInnerWidth(bounds, margin, padding),
    height: getSpacingInnerHeight(bounds, margin, padding)
  }
}

export function createSpacingLayoutInfo(bounds, margin = emptyMarginPadding, padding = emptyMarginPadding, inner = true) {
  const { x = 0, y = 0, width, height } = bounds;
  const marginBounds = inner ? width > 0 ? getSpacingInnerBounds(bounds, margin) : bounds : getSpacingOuterBounds(bounds, padding);
  const paddingBounds = inner ? width > 0 ? getSpacingInnerBounds(bounds, margin, padding) : bounds : bounds;
  bounds = inner ? bounds : getSpacingOuterBounds(bounds, margin, padding);
  const marginRelativeBounds = width > 0 ? getRelativeBounds(bounds, marginBounds) : bounds;
  const paddingRelativeBounds = width > 0 ? getRelativeBounds(bounds, paddingBounds) : bounds;
  return {
    ...bounds,
    marginBounds,
    marginRelativeBounds,
    paddingBounds,
    paddingRelativeBounds
  };
}

export function createInvertedSpacingLayoutInfo(bounds, inverted, margin = emptyMarginPadding, padding = emptyMarginPadding) {
  return createSpacingLayoutInfo(createBoundsLayoutInfo(bounds, inverted), margin, padding);
}

export function createInnerOuterSpacingLayoutInfo(bounds, vertical, inverted, before, marginInner = emptyInnerOuter, marginOuter = emptyInnerOuter, paddingInner = emptyInnerOuter, paddingOuter = emptyInnerOuter) {
  const margin = { top: 0, right: 0, bottom: 0, left: 0 };
  const padding = { top: 0, right: 0, bottom: 0, left: 0 };
  if (vertical) {
    if (before) {
      margin.left = marginOuter;
      margin.right = marginInner;
      padding.left = paddingOuter;
      padding.right = paddingInner;
    }
    else {
      margin.left = marginInner;
      margin.right = marginOuter;
      padding.left = paddingInner;
      padding.right = paddingOuter;
    }
  }
  else {
    if (before) {
      margin.top = marginOuter;
      margin.bottom = marginInner;
      padding.top = paddingOuter;
      padding.bottom = paddingInner;
    }
    else {
      margin.top = marginInner;
      margin.bottom = marginOuter;
      padding.top = paddingInner;
      padding.bottom = paddingOuter;
    }
  }
  return createInvertedSpacingLayoutInfo(bounds, inverted, margin, padding);
}
