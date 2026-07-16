import { path } from 'd3-path';

export function getCutoutRectanglePath(x, y, width, height, cx, cy, cwidth, cheight) {
  let pathGenerator = path();
  pathGenerator.moveTo(x, y);
  pathGenerator.lineTo(x + width, y);
  pathGenerator.lineTo(x + width, y + height);
  pathGenerator.lineTo(x, y + height);
  pathGenerator.closePath();
  pathGenerator.moveTo(cx, cy);
  pathGenerator.lineTo(cx + cwidth, cy);
  pathGenerator.lineTo(cx + cwidth, cy + cheight);
  pathGenerator.lineTo(cx, cy + cheight);
  pathGenerator.closePath();

  return "" + pathGenerator;
}

export function getClipPathReference(clipPathId) {
  return `url(#${clipPathId})`;
}

export function getGradientReference(gradientId) {
  return `url(#${gradientId})`;
}
