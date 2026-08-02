import { describe, it, expect } from 'vitest';

import { cssStyleColor, styleToAttributes } from '../../src/utils/style';

// cssStyleColor is the html half of the style contract: the tooltip is a div,
// so it has no fill-opacity/stroke-opacity attribute to write an opacity into
// and the two have to be composited into one css color instead.
describe('cssStyleColor', () => {
  it('returns the color untouched when the opacity is null', () => {
    expect(cssStyleColor('rgba(255,255,255,0.9)', null)).toBe('rgba(255,255,255,0.9)');
    expect(cssStyleColor('#ff0000', null)).toBe('#ff0000');
  });

  it('returns null when the color is null, whatever the opacity', () => {
    expect(cssStyleColor(null, null)).toBeNull();
    expect(cssStyleColor(null, 0.5)).toBeNull();
  });

  it('composites an opacity into the color', () => {
    expect(cssStyleColor('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
  });

  it('multiplies the opacity into the color\'s own alpha', () => {
    expect(cssStyleColor('rgba(0,0,255,0.4)', 0.5)).toBe('rgba(0, 0, 255, 0.2)');
  });

  it('passes a keyword color through, having no parsed form to composite into', () => {
    expect(cssStyleColor('currentColor', 0.5)).toBe('currentColor');
  });
});

describe('styleToAttributes', () => {
  it('writes only the members the style has, so a line style never writes a fill', () => {
    expect(styleToAttributes({ strokeColor: 'currentColor', strokeOpacity: 0.3, strokeWidth: 3 }))
      .toEqual({ stroke: 'currentColor', strokeOpacity: 0.3, strokeWidth: 3 });
  });
});
