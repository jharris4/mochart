// Generates JSDoc comments on the config interfaces in src/types/config.ts
// from the config-reference model (descriptions, details, defaults), so IDE
// hovers and the shipped .d.ts document every config property from the same
// source as the generated reference docs. Existing JSDoc on covered
// properties is replaced; properties without a model entry (back-references,
// internal fields) are left untouched.
//
// Usage: tsx scripts/generateJsdoc.ts [--check]
// --check exits 1 when src/types/config.ts differs from the generated output
// (the same ratchet is enforced by test/config/jsdocSync.test.ts).

import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  buildConfigReference,
  type ConditionalDefaultValue,
  type DefaultValue,
  type PropertyDoc,
  type SectionDoc
} from './configReferenceModel';

const packageDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const typesPath = path.join(packageDir, 'src', 'types', 'config.ts');

const WRAP_COLUMN = 80;

interface MemberDoc {
  description: string;
  details?: string;
  /** Lines describing the default(s), already formatted (no tag). */
  defaultLines: string[];
  /** Set when the default can be a single @default tag. */
  defaultTag?: string;
}

// --- Model → per-interface member docs --------------------------------------

const sectionInterfaceMap: Record<string, string> = {
  animationConfig: 'AnimationConfig',
  chartConfig: 'ChartConfig',
  colorPaletteConfig: 'ColorPaletteConfig',
  crosshairConfig: 'CrosshairConfig',
  groupAxisConfig: 'GroupAxisConfig',
  legendConfig: 'LegendConfig',
  linearGradientConfigs: 'LinearGradientConfig',
  pieConfig: 'PieConfig',
  plotConfig: 'PlotConfig',
  radialGradientConfigs: 'RadialGradientConfig',
  seriesAxisConfigs: 'SeriesAxisConfig',
  seriesConfigs: 'SeriesConfig',
  seriesGroupConfigs: 'SeriesGroupConfig',
  seriesStackConfigs: 'SeriesStackConfig',
  titleConfig: 'TitleConfig',
  tooltipConfig: 'TooltipConfig'
};

function defaultValueText(value: DefaultValue): string | undefined {
  switch (value.kind) {
    case 'color':
      return "'" + value.color + "'";
    case 'colors':
      return '[' + value.colors.map(color => "'" + color + "'").join(', ') + ']';
    case 'literal':
      return value.text;
    case 'none':
      return undefined;
  }
}

function conditionalDefaultLines(conditionals: ConditionalDefaultValue[]): string[] {
  const lines = ['Default:'];
  for (const conditional of conditionals) {
    const text = defaultValueText(conditional.value);
    lines.push('- `' + (text ?? 'none') + '` — ' + conditional.condition);
  }
  return lines;
}

function toMemberDoc(property: PropertyDoc): MemberDoc {
  const doc: MemberDoc = {
    description: upperFirst(property.description) + '.',
    defaultLines: []
  };
  if (property.details !== undefined) {
    doc.details = property.details;
  }
  if (property.conditionalDefaults) {
    doc.defaultLines = conditionalDefaultLines(property.conditionalDefaults);
  }
  else {
    const text = defaultValueText(property.default ?? { kind: 'none' });
    if (text !== undefined) {
      doc.defaultTag = text;
    }
  }
  return doc;
}

