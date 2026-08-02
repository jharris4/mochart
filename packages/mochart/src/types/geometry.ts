export interface Size {
  width: number;
  height: number;
}

export interface Bounds extends Size {
  x: number;
  y: number;
}

export interface MarginPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface InnerOuter {
  inner: number;
  outer: number;
}

/**
 * Measured text bounds. `empty` marks the shared zero bounds used when the
 * measured element is hidden; `default` marks the placeholder bounds used
 * before the DOM can be measured. `fontSize` is the computed font size in
 * pixels, captured only where it is measured.
 */
export interface TextBounds extends Size {
  empty?: boolean;
  default?: boolean;
  fontSize?: number;
}
