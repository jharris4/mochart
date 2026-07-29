import validators from './validators';
import { CHART_TYPES } from '../core/constants';

export default function getValidators() {
  return {
    type: validators.oneOf(CHART_TYPES),
    margin: validators.objectWith(['top', 'right', 'bottom', 'left'], validators.numberMin(0)),
    padding: validators.objectWith(['top', 'right', 'bottom', 'left'], validators.numberMin(0)),
    backgroundStyle: validators.style()
  };
}
