# @mochart/movalid

Simple yet powerful TypeScript validators with chainable extensions and
human-readable error messages.

Every validator is a factory: calling `validators.number()` returns a plain
predicate function `(value) => boolean` that also carries metadata —
`errorMessage`, `getErrorMessage(value)`, `allowedValues`, `rangeValues`,
`nestedValues`, and `isEnum` — so callers can both check values and report
readable errors. [@mochart/core](../mochart/README.md) uses it for config
validation.

## Usage

```js
import validators from '@mochart/movalid';

const isRenderer = validators.oneOf(['bar', 'line', 'area']).orEqual(undefined);

isRenderer('bar');        // true
isRenderer('pie');        // false
isRenderer.errorMessage;  // 'should be one of [ "bar", "line", "area" ] or be equal to undefined'
isRenderer.getErrorMessage('pie');
// 'should be one of [ "bar", "line", "area" ] or be equal to undefined: "pie"'
```

## Validators

All are called as `validators.name(...args)`:

- **Types** — `boolean`, `number`, `string`, `array`, `object`, `any`
- **Custom types** — `numeric`, `integer`, `color` (hex/rgb/rgba),
  `dateInstance` (a valid `Date` object), `dateISO` (iso date string),
  `datePrimitive` (iso date string or epoch number), `dateAny` (any of the three)
- **Instances** — `instanceOf(Class)`, `typeOf('object')`, `custom(fn)` (give
  `fn` a `message` property)
- **Ranges** — `numberMin/Max/MinMax`, `numericMin/Max/MinMax`,
  `integerMin/Max/MinMax`
- **Strings** — `regexp(re)`, `stringWithLength(n)`,
  `stringWithLengthMin/Max/MinMax`
- **Values** — `equal(v)`, `oneOf([...])`, `oneIn({...})`, `notEqual(v)`,
  `notOneOf([...])`, `notOneIn({...})`
- **Arrays** — `arrayWithLength(n)`, `arrayWithLengthMin/Max/MinMax`,
  `arrayOf(validator, allowEmpty)`
- **Objects** — `objectWith(properties, validator)`,
  `objectWithSome(properties, validator)`,
  `objectWithShape({ prop: validator, … }, allowExtraProperties)`
- **Combinators** — `or([...validators])`, `and([...validators])`,
  `not(validator)`
- **Conditional** — `validators.conditional(rules, object)` picks the first
  rule whose `condition(object)` matches and uses its `validator`

The bare type predicates are also exported directly for convenience:

```js
import { typeValidators, customTypeValidators } from '@mochart/movalid';
typeValidators.string('hi'); // true
```

TypeScript types are exported as well: `Validator` (the predicate-with-metadata
shape returned by every factory), `Validators`, `CustomValidator`,
`ConditionalRule`, and `RangeValues`.

## Chainable extensions

Every validator can be extended; extensions widen what passes and extend the
error message:

- `.orEqual(value)` / `.orOneOf([...])` / `.or(otherValidator)`
- `.withMessage(msg)` / `.appendMessage(msg)` / `.prependMessage(msg)` —
  override or decorate the error message without changing behavior

```js
const size = validators.numberMin(0).orEqual('auto').withMessage('should be a size');
```

## Development

```sh
npm test -w @mochart/movalid
```

## License

MIT
