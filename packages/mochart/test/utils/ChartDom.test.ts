/**
 * API-4: `mochartCssClasses` is documented as "the CSS class the renderer puts on it", but some of
 * its values are two space-separated tokens — a shared class plus a prefix the id is appended to —
 * so `'.' + value` is not a selector. The convention is deliberate and the docs now describe it;
 * this pins the shape so a new entry cannot quietly break the description.
 */
import { describe, it, expect } from 'vitest';
import { mochartCssClasses } from '../../src/utils/ChartDom';

/** The one value holding two complete classes rather than a base and a prefix. */
const COMPOUND_EXCEPTION = 'chartError';

describe('mochartCssClasses', () => {
  it('gives every token the library prefix', () => {
    for (const [key, value] of Object.entries(mochartCssClasses)) {
      for (const token of value.split(' ')) {
        expect(token, key).toMatch(/^mochart-/);
      }
    }
  });

  it('makes every two-token value a shared class plus its own id prefix', () => {
    for (const [key, value] of Object.entries(mochartCssClasses)) {
      const tokens = value.split(' ');
      if (tokens.length === 1 || key === COMPOUND_EXCEPTION) {
        continue;
      }
      expect(tokens.length, key).toBe(2);
      // the second token is the first with a trailing dash, ready for the id
      expect(tokens[1], key).toBe(tokens[0] + '-');
    }
  });

  it('keeps chartError as the only compound exception', () => {
    const compound = Object.entries(mochartCssClasses)
      .filter(([, value]) => value.includes(' '))
      .filter(([, value]) => {
        const tokens = value.split(' ');
        return tokens[1] !== tokens[0] + '-';
      })
      .map(([key]) => key);
    expect(compound).toEqual([COMPOUND_EXCEPTION]);
  });
});
