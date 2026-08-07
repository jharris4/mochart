import validators from './validators';

export default function getValidators() {
  return {
    animate: validators.boolean(),
    initialDuration: validators.numberMin(0),
    expansionDuration: validators.numberMin(0),
    valueChangeDuration: validators.numberMin(0),
    contractionDuration: validators.numberMin(0),
    focusDuration: validators.numberMin(0)
  };
}
