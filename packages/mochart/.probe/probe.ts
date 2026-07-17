import validators from 'movalid';
const b = validators.boolean();
const m = validators.numberMin(0);
export { b, m };
