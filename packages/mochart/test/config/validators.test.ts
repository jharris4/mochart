import { describe, it, expect } from 'vitest';
import configValidators from '../../src/config/validation/validators';

// The config validators wrap movalid; a validator returns true when the value
// is acceptable. These tests pin the mochart-specific validators only.

describe('svgColor', () => {
  const validate = configValidators.svgColor();

  it('accepts hex and rgb colors and the keywords "none" and "currentColor"', () => {
    expect(validate('#fff')).toBe(true);
    expect(validate('#ffffff')).toBe(true);
    expect(validate('rgb(1,2,3)')).toBe(true);
    expect(validate('none')).toBe(true);
    expect(validate('currentColor')).toBe(true);
  });

  it('rejects malformed hex and named/hsl colors', () => {
    expect(validate('#WWW')).toBe(false);
    expect(validate('red')).toBe(false);
    expect(validate('not-a-color')).toBe(false);
  });
});

describe('cssColor', () => {
  const validate = configValidators.cssColor();

  it('accepts hex and rgb colors and the keyword "currentColor"', () => {
    expect(validate('#fff')).toBe(true);
    expect(validate('rgba(0,0,0,0.3)')).toBe(true);
    expect(validate('currentColor')).toBe(true);
  });

  it('rejects "none", which is not a css color', () => {
    // in a css declaration 'none' is dropped as invalid, it does not switch the style off
    expect(validate('none')).toBe(false);
  });

  it('rejects malformed colors', () => {
    expect(validate('#WWW')).toBe(false);
    expect(validate('not-a-color')).toBe(false);
  });
});

describe('cssStyle', () => {
  const validate = configValidators.cssStyle();

  it('accepts a partial style with currentColor', () => {
    expect(validate({ fillColor: 'currentColor' })).toBe(true);
    expect(validate({ strokeColor: 'rgba(0,0,0,0.3)', strokeWidth: 2 })).toBe(true);
    expect(validate({ fillColor: null })).toBe(true);
  });

  it('rejects "none" in either color member', () => {
    expect(validate({ fillColor: 'none' })).toBe(false);
    expect(validate({ strokeColor: 'none' })).toBe(false);
  });
});

describe('dashArray', () => {
  const validate = configValidators.dashArray();

  it('accepts comma-separated numbers', () => {
    expect(validate('5, 5')).toBe(true);
    expect(validate('4')).toBe(true);
  });

  it('rejects non-numeric dash arrays', () => {
    expect(validate('dash')).toBe(false);
  });
});

describe('numberFormat', () => {
  const validate = configValidators.numberFormat();

  it('accepts valid d3 format specifiers', () => {
    expect(validate('$,.2f')).toBe(true);
    expect(validate('.0%')).toBe(true);
  });

  it('rejects invalid specifiers', () => {
    expect(validate('nonsense!!')).toBe(false);
  });
});

describe('propertyRequired', () => {
  const validate = configValidators.propertyRequired();

  it('rejects undefined and null', () => {
    expect(validate(undefined)).toBe(false);
    expect(validate(null)).toBe(false);
  });

  it('accepts a defined value', () => {
    expect(validate('property')).toBe(true);
  });
});

describe('propertyOptional', () => {
  const validate = configValidators.propertyOptional();

  it('accepts null (an explicitly-absent property)', () => {
    expect(validate(null)).toBe(true);
  });

  it('accepts a defined value', () => {
    expect(validate('property')).toBe(true);
  });

  it('rejects undefined', () => {
    expect(validate(undefined)).toBe(false);
  });
});

describe('opacity', () => {
  const validate = configValidators.opacity();

  it('accepts values within [0, 1]', () => {
    expect(validate(0)).toBe(true);
    expect(validate(0.5)).toBe(true);
    expect(validate(1)).toBe(true);
  });

  it('rejects values out of range', () => {
    expect(validate(-0.1)).toBe(false);
    expect(validate(1.5)).toBe(false);
  });
});

describe('margin / padding', () => {
  it('accepts an object of non-negative sides', () => {
    const validate = configValidators.margin();
    expect(validate({ top: 0, right: 1, bottom: 2, left: 3 })).toBe(true);
  });

  it('rejects negative sides', () => {
    const validate = configValidators.padding();
    expect(validate({ top: -1, right: 0, bottom: 0, left: 0 })).toBe(false);
  });
});
