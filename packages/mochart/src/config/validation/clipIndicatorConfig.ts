import validators from './validators';
import { AUTO, NONE } from '../core/constants';

export default function getValidators() {
  return {
    visible: validators.boolean(),
    size: validators.numberMin(0).orEqual(AUTO),
    padding: validators.numberMin(0),
    label: validators.string().orEqual(NONE),
    textStyle: validators.style(),
    style: validators.style(),
    hatch: validators.objectWithShape({
      spacing: validators.numberMin(0),
      width: validators.numberMin(0)
    }).orEqual(NONE),
    showInFront: validators.boolean()
  };
}
