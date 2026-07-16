import type { Anchor } from '../config/core/constants';
import type { Bounds, Size } from '../types/geometry';

// calculates the rotated bounds for the given bounds, angle and anchor, used for rotating ticks on the axis
// it is assumed that the centerY of the bounds is bounds.height/2.0 and that the centerX for the various anchors is:
// 'start': 0, 'middle': bounds.width/2.0, 'end': bounds.width
export function getRotatedBounds(bounds: Size, angle: number, anchor: Anchor): Bounds {
  var angleRadians = angle * (Math.PI / 180);

  let boundsWidth = bounds.width;
  let boundsHeight = bounds.height;

  let cosAngle = Math.cos(angleRadians);
  let sinAngle = Math.sin(angleRadians);

  let boundsWidthCosAngle = boundsWidth * cosAngle;
  let boundsWidthSinAngle = boundsWidth * sinAngle;
  let boundsHeightCosAngle = boundsHeight * cosAngle;
  let boundsHeightSinAngle = boundsHeight * sinAngle;

  let rotatedBoundsWidth = Math.abs(boundsWidthCosAngle) + Math.abs(boundsHeightSinAngle);
  let rotatedBoundsHeight = Math.abs(boundsWidthSinAngle) + Math.abs(boundsHeightCosAngle);

  let boundsHalfHeight = boundsHeight / 2.0;
  let boundsHalfHeightCosAngle = boundsHalfHeight * cosAngle;
  let boundsHalfHeightSinAngle = boundsHalfHeight * sinAngle;

  let rotatedBoundsX = 0;
  let rotatedBoundsY = 0;
  if (anchor === 'start') {
    let rotatedTopLeftX = boundsHalfHeightSinAngle;
    let rotatedTopLeftY = - 1 * boundsHalfHeightCosAngle;
    let rotatedTopRightX = boundsWidthCosAngle + boundsHalfHeightSinAngle;
    let rotatedTopRightY = boundsWidthSinAngle - boundsHalfHeightCosAngle;
    let rotatedBottomLeftX = -1 * boundsHalfHeightSinAngle;
    let rotatedBottomLeftY = boundsHalfHeightCosAngle;
    let rotatedBottomRightX = boundsWidthCosAngle - boundsHalfHeightSinAngle;
    let rotatedBottomRightY = boundsWidthSinAngle + boundsHalfHeightCosAngle;
    rotatedBoundsX = Math.min(rotatedTopLeftX, rotatedTopRightX, rotatedBottomLeftX, rotatedBottomRightX);
    rotatedBoundsY = Math.min(rotatedTopLeftY, rotatedTopRightY, rotatedBottomLeftY, rotatedBottomRightY);
  }
  else if (anchor === 'middle') {
    rotatedBoundsX = -1 * rotatedBoundsWidth / 2.0;
    rotatedBoundsY = -1 * rotatedBoundsHeight / 2.0;
  }
  else if (anchor === 'end') {
    let rotatedTopLeftX = -1 * boundsWidthCosAngle + boundsHalfHeightSinAngle;
    let rotatedTopLeftY = -1 * boundsWidthSinAngle - boundsHalfHeightCosAngle;
    let rotatedTopRightX = boundsHalfHeightSinAngle;
    let rotatedTopRightY = - 1 * boundsHalfHeightCosAngle;
    let rotatedBottomLeftX = -1 * boundsWidthCosAngle - boundsHalfHeightSinAngle;
    let rotatedBottomLeftY = -1 * boundsWidthSinAngle + boundsHalfHeightCosAngle;
    let rotatedBottomRightX = - 1 * boundsHalfHeightSinAngle;
    let rotatedBottomRightY = boundsHalfHeightCosAngle;
    rotatedBoundsX = Math.min(rotatedTopLeftX, rotatedTopRightX, rotatedBottomLeftX, rotatedBottomRightX);
    rotatedBoundsY = Math.min(rotatedTopLeftY, rotatedTopRightY, rotatedBottomLeftY, rotatedBottomRightY);
  }
  return {
    x: rotatedBoundsX,
    y: rotatedBoundsY,
    width: rotatedBoundsWidth,
    height: rotatedBoundsHeight
  };
}

export function getRotatedZeroBounds(bounds: Size, anchor: Anchor): Bounds {
  const { width, height } = bounds;
  const y = height / - 2.0;
  const x = anchor === 'middle' ? (width / -2.0) : (anchor === 'start' ? 0 : (-1 * width));
  return { x, y, width, height };
}
