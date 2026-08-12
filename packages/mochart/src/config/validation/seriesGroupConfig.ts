import validators from './validators';

export default function getValidators() {
  return {
    id: validators.string(),
    ignore: validators.boolean(),
  };
}