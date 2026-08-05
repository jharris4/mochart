import validators from './validators';

export default function getValidators() {
  return {
    inverted: validators.boolean(),
    margin: validators.margin(),
    padding: validators.padding(),
    backgroundStyle: validators.style()
  };
}