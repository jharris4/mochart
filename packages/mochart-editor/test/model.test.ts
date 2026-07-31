import { describe, expect, it } from 'vitest';
import { mochartConfigEditorModel } from '../src';

describe('Mochart config editor model', () => {
  it('contains top-level and section property metadata', () => {
    const series = mochartConfigEditorModel.sections.find(section => section.id === 'seriesConfigs');
    const axis = series?.properties.find(property => property.key === 'axis');

    expect(mochartConfigEditorModel.topLevel.some(property => property.key === 'seriesConfigs')).toBe(true);
    expect(series?.shape).toBe('array');
    expect(axis?.editor.types).toContain('string');
    expect(axis?.reference?.sections).toContain('seriesAxisConfigs');
  });

  it('includes enum and range information derived from validators', () => {
    const chart = mochartConfigEditorModel.sections.find(section => section.id === 'chartConfig');
    const type = chart?.properties.find(property => property.key === 'type');
    const pie = mochartConfigEditorModel.sections.find(section => section.id === 'pieConfig');
    const radius = pie?.properties.find(property => property.key === 'innerRadiusPercent');

    expect(type?.editor.enum).toContain('pie');
    expect(radius?.editor.minimum).toBe(0);
    expect(radius?.editor.maximum).toBe(1);
  });
});
