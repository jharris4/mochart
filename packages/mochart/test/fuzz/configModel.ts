// Turns the generated config-reference model into the fuzzer's property universe: one spec per leaf
// config value, with the candidate values to try and the write path into a raw config.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const modelPath = path.resolve(here, '../../generated/config-reference.json');

export interface EditorValue {
  types: string[];
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  format?: string;
  properties?: Record<string, EditorValue>;
  items?: EditorValue;
}

interface ModelProperty {
  key: string;
  editor: EditorValue;
}

interface ModelSection {
  id: string;
  shape: string;
  properties: ModelProperty[];
}

interface ModelTopLevel {
  key: string;
  sectionId?: string;
}

interface ConfigModel {
  topLevel: ModelTopLevel[];
  sections: ModelSection[];
}

export interface PropertySpec {
  /** Dotted display name, e.g. `legend.backgroundStyle.strokeColor`. */
  id: string;
  sectionId: string;
  /** The top-level config key the section is written under. */
  configKey: string;
  /** Whether the section is a list, so the value is written into its first entry. */
  isList: boolean;
  /** Key path within the section entry. */
  path: string[];
  value: EditorValue;
}

export interface Candidate {
  label: string;
  value: unknown;
}

/** Data property names: a made-up one changes which data is read, which is a different experiment. */
const SKIPPED_FORMATS = new Set(['propertyRequired', 'propertyOptional']);

const COLOR_VALUES = ['#c02942', 'rgb(30 120 200)'];
const DASH_ARRAY_VALUES = ['4 2', '6,3,1,3'];
const NUMBER_FORMAT_VALUES = [',.1f', '.0%'];
const STRING_VALUES = ['Fuzzed', 'A considerably longer string, long enough to need truncating'];

function readModel(): ConfigModel {
  if (!fs.existsSync(modelPath)) {
    throw new Error('Missing ' + modelPath + ' — run `npm run generate-docs -w @mochart/core` first');
  }
  return JSON.parse(fs.readFileSync(modelPath, 'utf8')) as ConfigModel;
}

function walkValue(value: EditorValue, prefix: string[], section: ModelSection, configKey: string, out: PropertySpec[]): void {
  if (value.properties) {
    for (const [key, nested] of Object.entries(value.properties)) {
      walkValue(nested, prefix.concat(key), section, configKey, out);
    }
    return;
  }
  out.push({
    id: [section.id].concat(prefix).join('.'),
    sectionId: section.id,
    configKey,
    isList: section.shape === 'array',
    path: prefix,
    value
  });
}

/** Every leaf config value in the model, in a stable order (sharding and resume index into it). */
export function loadPropertySpecs(): PropertySpec[] {
  const model = readModel();
  const sectionKeys = new Map<string, string>();
  for (const entry of model.topLevel) {
    if (entry.sectionId) {
      sectionKeys.set(entry.sectionId, entry.key);
    }
  }
  const specs: PropertySpec[] = [];
  for (const section of model.sections) {
    const configKey = sectionKeys.get(section.id);
    if (configKey === undefined) {
      continue;
    }
    for (const property of section.properties) {
      walkValue(property.editor ?? { types: ['any'] }, [property.key], section, configKey, specs);
    }
  }
  return specs;
}

function roundValue(value: number): number {
  return Math.round(value * 100) / 100;
}

function numberCandidates(value: EditorValue): number[] {
  const { minimum, maximum } = value;
  if (minimum !== undefined && maximum !== undefined) {
    return [minimum, maximum, roundValue((minimum + maximum) / 2)];
  }
  if (minimum !== undefined) {
    return [minimum, minimum + 1, minimum + 12];
  }
  if (maximum !== undefined) {
    return [maximum, maximum - 1, maximum - 12];
  }
  return [0, 1, -3, 24];
}

function stringCandidates(value: EditorValue): string[] {
  switch (value.format) {
    case 'svgColor':
    case 'cssColor':
    case 'color': return COLOR_VALUES;
    case 'dashArray': return DASH_ARRAY_VALUES;
    case 'numberFormat': return NUMBER_FORMAT_VALUES;
    default: return STRING_VALUES;
  }
}

/** The values to try for one property: its enum members first, then samples drawn from its types. */
export function candidateValues(spec: PropertySpec, limit: number): Candidate[] {
  const value = spec.value;
  if (value.format !== undefined && SKIPPED_FORMATS.has(value.format)) {
    return [];
  }
  const types = new Set(value.types);
  const values: unknown[] = [];
  if (value.enum) {
    values.push(...value.enum);
  }
  if (types.has('boolean')) {
    values.push(true, false);
  }
  if (types.has('number')) {
    values.push(...numberCandidates(value));
  }
  if (types.has('string')) {
    values.push(...stringCandidates(value));
  }
  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  for (const candidate of values) {
    const label = JSON.stringify(candidate) ?? String(candidate);
    if (seen.has(label)) {
      continue;
    }
    seen.add(label);
    candidates.push({ label, value: candidate });
    if (candidates.length === limit) {
      break;
    }
  }
  return candidates;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Write `value` at the spec's path in a raw config, creating missing groups. Returns false when the
 * config has nowhere to put it — a list section the base never declares an entry for.
 */
export function applyValue(config: Record<string, unknown>, spec: PropertySpec, value: unknown): boolean {
  let target: Record<string, unknown>;
  if (spec.isList) {
    const section = config[spec.configKey];
    if (!Array.isArray(section) || !isRecord(section[0])) {
      return false;
    }
    target = section[0];
  }
  else {
    if (!isRecord(config[spec.configKey])) {
      config[spec.configKey] = {};
    }
    target = config[spec.configKey] as Record<string, unknown>;
  }
  for (const key of spec.path.slice(0, -1)) {
    if (!isRecord(target[key])) {
      target[key] = {};
    }
    target = target[key] as Record<string, unknown>;
  }
  target[spec.path[spec.path.length - 1]!] = value;
  return true;
}