function mergedAxisMemberDoc(groupProperty: PropertyDoc, seriesProperty: PropertyDoc): MemberDoc {
  const doc: MemberDoc = {
    description: upperFirst(groupProperty.description) + '.',
    defaultLines: []
  };
  const details = groupProperty.details ?? seriesProperty.details;
  if (details !== undefined) {
    doc.details = details;
  }
  const groupText = groupProperty.conditionalDefaults
    ? undefined
    : defaultValueText(groupProperty.default ?? { kind: 'none' });
  const seriesText = seriesProperty.conditionalDefaults
    ? undefined
    : defaultValueText(seriesProperty.default ?? { kind: 'none' });
  if (groupProperty.conditionalDefaults || seriesProperty.conditionalDefaults) {
    if (groupProperty.conditionalDefaults) {
      doc.defaultLines.push('Group axis defaults:');
      doc.defaultLines.push(...conditionalDefaultLines(groupProperty.conditionalDefaults).slice(1));
    }
    else if (groupText !== undefined) {
      doc.defaultLines.push('Group axis default: `' + groupText + '`.');
    }
    if (seriesProperty.conditionalDefaults) {
      doc.defaultLines.push('Series axis defaults:');
      doc.defaultLines.push(...conditionalDefaultLines(seriesProperty.conditionalDefaults).slice(1));
    }
    else if (seriesText !== undefined) {
      doc.defaultLines.push('Series axis default: `' + seriesText + '`.');
    }
  }
  else if (groupText === seriesText) {
    if (groupText !== undefined) {
      doc.defaultTag = groupText;
    }
  }
  else {
    if (groupText !== undefined) {
      doc.defaultLines.push('Group axis default: `' + groupText + '`.');
    }
    if (seriesText !== undefined) {
      doc.defaultLines.push('Series axis default: `' + seriesText + '`.');
    }
  }
  return doc;
}

function buildInterfaceDocs(sections: SectionDoc[]): Map<string, Map<string, MemberDoc>> {
  const bySection = new Map<string, Map<string, PropertyDoc>>();
  for (const section of sections) {
    bySection.set(section.id, new Map(section.properties.map(property => [property.key, property])));
  }

  const interfaceDocs = new Map<string, Map<string, MemberDoc>>();
  for (const [sectionId, interfaceName] of Object.entries(sectionInterfaceMap)) {
    const properties = bySection.get(sectionId);
    if (!properties) {
      continue;
    }
    const memberDocs = new Map<string, MemberDoc>();
    for (const [key, property] of properties) {
      memberDocs.set(key, toMemberDoc(property));
    }
    interfaceDocs.set(interfaceName, memberDocs);
  }

  // AxisConfigBase holds the properties shared by the group axis and the
  // series axes; where their defaults differ, both are documented.
  const groupProperties = bySection.get('groupAxisConfig');
  const seriesProperties = bySection.get('seriesAxisConfigs');
  if (groupProperties && seriesProperties) {
    const memberDocs = new Map<string, MemberDoc>();
    for (const [key, groupProperty] of groupProperties) {
      const seriesProperty = seriesProperties.get(key);
      if (seriesProperty) {
        memberDocs.set(key, mergedAxisMemberDoc(groupProperty, seriesProperty));
      }
    }
    interfaceDocs.set('AxisConfigBase', memberDocs);
  }

  return interfaceDocs;
}

// --- Comment rendering -------------------------------------------------------

function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (line.length > 0 && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    }
    else {
      line = line.length > 0 ? line + ' ' + word : word;
    }
  }
  if (line.length > 0) {
    lines.push(line);
  }
  return lines;
}

function renderComment(doc: MemberDoc, indent: string): string {
  const width = WRAP_COLUMN - indent.length - 3;
  const bodyLines: string[] = [];
  bodyLines.push(...wrap(doc.description, width));
  if (doc.details !== undefined) {
    bodyLines.push('');
    bodyLines.push(...wrap(doc.details, width));
  }
  if (doc.defaultLines.length > 0) {
    bodyLines.push('');
    for (const line of doc.defaultLines) {
      if (line.startsWith('- ')) {
        bodyLines.push(...wrap(line.slice(2), width - 2).map((wrapped, i) => (i === 0 ? '- ' : '  ') + wrapped));
      }
      else {
        bodyLines.push(...wrap(line, width));
      }
    }
  }
  if (doc.defaultTag !== undefined) {
    bodyLines.push('');
    bodyLines.push('@default ' + doc.defaultTag);
  }
  if (bodyLines.length === 1) {
    return indent + '/** ' + bodyLines[0] + ' */';
  }
  return indent + '/**\n'
    + bodyLines.map(line => indent + (' * ' + line).trimEnd()).join('\n')
    + '\n' + indent + ' */';
}

// --- Source rewriting --------------------------------------------------------

interface Edit {
  start: number;
  end: number;
  replacement: string;
}

