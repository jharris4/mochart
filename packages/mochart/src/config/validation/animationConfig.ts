import validators from './validators';
import { DOMAIN_CHANGES } from '../core/constants';

export default function getValidators() {
  return {
    animate: validators.boolean(),
    domainChange: validators.oneOf(DOMAIN_CHANGES),
    initialDuration: validators.numberMin(0),
    expansionDuration: validators.numberMin(0),
    valueChangeDuration: validators.numberMin(0),
    contractionDuration: validators.numberMin(0),
    focusDuration: validators.numberMin(0)
  };
}
