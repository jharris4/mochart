import { describe, it, expect } from 'vitest';

import { encodeShareState, decodeShareState } from '../src/shareState';
import type { ShareState } from '../src/shareState';

const state: ShareState = {
  config: {
    version: '1.0.0',
    titleConfig: { title: 'Ünïcode — dashes & “quotes”' },
    groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
    seriesConfigs: [{ property: 'revenue', title: 'Revenue' }]
  },
  data: [
    { month: 'Jan', revenue: 10 },
    { month: 'Fév', revenue: 20.5 },
    { month: 'Mär', revenue: null }
  ]
};

describe('shareState codec', () => {
  it('round-trips config and data', () => {
    const decoded = decodeShareState(encodeShareState(state));
    expect(decoded).toEqual(state);
  });

  it('produces URL-safe output', () => {
    const encoded = encodeShareState(state);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('returns null for malformed payloads', () => {
    expect(decodeShareState('not base64!!!')).toBeNull();
    expect(decodeShareState(btoa('not json'))).toBeNull();
    expect(decodeShareState(btoa('"just a string"'))).toBeNull();
    expect(decodeShareState(btoa('{"config": 5, "data": []}'))).toBeNull();
    expect(decodeShareState(btoa('{"config": {}, "data": {}}'))).toBeNull();
    expect(decodeShareState(btoa('{"config": {}, "data": [1, 2]}'))).toBeNull();
    expect(decodeShareState('')).toBeNull();
  });

  it('accepts an empty dataset', () => {
    const empty: ShareState = { config: { version: '1.0.0' }, data: [] };
    expect(decodeShareState(encodeShareState(empty))).toEqual(empty);
  });
});
