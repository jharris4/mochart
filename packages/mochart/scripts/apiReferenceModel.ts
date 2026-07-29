// Builds the structured api-reference model consumed by the docs site's prop
// and callback pages. Where the config reference is assembled from the
// validators, this one is read straight from the prop interfaces in
// src/types/chart.ts — the JSDoc on those members is the single source for
// the shipped .d.ts, editor hovers, and the reference pages, so the three
// cannot disagree.
//
// Every exported interface in that file must either belong to a page group
// below or be listed in `internalInterfaces`, and every member must carry a
// JSDoc description — both are reported as integrity errors, which fail the
// generator (and so the docs build).

import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const packageDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const chartTypesPath = path.join(packageDir, 'src', 'types', 'chart.ts');

/** A link to another documented interface's group. */
export interface ApiGroupLink {
  title: string;
  link: string;
}

export interface ApiPropertyDoc {
  key: string;
  /** Source text of the type annotation. */
  type: string;
  optional: boolean;
  description: string;
  /** Documented payload types named by this member's type, for cross-links. */
  payloads: ApiGroupLink[];
}

export interface ApiGroupDoc {
  id: string;
  title: string;
  /** The interface the group is read from, named so hovers and docs line up. */
  interfaceName: string;
  description: string;
  /** Documented interfaces this one extends. */
  extendsGroups: ApiGroupLink[];
  properties: ApiPropertyDoc[];
}

export interface ApiPageDoc {
  id: string;
  title: string;
  lead: string;
  groups: ApiGroupDoc[];
}

export interface ApiReferenceModel {
  pages: ApiPageDoc[];
}

export interface ApiReferenceResult {
  model: ApiReferenceModel;
  integrityErrors: string[];
}

interface GroupSource {
  id: string;
  title: string;
  interfaceName: string;
  description: string;
}

interface PageSource {
  id: string;
  title: string;
  lead: string;
  groups: GroupSource[];
}

// Interfaces in src/types/chart.ts that are deliberately absent from the
// reference pages, with the reason they need no page.
const internalInterfaces: Record<string, string> = {
  ChartDomAccessors: 'test/measurement seam; documented by the shipped .d.ts only',
  InternalFocus: 'internal focus update shape, never crosses the public boundary'
};

const pageSources: PageSource[] = [
  {
    id: 'props',
    title: 'Chart props',
    lead:
      'Props accepted by the two chart entry points, `createDefaultChart` and' +
      ' `createChart` (see the [API reference](/reference/api)). The framework' +
      ' bindings accept the same props — with the per-binding renamings noted on' +
      ' each [framework page](/guide/frameworks/react) — and derive `width` and' +
      ' `height` from their container when those are omitted.',
    groups: [
      {
        id: 'defaultChartProps',
        title: 'createDefaultChart props',
        interfaceName: 'DefaultChartProps',
        description:
          'Passed to `createDefaultChart`, which validates and enhances the config' +
          ' internally, in addition to the shared props below.'
      },
      {
        id: 'managedChartProps',
        title: 'createChart props',
        interfaceName: 'ManagedChartProps',
        description:
          'Passed to `createChart`, which takes an already-enhanced config and a' +
          ' data provider, in addition to the shared props below.'
      },
      {
        id: 'props',
        title: 'Shared props',
        interfaceName: 'BaseChartProps',
        description:
          'Accepted by both entry points. The focus and filter props are the' +
          ' controlled counterparts of the' +
          ' [callbacks](/reference/callbacks#callbacks): set one and it overrides' +
          ' the chart\'s internal state on every update; leave it `undefined` and' +
          ' the chart manages that piece itself.'
      },
      {
        id: 'factories',
        title: 'State factories',
        interfaceName: 'ChartFactories',
        description:
          'Customize what renders in each non-chart state — see' +
          ' [Chart states](/guide/chart-states). Each factory is called with the' +
          ' context below and returns a DOM node or string.'
      },
      {
        id: 'factoryContext',
        title: 'ChartFactoryContext',
        interfaceName: 'ChartFactoryContext',
        description: 'The argument passed to every state factory.'
      }
    ]
  },
  {
    id: 'callbacks',
    // The title must not slugify to a group id below — VitePress rejects
    // duplicate anchors, and `callbacks` is the group.
    title: 'Callbacks and payloads',
    lead:
      'Optional callback props reported by both chart entry points, and the' +
      ' payload each one receives. See [Interaction](/guide/interaction) for how' +
      ' focus, filtering, and pointer events behave, and' +
      ' [Chart props](/reference/props#props) for the controlled props that' +
      ' pair with them.',
    groups: [
      {
        id: 'callbacks',
        title: 'Callbacks',
        interfaceName: 'ChartCallbacks',
        description:
          'Every callback is optional; only the ones you pass are wired up.'
      },
      {
        id: 'chartEventPayload',
        title: 'ChartEventPayload',
        interfaceName: 'ChartEventPayload',
        description: 'Received by the four plot-area pointer callbacks.'
      },
      {
        id: 'chartFocus',
        title: 'ChartFocus',
        interfaceName: 'ChartFocus',
        description:
          'Received by `onFocus` — the whole focus state, not just what changed.'
      },
      {
        id: 'chartSeriesFilter',
        title: 'ChartSeriesFilter',
        interfaceName: 'ChartSeriesFilter',
        description:
          'Received by `onSeriesFilter` — the whole filter map, not just what changed.'
      },
      {
        id: 'chartSliceClickPayload',
        title: 'ChartSliceClickPayload',
        interfaceName: 'ChartSliceClickPayload',
        description: 'Received by `onSliceClick`.'
      }
    ]
  }
];

