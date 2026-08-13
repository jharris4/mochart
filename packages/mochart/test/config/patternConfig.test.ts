import { describe, expect, it } from 'vitest';
import { enhanceConfig } from '../../src/config/helper';
import type { MochartInputConfig } from '../../src/types/config';
import type { EnhancedMochartConfig } from '../../src/types/enhanced';

const base = {
  version: '1.0.0',
  categoryAxis: { property: 'c' },
  series: [{ property: 'v', renderer: 'bar' }]
};

const enhance = (config: unknown) => enhanceConfig(config as MochartInputConfig) as EnhancedMochartConfig;

describe('built-in pattern config', () => {
  it('applies common and type-specific defaults', () => {
    const config = enhance({ ...base, patterns: [
      { type: 'lines' },
      { type: 'crosshatch' },
      { type: 'dots' }
    ] });

    expect(config.validation).toEqual({ valid: true, errors: [], warnings: [] });
    expect(config.patterns).toEqual([
      expect.objectContaining({ id: 'P0', type: 'lines', spacing: 8, angle: 45, lineWidth: 2,
        foregroundColor: 'series', foregroundOpacity: 1, backgroundColor: null, backgroundOpacity: 1 }),
      expect.objectContaining({ id: 'P1', type: 'crosshatch', spacing: 8, angle: 45, lineWidth: 2 }),
      expect.objectContaining({ id: 'P2', type: 'dots', spacing: 8, radius: 2 })
    ]);
    expect(config.patterns[0]).not.toHaveProperty('radius');
    expect(config.patterns[2]).not.toHaveProperty('angle');
    expect(config.patterns[2]).not.toHaveProperty('lineWidth');
  });

  it('applies common patternDefaults to every type', () => {
    const config = enhance({ ...base,
      patternDefaults: { spacing: 12, foregroundColor: 'currentColor', backgroundColor: 'var(--pattern-bg)' },
      patterns: [{ type: 'lines' }, { type: 'dots' }]
    });

    expect(config.validation.valid).toBe(true);
    expect(config.patterns.map(pattern => pattern.spacing)).toEqual([12, 12]);
    expect(config.patterns.map(pattern => pattern.foregroundColor)).toEqual(['currentColor', 'currentColor']);
  });

  it('rejects type-specific and entry-only properties in patternDefaults', () => {
    const config = enhance({ ...base,
      patternDefaults: { type: 'dots', radius: 3 },
      patterns: [{ type: 'dots' }]
    });

    expect(config.validation.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('patternDefaults - type - entry-only properties cannot be set on an all config'),
      expect.stringContaining('patternDefaults - radius - entry-only properties cannot be set on an all config')
    ]));
  });

  it('rejects properties belonging to a different pattern type', () => {
    const config = enhance({ ...base, patterns: [{ type: 'dots', lineWidth: 2 }] });
    expect(config.validation.errors).toContain(
      'patterns[0] - lineWidth - should be equal to undefined when type is dots: 2'
    );
  });

  it('accepts svg colors, currentColor, series, and a null background', () => {
    const config = enhance({ ...base, patterns: [{
      type: 'lines', foregroundColor: 'series', backgroundColor: null
    }, {
      type: 'dots', foregroundColor: 'currentColor', backgroundColor: 'oklch(0.7 0.1 200)'
    }] });
    expect(config.validation).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it('defaults a sole pattern, supports opt-out, and leaves pattern/gradient combinations explicit', () => {
    const sole = enhance({ ...base, patterns: [{ id: 'hatch', type: 'lines' }] });
    expect(sole.series[0].pattern).toBe('hatch');
    expect(sole.series[0].patternConfig).toBe(sole.patterns[0]);

    const optedOut = enhance({ ...base,
      patterns: [{ id: 'hatch', type: 'lines' }],
      series: [{ property: 'v', renderer: 'bar', pattern: null }]
    });
    expect(optedOut.series[0].pattern).toBeNull();
    expect(optedOut.series[0].patternConfig).toBeUndefined();

    const mixed = enhance({ ...base,
      patterns: [{ id: 'hatch', type: 'lines' }],
      linearGradients: [{ id: 'fade', stops: [{ offset: 0, color: '#000', opacity: 1 }] }]
    });
    expect(mixed.series[0].pattern).toBeNull();
    expect(mixed.series[0].gradient).toBeNull();
  });

  it('does not automatically apply patterns or gradients to incompatible series', () => {
    const line = enhance({ ...base,
      patterns: [{ type: 'lines' }],
      series: [{ property: 'v', renderer: 'line' }]
    });
    expect(line.validation.valid).toBe(true);
    expect(line.series[0].pattern).toBeNull();

    const colorProperty = enhance({ ...base,
      linearGradients: [{ stops: [{ offset: 0, color: '#000', opacity: 1 }] }],
      series: [{ property: 'v', renderer: 'bar', colorProperty: 'color' }]
    });
    expect(colorProperty.validation.valid).toBe(true);
    expect(colorProperty.series[0].gradient).toBeNull();
  });

  it('rejects patterns and gradients on non-fill renderers', () => {
    const pattern = enhance({ ...base,
      patterns: [{ id: 'hatch', type: 'lines' }],
      series: [{ property: 'v', renderer: 'line', pattern: 'hatch' }]
    });
    expect(pattern.validation.errors).toContain(
      'series[0] - pattern - should be equal to null when renderer is not area or bar: "hatch"'
    );

    const gradient = enhance({ ...base,
      linearGradients: [{ id: 'fade', stops: [{ offset: 0, color: '#000', opacity: 1 }] }],
      series: [{ property: 'v', renderer: 'none', gradient: 'fade' }]
    });
    expect(gradient.validation.errors).toContain(
      'series[0] - gradient - should be equal to null when renderer is not area or bar: "fade"'
    );
  });

  it('rejects gradients but permits patterns when colorProperty is set', () => {
    const gradient = enhance({ ...base,
      linearGradients: [{ id: 'fade', stops: [{ offset: 0, color: '#000', opacity: 1 }] }],
      series: [{ property: 'v', renderer: 'bar', colorProperty: 'color', gradient: 'fade' }]
    });
    expect(gradient.validation.errors).toContain(
      'series[0] - gradient - should be equal to null when colorProperty is not null: "fade"'
    );

    const pattern = enhance({ ...base,
      patterns: [{ id: 'dots', type: 'dots' }],
      series: [{ property: 'v', renderer: 'bar', colorProperty: 'color', pattern: 'dots' }]
    });
    expect(pattern.validation.valid).toBe(true);
  });

  it('rejects dangling pattern references and series that specify both pattern and gradient', () => {
    const dangling = enhance({ ...base, series: [{ property: 'v', renderer: 'bar', pattern: 'missing' }] });
    expect(dangling.validation.errors).toContain(
      'series[0] - pattern - should equal the id property of one of the patterns: "missing"'
    );

    const both = enhance({ ...base,
      patterns: [{ id: 'hatch', type: 'lines' }],
      linearGradients: [{ id: 'fade', stops: [{ offset: 0, color: '#000', opacity: 1 }] }],
      series: [{ property: 'v', pattern: 'hatch', gradient: 'fade' }]
    });
    expect(both.validation.errors.some(error => error.startsWith('series[0] - pattern -'))).toBe(true);
  });
});
