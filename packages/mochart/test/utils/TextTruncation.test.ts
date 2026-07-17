import { describe, it, expect } from 'vitest';
import {
  prepareTruncation,
  getTruncatedText,
  truncateSVGText,
  updateTruncation,
  type TruncationData
} from '../../src/utils/TextTruncation';

// jsdom does not implement getComputedTextLength; stub the one method the
// truncation logic reads off an SVGTextContentElement.
const el = (len: number) => ({ getComputedTextLength: () => len } as unknown as SVGTextContentElement);

const ELLIPSIS = '…';

describe('prepareTruncation', () => {
  it('does nothing when truncation is disabled', () => {
    expect(prepareTruncation(false, true, null)).toEqual({ truncationData: null, checkTruncation: false });
  });

  it('flags a check but has no data on first enable with no prior data', () => {
    expect(prepareTruncation(true, true, null)).toEqual({ truncationData: null, checkTruncation: true });
  });

  it('resets prior single data (clears lastText) when changed and integrity changed', () => {
    const old: TruncationData = { text: 'Hello', truncatedText: 'Hel', lastText: 'Hell' };
    const { truncationData, checkTruncation } = prepareTruncation(true, true, old, true);
    expect(checkTruncation).toBe(true);
    expect(truncationData).toEqual({ text: 'Hello', truncatedText: 'Hel', lastText: undefined });
  });

  it('resets each entry of prior array data', () => {
    const old: TruncationData[] = [
      { text: 'a', truncatedText: 'a', lastText: 'a' },
      { text: 'bb', truncatedText: 'b', lastText: 'bb' }
    ];
    const { truncationData } = prepareTruncation(true, true, old, true);
    expect(truncationData).toEqual([
      { text: 'a', truncatedText: 'a', lastText: undefined },
      { text: 'bb', truncatedText: 'b', lastText: undefined }
    ]);
  });

  it('drops prior data when integrity did not change', () => {
    const old: TruncationData = { text: 'Hello', truncatedText: 'Hel' };
    const { truncationData } = prepareTruncation(true, true, old, false);
    expect(truncationData).toBe(null);
  });

  it('keeps prior data and skips the check when nothing changed', () => {
    const old: TruncationData = { text: 'Hello', truncatedText: 'Hel' };
    expect(prepareTruncation(true, false, old)).toEqual({ truncationData: old, checkTruncation: false });
  });
});

describe('getTruncatedText', () => {
  it('returns the text untouched when disabled or data is null', () => {
    expect(getTruncatedText(false, ELLIPSIS, 'Hello', { text: 'Hello', truncatedText: 'Hel' })).toBe('Hello');
    expect(getTruncatedText(true, ELLIPSIS, 'Hello', null)).toBe('Hello');
  });

  it('appends the truncation value to a truncated single string', () => {
    expect(getTruncatedText(true, ELLIPSIS, 'Hello', { text: 'Hello', truncatedText: 'Hel' })).toBe('Hel' + ELLIPSIS);
  });

  it('leaves an untruncated single string alone', () => {
    expect(getTruncatedText(true, ELLIPSIS, 'Hi', { text: 'Hi', truncatedText: 'Hi' })).toBe('Hi');
  });

  it('truncates only the entries that changed in an array', () => {
    const data: TruncationData[] = [
      { text: 'Hello', truncatedText: 'Hel' },
      { text: 'Hi', truncatedText: 'Hi' }
    ];
    expect(getTruncatedText(true, ELLIPSIS, ['Hello', 'Hi'], data)).toEqual(['Hel' + ELLIPSIS, 'Hi']);
  });
});

describe('truncateSVGText', () => {
  it('settles empty text immediately', () => {
    expect(truncateSVGText(el(0), 100, ELLIPSIS, { text: '' })).toEqual({ text: '', truncatedText: '', lastText: '' });
  });

  it('returns unchanged once truncatedText equals lastText (settled)', () => {
    const data: TruncationData = { text: 'Hello', truncatedText: 'Hel', lastText: 'Hel' };
    expect(truncateSVGText(el(50), 100, ELLIPSIS, data)).toBe(data);
  });

  it('makes an initial proportional guess when over the limit for the first time', () => {
    // length 200, max 100 => keep ~half: floor((100/200)*11)=5 chars of "Hello World"
    const out = truncateSVGText(el(200), 100, ELLIPSIS, { text: 'Hello World' });
    expect(out).toEqual({ text: 'Hello World', truncatedText: 'Hello', lastText: 'Hello World' });
  });

  it('shrinks by one character on a subsequent over-limit pass', () => {
    const out = truncateSVGText(el(150), 100, ELLIPSIS, { text: 'Hello World', truncatedText: 'Hello', lastText: 'Hello World' });
    expect(out).toEqual({ text: 'Hello World', truncatedText: 'Hell', lastText: 'Hello' });
  });

  it('grows by one character when back under the limit', () => {
    const out = truncateSVGText(el(50), 100, ELLIPSIS, { text: 'Hello', truncatedText: 'He', lastText: 'H' });
    expect(out).toEqual({ text: 'Hello', truncatedText: 'Hel', lastText: 'He' });
  });

  it('settles when under the limit and no longer growing', () => {
    const out = truncateSVGText(el(50), 100, ELLIPSIS, { text: 'Hello', truncatedText: 'He', lastText: 'Hel' });
    expect(out).toEqual({ text: 'Hello', truncatedText: 'He', lastText: 'He' });
  });
});

describe('updateTruncation', () => {
  it('seeds single truncation data and skips measuring when there is no dom element', () => {
    const { checkTruncation, truncationData } = updateTruncation(ELLIPSIS, null, 'Hello', 100, null);
    expect(checkTruncation).toBe(false);
    expect(truncationData).toEqual({ text: 'Hello' });
  });

  it('measures and truncates a single element that overflows', () => {
    const { checkTruncation, truncationData } = updateTruncation(ELLIPSIS, null, 'Hello World', 100, el(200));
    expect(checkTruncation).toBe(true);
    expect(truncationData).toEqual({ text: 'Hello World', truncatedText: 'Hello', lastText: 'Hello World' });
  });

  it('seeds and measures an array of elements', () => {
    const { truncationData } = updateTruncation(ELLIPSIS, null, ['ab', 'cd'], 100, [el(50), el(50)]);
    expect(Array.isArray(truncationData)).toBe(true);
    expect(truncationData).toHaveLength(2);
  });
});
