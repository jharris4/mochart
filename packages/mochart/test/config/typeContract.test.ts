// the config interfaces and the validators are two halves of one contract; the per-row tests pin known drift cases and the ratchet walks every section interface against its validators
import { describe, it, expect } from 'vitest';
import ts from 'typescript';

import type { MochartInputConfig } from '../../src';
import validateConfig, { configWithoutAllValidators } from '../../src/config/validation/mochartConfig';
import { getDefaults } from '../../src/config/defaults/mochartConfig';
import { buildConfigReference, getRuntimeSectionIds } from '../../scripts/configReferenceModel';
import { sectionInterfaceMap, typesPath } from '../../scripts/generateJsdoc';

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

// stops is optional in the type on purpose (linearGradientDefaults may supply it) and required by validation, like categoryAxis.property and series.property
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
  'patterns.type': 'the pattern type is the required discriminator for each entry',
  'patterns.angle': 'the default only applies to line and crosshatch patterns; dots do not have an angle',
  'patterns.lineWidth': 'the default only applies to line and crosshatch patterns; dots do not have a line width',
  'patterns.radius': 'the default only applies to dot patterns; line and crosshatch patterns do not have a radius',
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
    expect([...checkedSections].sort()).toEqual(getRuntimeSectionIds());
  });

  it('finds no property whose type and validator disagree', () => {
    expect(mismatches).toEqual([]);
  });
});
