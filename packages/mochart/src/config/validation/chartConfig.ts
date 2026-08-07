import validators from './validators';
import { CHART_TYPES } from '../core/constants';

export default function getValidators() {
  return {
    type: validators.oneOf(CHART_TYPES),
    accessibility: validators.boolean(),
    margin: validators.margin(),
    padding: validators.padding(),
    backgroundStyle: validators.style()
  };
}