export function buildDocumentedTypesSource(source: string): { output: string; warnings: string[] } {
  const { model, integrityErrors } = buildConfigReference();
  const warnings = [...integrityErrors];
  const interfaceDocs = buildInterfaceDocs(model.sections);

  const sourceFile = ts.createSourceFile('config.ts', source, ts.ScriptTarget.Latest, true);
  const edits: Edit[] = [];
  const usedKeys = new Map<string, Set<string>>();

  for (const statement of sourceFile.statements) {
    if (!ts.isInterfaceDeclaration(statement)) {
      continue;
    }
    const memberDocs = interfaceDocs.get(statement.name.text);
    if (!memberDocs) {
      continue;
    }
    let used = usedKeys.get(statement.name.text);
    if (!used) {
      usedKeys.set(statement.name.text, used = new Set());
    }
    for (const member of statement.members) {
      if (!ts.isPropertySignature(member) || member.name === undefined || !ts.isIdentifier(member.name)) {
        continue;
      }
      const doc = memberDocs.get(member.name.text);
      if (!doc) {
        continue;
      }
      used.add(member.name.text);

      const memberStart = member.getStart(sourceFile);
      const lineStart = source.lastIndexOf('\n', memberStart - 1) + 1;
      const indent = source.slice(lineStart, memberStart);
      if (indent.trim().length > 0) {
        warnings.push(statement.name.text + '.' + member.name.text + ': unexpected inline layout, skipped');
        continue;
      }

      const commentRanges = ts.getLeadingCommentRanges(source, member.pos) ?? [];
      const jsdocRanges = commentRanges.filter(range => source.slice(range.pos, range.pos + 3) === '/**');
      let start = lineStart;
      if (jsdocRanges.length > 0) {
        const firstJsdoc = jsdocRanges[0]!;
        start = source.lastIndexOf('\n', firstJsdoc.pos) + 1;
      }
      edits.push({
        start,
        end: memberStart,
        replacement: renderComment(doc, indent) + '\n' + indent
      });
    }
  }

  // Shared axis properties are declared (and documented) on AxisConfigBase,
  // which GroupAxisConfig and SeriesAxisConfig extend.
  const axisBaseUsed = usedKeys.get('AxisConfigBase') ?? new Set();
  const axisConcreteUsed = new Set([
    ...(usedKeys.get('GroupAxisConfig') ?? new Set<string>()),
    ...(usedKeys.get('SeriesAxisConfig') ?? new Set<string>())
  ]);
  for (const [interfaceName, memberDocs] of interfaceDocs) {
    const used = usedKeys.get(interfaceName) ?? new Set();
    const inherited = interfaceName === 'GroupAxisConfig' || interfaceName === 'SeriesAxisConfig'
      ? axisBaseUsed
      : interfaceName === 'AxisConfigBase' ? axisConcreteUsed : new Set();
    for (const key of memberDocs.keys()) {
      if (!used.has(key) && !inherited.has(key)) {
        warnings.push(interfaceName + '.' + key + ': documented in the config model but not found in types/config.ts');
      }
    }
  }

  edits.sort((a, b) => b.start - a.start);
  let output = source;
  for (const edit of edits) {
    output = output.slice(0, edit.start) + edit.replacement + output.slice(edit.end);
  }
  return { output, warnings };
}

// --- CLI ---------------------------------------------------------------------

const runDirectly = process.argv[1] === fileURLToPath(import.meta.url);
if (runDirectly) {
  const check = process.argv.includes('--check');
  const source = fs.readFileSync(typesPath, 'utf-8');
  const { output, warnings } = buildDocumentedTypesSource(source);
  for (const warning of warnings) {
    console.warn('warning: ' + warning);
  }
  if (check) {
    if (output !== source) {
      console.error('src/types/config.ts is out of date with the config docs — run "npm run generate-jsdoc -w @mochart/core"');
      process.exitCode = 1;
    }
    else {
      console.log('src/types/config.ts JSDoc is in sync');
    }
  }
  else if (output !== source) {
    fs.writeFileSync(typesPath, output);
    console.log('src/types/config.ts JSDoc regenerated');
  }
  else {
    console.log('src/types/config.ts JSDoc already in sync');
  }
}
