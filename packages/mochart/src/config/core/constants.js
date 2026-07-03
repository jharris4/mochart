export const CONFIG_VERSION = '1.0.3';

export const AUTO = 'auto';
export const NONE = null;

export const TOP = 'top';
export const RIGHT = 'right';
export const BOTTOM = 'bottom';
export const LEFT = 'left';

export const TOP_RIGHT_BOTTOM_LEFT = [TOP, RIGHT, BOTTOM, LEFT];

export const MARGIN_KEYS = TOP_RIGHT_BOTTOM_LEFT;
export const PADDING_KEYS = TOP_RIGHT_BOTTOM_LEFT;

export const ELLIPSIS = '\u2026'; // or '...' ?

export const ALIGN_LEFT = 'left';
export const ALIGN_CENTER = 'center';
export const ALIGN_RIGHT = 'right';

export const ALIGNS = [
  ALIGN_LEFT, ALIGN_CENTER, ALIGN_RIGHT
];

export const VERTICAL_ALIGN_TOP = 'top';
export const VERTICAL_ALIGN_MIDDLE = 'middle';
export const VERTICAL_ALIGN_BOTTOM = 'bottom';

export const VERTICAL_ALIGNS = [
  VERTICAL_ALIGN_TOP, VERTICAL_ALIGN_MIDDLE, VERTICAL_ALIGN_BOTTOM
];

export const ANCHOR_START = 'start';
export const ANCHOR_END = 'end';
export const ANCHOR_MIDDLE = 'middle';

export const ANCHORS = [
  ANCHOR_START, ANCHOR_END, ANCHOR_MIDDLE
];

export const POSITION_TOP = 'top';
export const POSITION_BOTTOM = 'bottom';

export const POSITIONS = [
  POSITION_TOP, POSITION_BOTTOM
];

export const SCALE_ORDINAL = 'ordinal';
export const SCALE_LINEAR = 'linear';

export const SCALES = [
  SCALE_ORDINAL, SCALE_LINEAR
];

export const TYPE_STRING = 'string';
export const TYPE_NUMBER = 'number';
export const TYPE_DATE = 'date';

export const TYPES = [
  TYPE_STRING, TYPE_NUMBER, TYPE_DATE
];

export const RENDERER_BAR = 'bar';
export const RENDERER_LINE = 'line';
export const RENDERER_AREA = 'area';
export const RENDERER_NONE = 'none';

export const RENDERERS = [
  RENDERER_BAR, RENDERER_LINE, RENDERER_AREA, RENDERER_NONE
];

export const CURVE_TYPE_LINEAR = 'linear';
export const CURVE_TYPE_MONOTONE_X = 'monotoneX';
export const CURVE_TYPE_MONOTONE_Y = 'monotoneY';
export const CURVE_TYPE_BASIS = 'basis';
export const CURVE_TYPE_CARDINAL = 'cardinal';
export const CURVE_TYPE_CATMULL_ROM = 'catmullRom';
export const CURVE_TYPE_NATURAL = 'natural';
export const CURVE_TYPE_STEP = 'step';
export const CURVE_TYPE_STEP_BEFORE = 'stepBefore';
export const CURVE_TYPE_STEP_AFTER = 'stepAfter';

export const CURVE_TYPES = [
  CURVE_TYPE_LINEAR, CURVE_TYPE_MONOTONE_X, CURVE_TYPE_MONOTONE_Y, CURVE_TYPE_BASIS, CURVE_TYPE_CARDINAL,
  CURVE_TYPE_CATMULL_ROM, CURVE_TYPE_NATURAL, CURVE_TYPE_STEP, CURVE_TYPE_STEP_BEFORE, CURVE_TYPE_STEP_AFTER
];

export const CAP_TYPE_POINT = 'point';
export const CAP_TYPE_CURVE = 'curve';
export const CAP_TYPE_ROUND = 'round';

export const CAP_TYPES = [
  CAP_TYPE_POINT, CAP_TYPE_CURVE, CAP_TYPE_ROUND
];

export const LABEL_POSITION_INSIDE = 'inside';
export const LABEL_POSITION_CENTER = 'center';
export const LABEL_POSITION_OUTSIDE = 'outside';

export const LABEL_POSITIONS = [
  LABEL_POSITION_INSIDE, LABEL_POSITION_CENTER, LABEL_POSITION_OUTSIDE
];

export const COLOR_SERIES = 'series'
export const COLOR_SAME = 'same';
export const COLOR_SERIES_INDEX = 'seriesIndex';
export const COLOR_GROUP_INDEX ='groupIndex';

export const COLORS = [
  COLOR_SERIES, COLOR_SAME, COLOR_SERIES_INDEX, COLOR_GROUP_INDEX
];

export const COLOR_INTERPOLATION_RGB = 'rgb';
export const COLOR_INTERPOLATION_HSL = 'hsl';
export const COLOR_INTERPOLATION_LAB = 'lab';
export const COLOR_INTERPOLATION_HCL = 'hcl';

export const COLOR_INTERPOLATIONS = [
  COLOR_INTERPOLATION_RGB, COLOR_INTERPOLATION_HSL, COLOR_INTERPOLATION_LAB, COLOR_INTERPOLATION_HCL
];

export const MARKER_SHAPE_CIRCLE = 'circle';
export const MARKER_SHAPE_CROSS = 'cross';
export const MARKER_SHAPE_DIAMOND = 'diamond';
export const MARKER_SHAPE_SQUARE = 'square';
export const MARKER_SHAPE_STAR = 'star';
export const MARKER_SHAPE_TRIANGLE = 'triangle';
export const MARKER_SHAPE_WYE = 'wye';

export const MARKER_SHAPES = [
  MARKER_SHAPE_CIRCLE, MARKER_SHAPE_CROSS, MARKER_SHAPE_DIAMOND, MARKER_SHAPE_SQUARE,
  MARKER_SHAPE_STAR, MARKER_SHAPE_TRIANGLE, MARKER_SHAPE_WYE
];