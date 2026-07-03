import {
  NONE, CAP_TYPES
} from '../core/constants';
import validators from './validators';

export default function getValidators() {
  return {
    axis: validators.string(),
    id: validators.string(),
    outerCapSize: validators.numberMin(0),
    outerCapType: validators.oneOf(CAP_TYPES).orEqual(NONE),
    outerCapExpand: validators.boolean(),
  };
}