/**
 * CONFIG-5: the config interfaces in src/types/config.ts and the validators in src/config/validation
 * are the two halves of one contract, and they had drifted in both directions — types that rejected
 * values the validators accept (a date category axis takes an ISO date string bound; the tooltip's
 * filtered-value character takes null), and types that allowed values the validators reject (a value
 * axis is always a linear number scale).
 *
 * The per-row tests below pin each case. The `types agree with the validators` ratchet is the general
 * form: it walks every section interface against that section's validators and reports any string
 * literal the type allows and the validators reject, any disagreement over null, any free-string form
 * the validators accept and the type cannot express, and any optionality that does not match whether
 * the section has a default. It reported all five type-side rows of the finding before they were fixed.
 */
import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { MochartInputConfig } from '../../src';
import validateConfig, { configWithoutAllValidators } from '../../src/config/validation/mochartConfig';
import { getDefaults } from '../../src/config/defaults/mochartConfig';
import { buildConfigReference } from '../../scripts/configReferenceModel';

const V = '1.0.0';

function errorsFor(config: MochartInputConfig): string[] {
  const defaults = getDefaults(config as never);
  return validateConfig(config, defaults as never).errors;
}

describe('category axis bounds accept the date forms the validators accept', () => {
  // the type had no string, so this literal was a compile error even though the validators accept it
  const config: MochartInputConfig = {
    version: V,
    categoryAxis: {
      property: 'c', type: 'date', scale: 'linear',
      min: '2020-01-01', max: '2021-01-01', softMin: '2020-02-01', softMax: '2020-12-01'
    },
    series: [{ property: 'v' }]
  };

  it('validates an ISO date string min/max/softMin/softMax', () => {
    expect(errorsFor(config)).toEqual([]);
  });

  it('still validates the timestamp form', () => {
    expect(errorsFor({
      version: V,
      categoryAxis: { property: 'c', type: 'date', scale: 'linear', min: 1577836800000, max: 1609459200000 },
      series: [{ property: 'v' }]
    })).toEqual([]);
  });

  it('rejects a date string on a linear number axis, as before', () => {
    expect(errorsFor({
      version: V,
      categoryAxis: { property: 'c', type: 'number', scale: 'linear', min: '2020-01-01' },
      series: [{ property: 'v' }]
    })).toContain('categoryAxis - min - should be a number or be equal to "auto" when scale is linear and type is number: "2020-01-01"');
  });
});

describe('value axis scale and type are the single values the validators accept', () => {
  it('rejects an ordinal scale at typecheck time', () => {
    const config: MochartInputConfig = {
      version: V,
      categoryAxis: { property: 'c' },
      // @ts-expect-error a value axis is always linear; the validator rejects anything else
      valueAxes: [{ id: 'A', scale: 'ordinal' }],
      series: [{ property: 'v' }]
    };
    expect(errorsFor(config)).toContain('valueAxes[0] - scale - should be equal to "linear": "ordinal"');
  });

  it('rejects a string type at typecheck time', () => {
    const config: MochartInputConfig = {
      version: V,
      categoryAxis: { property: 'c' },
      // @ts-expect-error a value axis is always numeric; the validator rejects anything else
      valueAxes: [{ id: 'A', type: 'string' }],
      series: [{ property: 'v' }]
    };
    expect(errorsFor(config)).toContain('valueAxes[0] - type - should be equal to "number": "string"');
  });

  it('accepts the two values it does allow', () => {
    expect(errorsFor({
      version: V,
      categoryAxis: { property: 'c' },
      valueAxes: [{ id: 'A', scale: 'linear', type: 'number' }],
      series: [{ property: 'v' }]
    })).toEqual([]);
  });
});

describe('tooltip filteredValueCharacter takes the documented null', () => {
  it('validates null, the value the docs name for "no character"', () => {
    // the type was `string`, so this literal was a compile error
    const config: MochartInputConfig = {
      version: V,
      categoryAxis: { property: 'c' },
      series: [{ property: 'v' }],
      tooltip: { filteredValueCharacter: null }
    };
    expect(errorsFor(config)).toEqual([]);
  });

  it('still rejects a multi-character string', () => {
    expect(errorsFor({
      version: V,
      categoryAxis: { property: 'c' },
      series: [{ property: 'v' }],
      tooltip: { filteredValueCharacter: '--' }
    })).toContain('tooltip - filteredValueCharacter - should be a string with length 1 or be equal to null: "--"');
  });
});

/**
 * The finding's sixth row wanted `stops` made required. It is optional in the type on purpose: the
 * same shape carries `linearGradientDefaults`, which may supply the stops for every entry, and a
 * config that supplies them nowhere is built anyway with the error reported by validation — exactly
 * how `categoryAxis.property` and `series.property`, the other two properties with no default,
 * are typed. These pin the runtime half of the contract instead.
 */
describe('gradient stops have no default and are required by validation', () => {
  it('reports an entry with no stops', () => {
    expect(errorsFor({
      version: V,
      categoryAxis: { property: 'c' },
      series: [{ property: 'v' }],
      linearGradients: [{ id: 'G' }]
    }).length).toBe(1);
  });

  it('accepts an entry whose stops come from linearGradientDefaults', () => {
    expect(errorsFor({
      version: V,
      categoryAxis: { property: 'c' },
      series: [{ property: 'v' }],
      linearGradientDefaults: { stops: [{ offset: 0, color: '#000000', opacity: 1 }] },
      linearGradients: [{ id: 'G' }]
    })).toEqual([]);
  });

  it('rejects an empty stops array', () => {
    expect(errorsFor({
      version: V,
      categoryAxis: { property: 'c' },
      series: [{ property: 'v' }],
      radialGradients: [{ id: 'G', stops: [] }]
    }).length).toBe(1);
  });
});

