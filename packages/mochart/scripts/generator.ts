// CLI for the config reference docs. Builds the structured model (see
// configReferenceModel.ts), writes it to generated/config-reference.json for
// downstream consumers (the docs site), and renders the legacy standalone
// mochart-docs.html. Exits non-zero when the config docs sources (defaults /
// validators / descriptions / details) have mismatched keys.
//
// Usage: tsx scripts/generator.ts [htmlPath] [jsonPath]
// Paths default to <package>/mochart-docs.html and
// <package>/generated/config-reference.json regardless of cwd.

import {
  buildConfigReference,
  type ConfigReferenceModel,
  type DefaultValue,
  type PropertyDoc,
  type SectionDoc,
  type TopLevelKeyDoc
} from './configReferenceModel';
import { buildApiReference } from './apiReferenceModel';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const packageDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// --- HTML rendering ----------------------------------------------------------

function htmlHeader(): string {
  return [
    '<html>',
    '<head>',
    '<title>Mochart Config Docs</title>',
    '<style>',
    'table { border-collapse: collapse !important; }',
    'table th { text-align: left; }',
    'table td, table th { background-color: #fff !important; border: 1px solid #eceeef !important; padding: .75rem; vertical-align: top; }',
    'table thead th { vertical-align: bottom; border-bottom: 2px solid #eceeef; }',
    'table thead td { border-bottom-width: 2px; }',
    '.colorIcon { display: inline-block; vertical-align: middle; width: 8px; height: 8px; border: 2px solid #eceeef; }',
    '</style>',
    '</head>',
    '<body>',
    ''
  ].join('\n');
}

function htmlFooter(): string {
  return '</body>\n</html>';
}

function tags(tag: string, contents: string[]): string {
  return contents.map(content => '<' + tag + '>' + content + '</' + tag + '>').join('') + '\n';
}

function colorIcon(color: string): string {
  return '<span class="colorIcon" style="background-color: ' + color + '"></span>';
}

function renderDefaultValue(value: DefaultValue): string {
  switch (value.kind) {
    case 'color':
      return colorIcon(value.color);
    case 'colors':
      return value.colors.map(colorIcon).join('');
    case 'literal':
      return value.text;
    case 'none':
      return '';
  }
}

function renderPropertyDefault(property: PropertyDoc): string {
  if (property.conditionalDefaults) {
    return property.conditionalDefaults.map(conditional =>
      '<div>' + renderDefaultValue(conditional.value) + ' (' + conditional.condition + ')' + '</div>\n'
    ).join('');
  }
  return '<div>' + renderDefaultValue(property.default ?? { kind: 'none' }) + '</div>\n';
}

function renderRules(rules: string[]): string {
  if (rules.length === 1) {
    return rules[0];
  }
  return rules.map(rule => '<p>' + rule + '</p>\n').join('');
}

function renderDescription(property: PropertyDoc): string {
  return property.details
    ? property.description + '<br/><br/>' + property.details
    : property.description;
}

function renderTopLevelRow(doc: TopLevelKeyDoc): string {
  const link = doc.sectionId ? '<a href="#' + doc.sectionId + '">Details</a>' : '';
  let row = '<tr>\n';
  if (doc.allKey) {
    row += tags('td', [
      doc.key + '<br/>' + doc.allKey,
      doc.description + '<br/>' + doc.allDescription,
      renderRules(doc.rules) + '<br/>' + renderRules(doc.allRules ?? []),
      doc.defaultText + '<br/>' + (doc.allDefaultText ?? ''),
      link
    ]);
  }
  else {
    row += tags('td', [doc.key, doc.description, renderRules(doc.rules), doc.defaultText, link]);
  }
  row += '</tr>\n';
  return row;
}

function renderTopLevel(topLevel: TopLevelKeyDoc[]): string {
  let out = '<div>\n<h2>Mochart Config</h2>\n<table>\n<thead>\n<tr>\n';
  out += tags('th', ['Property', 'Description', 'Validation Rules', 'Default', 'Details']);
  out += '</tr>\n</thead>\n';
  for (let doc of topLevel) {
    out += renderTopLevelRow(doc);
  }
  out += '</table>\n</div>\n';
  return out;
}

function renderSection(section: SectionDoc): string {
  let out = '<div id="' + section.id + '">\n';
  out += '<h2>' + section.title + '</h2>\n';
  out += '<table>\n<thead>\n<tr>\n';
  out += tags('th', ['Property', 'Description', 'Validation Rules', 'Default']);
  out += '</tr>\n</thead>\n';
  for (let property of section.properties) {
    const keyId = section.id + '.' + property.key;
    out += '<tr id="' + keyId + '">\n';
    out += tags('td', [
      '<a href="#' + keyId + '">' + property.key + '</a>',
      renderDescription(property),
      renderRules(property.rules),
      renderPropertyDefault(property)
    ]);
    out += '</tr>\n';
  }
  out += '</table>\n</div>\n';
  return out;
}

export function renderHtml(model: ConfigReferenceModel): string {
  let out = htmlHeader();
  out += renderTopLevel(model.topLevel);
  for (let section of model.sections) {
    out += renderSection(section);
  }
  out += htmlFooter();
  return out;
}

// --- CLI ---------------------------------------------------------------------

function writeFileEnsuringDir(filename: string, contents: string) {
  const dir = path.dirname(filename);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filename, contents);
}

export default function generateDocs(htmlPath: string, jsonPath: string, apiJsonPath: string): boolean {
  const { model, integrityErrors } = buildConfigReference();
  writeFileEnsuringDir(jsonPath, JSON.stringify(model, null, 2) + '\n');
  writeFileEnsuringDir(htmlPath, renderHtml(model));

  const api = buildApiReference();
  writeFileEnsuringDir(apiJsonPath, JSON.stringify(api.model, null, 2) + '\n');

  let valid = true;
  if (integrityErrors.length > 0) {
    console.error('config docs sources are out of sync:');
    for (let error of integrityErrors) {
      console.error('  - ' + error);
    }
    valid = false;
  }
  if (api.integrityErrors.length > 0) {
    console.error('api docs sources are out of sync:');
    for (let error of api.integrityErrors) {
      console.error('  - ' + error);
    }
    valid = false;
  }
  return valid;
}

const runDirectly = process.argv[1] === fileURLToPath(import.meta.url);
if (runDirectly) {
  const htmlPath = process.argv[2] ?? path.join(packageDir, 'mochart-docs.html');
  const jsonPath = process.argv[3] ?? path.join(packageDir, 'generated', 'config-reference.json');
  const apiJsonPath = process.argv[4] ?? path.join(packageDir, 'generated', 'api-reference.json');
  if (!generateDocs(htmlPath, jsonPath, apiJsonPath)) {
    process.exitCode = 1;
  }
}