interface ParsedMember {
  key: string;
  type: string;
  optional: boolean;
  description: string;
}

interface ParsedInterface {
  name: string;
  extendsNames: string[];
  members: ParsedMember[];
}

function jsDocText(source: string, member: ts.Node): string {
  const ranges = ts.getLeadingCommentRanges(source, member.pos) ?? [];
  const docRange = ranges.filter(range => source.slice(range.pos, range.pos + 3) === '/**').pop();
  if (docRange === undefined) {
    return '';
  }
  const lines = source
    .slice(docRange.pos, docRange.end)
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map(line => line.replace(/^\s*\*/, '').trim());
  // JSDoc wraps at 80 columns, so wrapped lines rejoin into one paragraph;
  // blank lines stay paragraph breaks.
  return lines
    .join('\n')
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.split('\n').join(' ').trim())
    .filter(paragraph => paragraph !== '')
    .join('\n\n')
    .replace(/\{@link\s+([^}]+)\}/g, '`$1`');
}

function parseInterfaces(): { interfaces: Map<string, ParsedInterface>; exportedNames: string[] } {
  const source = fs.readFileSync(chartTypesPath, 'utf-8');
  const sourceFile = ts.createSourceFile('chart.ts', source, ts.ScriptTarget.Latest, true);
  const interfaces = new Map<string, ParsedInterface>();
  const exportedNames: string[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isInterfaceDeclaration(statement)) {
      continue;
    }
    const name = statement.name.text;
    const isExported = statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
    if (isExported) {
      exportedNames.push(name);
    }
    const extendsNames: string[] = [];
    for (const heritage of statement.heritageClauses ?? []) {
      for (const type of heritage.types) {
        extendsNames.push(type.expression.getText(sourceFile));
      }
    }
    const members: ParsedMember[] = [];
    for (const member of statement.members) {
      if (!ts.isPropertySignature(member) || member.name === undefined || !ts.isIdentifier(member.name)) {
        continue;
      }
      members.push({
        key: member.name.text,
        type: member.type === undefined ? 'unknown' : member.type.getText(sourceFile).replace(/\s+/g, ' '),
        optional: member.questionToken !== undefined,
        description: jsDocText(source, member)
      });
    }
    interfaces.set(name, { name, extendsNames, members });
  }
  return { interfaces, exportedNames };
}

export function buildApiReference(): ApiReferenceResult {
  const integrityErrors: string[] = [];
  const { interfaces, exportedNames } = parseInterfaces();

  const referenceByInterface = new Map<string, ApiGroupLink>();
  for (const page of pageSources) {
    for (const group of page.groups) {
      referenceByInterface.set(group.interfaceName, {
        title: group.interfaceName,
        link: '/reference/' + page.id + '#' + group.id
      });
    }
  }

  for (const name of exportedNames) {
    if (!referenceByInterface.has(name) && !(name in internalInterfaces)) {
      integrityErrors.push(
        `${name} is exported from types/chart.ts but has no reference page group —` +
        ' add it to pageSources, or to internalInterfaces with a reason'
      );
    }
  }
  for (const name of Object.keys(internalInterfaces)) {
    if (!exportedNames.includes(name)) {
      integrityErrors.push(`internalInterfaces lists ${name}, which no longer exists in types/chart.ts`);
    }
  }

  const pages: ApiPageDoc[] = pageSources.map(page => ({
    id: page.id,
    title: page.title,
    lead: page.lead,
    groups: page.groups.map(group => {
      const parsed = interfaces.get(group.interfaceName);
      if (parsed === undefined) {
        integrityErrors.push(`interface ${group.interfaceName} not found in types/chart.ts`);
        return { ...group, extendsGroups: [], properties: [] };
      }
      const properties = parsed.members.map(member => {
        if (member.description === '') {
          integrityErrors.push(`${group.interfaceName}.${member.key} has no JSDoc description`);
        }
        const payloads = [...referenceByInterface.entries()]
          .filter(([interfaceName]) => new RegExp(`\\b${interfaceName}\\b`).test(member.type))
          .map(([, reference]) => reference);
        return {
          key: member.key,
          type: member.type,
          optional: member.optional,
          description: member.description,
          payloads
        };
      });
      const extendsGroups = parsed.extendsNames
        .map(name => referenceByInterface.get(name))
        .filter((reference): reference is ApiGroupLink => reference !== undefined);
      return {
        id: group.id,
        title: group.title,
        interfaceName: group.interfaceName,
        description: group.description,
        extendsGroups,
        properties
      };
    })
  }));

  return { model: { pages }, integrityErrors };
}