// --- the general ratchet -----------------------------------------------------

const typesPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'types', 'config.ts');

const sectionInterfaceMap: Record<string, string> = {
  accessibility: 'AccessibilityConfig',
  animation: 'AnimationConfig',
  chart: 'ChartConfig',
  colorPalette: 'ColorPaletteConfig',
  clipIndicator: 'ClipIndicatorConfig',
  crosshair: 'CrosshairConfig',
  categoryAxis: 'CategoryAxisConfig',
  legend: 'LegendConfig',
  linearGradients: 'LinearGradientConfig',
  pie: 'PieConfig',
  plot: 'PlotConfig',
  radialGradients: 'RadialGradientConfig',
  valueAxes: 'ValueAxisConfig',
  series: 'SeriesConfig',
  seriesGroups: 'SeriesGroupConfig',
  seriesStacks: 'SeriesStackConfig',
  title: 'TitleConfig',
  tooltip: 'TooltipConfig'
};

// The category axis validators are conditional on type/scale, so they are evaluated under every
// combination: a value the type allows only has to be accepted by one of the branches.
const conditionConfigs: Record<string, Record<string, unknown>[]> = {
  categoryAxis: [
    { type: 'string', scale: 'ordinal' }, { type: 'number', scale: 'ordinal' }, { type: 'date', scale: 'ordinal' },
    { type: 'number', scale: 'linear' }, { type: 'date', scale: 'linear' }
  ]
};

// Free-string forms probed against the validators: one accepted here means the type must be able to
// express a string, which is how the date-string axis bounds were caught.
const stringProbes = ['2020-01-01', 'zzzz'];

// section.key -> why its optionality does not follow from having a default.
const optionalityExceptions: Record<string, string> = {
  'series.axis': 'the default only applies when there is exactly one value axis; with several, nothing is filled in',
  'seriesStacks.axis': 'the default only applies when there is exactly one value axis; with several, nothing is filled in'
};

function typeParts(type: ts.Type): ts.Type[] {
  return type.isUnion() ? type.types : [type];
}

function admitsString(part: ts.Type): boolean {
  return (part.flags & ts.TypeFlags.String) !== 0
    || (part.isIntersection() && part.types.some(inner => (inner.flags & ts.TypeFlags.String) !== 0));
}

describe('types agree with the validators', () => {
  const program = ts.createProgram([typesPath], {
    strict: true, noEmit: true, target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler
  });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(typesPath)!;
  const declarations = new Map<string, ts.InterfaceDeclaration>();
  for (const statement of sourceFile.statements) {
    if (ts.isInterfaceDeclaration(statement)) {
      declarations.set(statement.name.text, statement);
    }
  }
  const { model } = buildConfigReference();

  const mismatches: string[] = [];
  const checkedSections: string[] = [];
  for (const [sectionId, interfaceName] of Object.entries(sectionInterfaceMap)) {
    const declaration = declarations.get(interfaceName);
    if (declaration === undefined) {
      mismatches.push(sectionId + ': no interface named ' + interfaceName);
      continue;
    }
    checkedSections.push(sectionId);
    const section = configWithoutAllValidators[sectionId]!;
    const branches = (conditionConfigs[sectionId] ?? [{}])
      .map(condition => section.validators ? section.validators(condition as never) : {});
    const interfaceType = checker.getTypeAtLocation(declaration);
    const members = new Map(checker.getPropertiesOfType(interfaceType).map(member => [member.name, member]));

    for (const [key, member] of members) {
      const validators = branches.map(branch => branch[key]).filter(validator => validator !== undefined);
      if (validators.length === 0) {
        continue;
      }
      const accepts = (value: unknown) => validators.some(validator => validator(value) === true);
      const memberType = checker.getTypeOfSymbolAtLocation(member, declaration);
      const memberTypeText = checker.typeToString(memberType);
      const where = interfaceName + '.' + key + ' (' + memberTypeText + ')';
      const parts = typeParts(memberType);

      for (const part of parts) {
        if (part.isStringLiteral() && !accepts(part.value)) {
          mismatches.push(where + ': the type allows "' + part.value + '", the validator rejects it');
        }
      }
      const typeHasNull = parts.some(part => (part.flags & ts.TypeFlags.Null) !== 0);
      if (typeHasNull !== accepts(null)) {
        mismatches.push(where + ': the type ' + (typeHasNull ? 'allows' : 'rejects')
          + ' null, the validator does not');
      }
      if (!parts.some(admitsString)) {
        for (const probe of stringProbes) {
          if (accepts(probe)) {
            mismatches.push(where + ': the validator accepts "' + probe + '", the type cannot express a string');
          }
        }
      }
    }

    for (const property of model.sections.find(candidate => candidate.id === sectionId)?.properties ?? []) {
      const member = members.get(property.key);
      if (member === undefined) {
        mismatches.push(interfaceName + '.' + property.key + ': documented for ' + sectionId + ' but not declared');
        continue;
      }
      if (optionalityExceptions[sectionId + '.' + property.key] !== undefined) {
        continue;
      }
      const optional = (member.flags & ts.SymbolFlags.Optional) !== 0;
      const hasDefault = (property.default !== undefined && property.default.kind !== 'none')
        || property.conditionalDefaults !== undefined;
      if (optional === hasDefault) {
        mismatches.push(interfaceName + '.' + property.key + ': declared ' + (optional ? 'optional' : 'required')
          + ' but it ' + (hasDefault ? 'has' : 'has no') + ' default');
      }
    }
  }

  it('checks every config section', () => {
    expect(checkedSections).toEqual(Object.keys(sectionInterfaceMap));
  });

  it('finds no property whose type and validator disagree', () => {
    expect(mismatches).toEqual([]);
  });
});
