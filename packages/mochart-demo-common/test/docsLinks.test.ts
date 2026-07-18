import { describe, it, expect } from 'vitest';

import { getDocsBaseUrl, getReferenceSectionIds, getReferenceSectionUrl } from '../src/docsLinks';

describe('getDocsBaseUrl', () => {
  it('strips the gallery slug from the base path', () => {
    expect(getDocsBaseUrl('/mochart/vanilla/')).toBe('/mochart/');
    expect(getDocsBaseUrl('/mochart/vanilla')).toBe('/mochart/');
    expect(getDocsBaseUrl('/react/')).toBe('/');
  });

  it('falls back to the root for a bare base', () => {
    expect(getDocsBaseUrl('/')).toBe('/');
    expect(getDocsBaseUrl('')).toBe('/');
  });
});

describe('getReferenceSectionIds', () => {
  it('returns the sections a config uses, in reference order', () => {
    expect(getReferenceSectionIds({
      version: '1.0.0',
      seriesConfigs: [],
      titleConfig: {},
      animationConfig: {}
    })).toEqual(['animationConfig', 'seriesConfigs', 'titleConfig']);
  });

  it('maps *AllConfig keys onto their list section', () => {
    expect(getReferenceSectionIds({
      seriesAllConfig: {},
      seriesStackAllConfig: {}
    })).toEqual(['seriesConfigs', 'seriesStackConfigs']);
  });

  it('ignores unknown keys and empty configs', () => {
    expect(getReferenceSectionIds({ version: '1.0.0', id: 'x' })).toEqual([]);
    expect(getReferenceSectionIds(null)).toEqual([]);
  });
});

describe('getReferenceSectionUrl', () => {
  it('builds the section page url from the base', () => {
    expect(getReferenceSectionUrl('seriesConfigs', '/mochart/vanilla/')).toBe('/mochart/reference/seriesConfigs');
  });
});
