import validators from './validators';

export default function getValidators() {
  return {
    margin: validators.objectWith(['top', 'right', 'bottom', 'left'], validators.numberMin(0)),
    padding: validators.objectWith(['top', 'right', 'bottom', 'left'], validators.numberMin(0)),
    backgroundStyle: validators.style()
  };
}