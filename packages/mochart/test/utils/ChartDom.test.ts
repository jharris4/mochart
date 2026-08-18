// some `mochartCssClasses` values are two space-separated tokens (a shared class plus a prefix the id is appended to), so `'.' + value` is not a selector; the convention is deliberate and documented, and this pins the shape
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
      // the second token is the first with a trailing dash (an `-id-` segment when it takes a configured id), ready for the id
      expect(tokens[1], key).toMatch(new RegExp('^' + tokens[0] + '(-id)?-$'));
    }
  });

  // Regression: an id equal to a structural suffix (series `bar`, legend item `text`) used to spell out that class
  it('namespaces the prefixes that take a configured id', () => {
    for (const key of ['series', 'legendItem', 'tooltipSeriesLine', 'valueAxis', 'valueAxisGrid', 'valueAxisBaseLine', 'valueAxisThreshold'] as const) {
      expect(mochartCssClasses[key].split(' ')[1], key).toMatch(/-id-$/);
    }
    // so no id can spell out another structural class
    const structural = Object.values(mochartCssClasses).flatMap(value => value.split(' ')).filter(token => !token.endsWith('-'));
    for (const [key, value] of Object.entries(mochartCssClasses)) {
      const prefix = value.split(' ')[1];
      if (prefix !== undefined && prefix.endsWith('-id-')) {
        expect(structural.filter(token => token.startsWith(prefix)), key).toEqual([]);
      }
    }
  });

  it('keeps chartError as the only compound exception', () => {
    const compound = Object.entries(mochartCssClasses)
      .filter(([, value]) => value.includes(' '))
      .filter(([, value]) => {
        const tokens = value.split(' ');
        return !new RegExp('^' + tokens[0] + '(-id)?-$').test(tokens[1]);
      })
      .map(([key]) => key);
    expect(compound).toEqual([COMPOUND_EXCEPTION]);
  });
});
