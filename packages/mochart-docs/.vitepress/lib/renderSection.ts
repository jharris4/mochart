// Renders one config section of the reference model to a markdown page.
// Used by reference/[section].paths.ts at build time.

import type { DefaultValue, PropertyDoc, SectionDoc } from './model';
import type { UsageIndex } from './usageIndex';

function renderDefaultValue(value: DefaultValue): string {
  switch (value.kind) {
    case 'color':
      return colorChip(value.color) + ' `' + value.color + '`';
    case 'colors':
      return value.colors.map(colorChip).join('');
    case 'literal':
      return '`' + value.text + '`';
    case 'none':
      return 'none';
  }
}

function colorChip(color: string): string {
  return '<span class="color-chip" style="background-color: ' + color + '" title="' + color + '"></span>';
}

function renderRules(rules: string[]): string {
  return rules.map(rule => '`' + rule + '`').join('; ');
}

function renderUsage(key: string, usage: UsageIndex): string | null {
  const links = usage.perProperty[key];
  if (links === undefined || links.length === 0) {
    return null;
  }
  const rendered = links.map(link => '[' + link.text + '](' + link.link + ')').join(' · ');
  const extra = usage.overflow[key];
  return '- **Used in:** ' + rendered + (extra !== undefined ? ' · +' + extra + ' more' : '');
}

/** Heading level for a property: `###` at the top, one deeper per nesting level. */
function headingPrefix(depth: number): string {
  return '#'.repeat(Math.min(3 + depth, 6));
}

/** Render one property, then each member of the object it holds; a member's anchor extends its parent's. */
function renderProperty(sectionId: string, property: PropertyDoc, usage: UsageIndex, parentPath: string[] = []): string {
  const path = [...parentPath, property.key];
  const anchor = sectionId + '.' + path.join('.');
  const lines: string[] = [];
  lines.push(headingPrefix(parentPath.length) + ' ' + path.join('.') + ' {#' + anchor + '}');
  lines.push('');
  lines.push(upperFirst(property.description) + '.');
  lines.push('');
  if (property.details) {
    lines.push(property.details);
    lines.push('');
  }
  if (property.conditionalDefaults) {
    const [soleConditional] = property.conditionalDefaults;
    if (property.conditionalDefaults.length === 1 && soleConditional !== undefined) {
      lines.push('- **Default:** ' + renderDefaultValue(soleConditional.value) + ' — ' + soleConditional.condition);
    }
    else {
      lines.push('- **Default:**');
      for (const conditional of property.conditionalDefaults) {
        lines.push('  - ' + renderDefaultValue(conditional.value) + ' — ' + conditional.condition);
      }
    }
  }
  else {
    lines.push('- **Default:** ' + renderDefaultValue(property.default ?? { kind: 'none' }));
  }
  lines.push('- **Validation:** ' + renderRules(property.rules));
  const usageLine = renderUsage(anchor, usage);
  if (usageLine !== null) {
    lines.push(usageLine);
  }
  lines.push('');
  for (const nested of property.properties ?? []) {
    lines.push(renderProperty(sectionId, nested, usage, path));
  }
  return lines.join('\n');
}

function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function renderSectionPage(section: SectionDoc, usage: UsageIndex): string {
  const lines: string[] = [];
  lines.push('# ' + section.title);
  lines.push('');
  lines.push(upperFirst(section.description) + '.');
  lines.push('');
  if (section.shape === 'array') {
    lines.push(
      '`' + section.id + '` is a list section: it takes an array of config objects' +
      ' (a single object is also accepted and treated as a one-entry array).'
    );
    if (section.allKey) {
      lines.push(
        ' Values shared by every entry can be set once in `' + section.allKey + '`;' +
        ' a value set on an individual entry wins over the shared one.'
      );
    }
    lines.push('');
  }
  lines.push(
    'Every property is optional' +
    (section.id === 'series' || section.id === 'categoryAxis' ? ' except `property`' : '') +
    ' and falls back to its default. Property anchors are stable: link to any entry as' +
    ' `#' + section.id + '.propertyName`, and to a member of a nested property as' +
    ' `#' + section.id + '.propertyName.memberName`.'
  );
  lines.push('');
  lines.push('## Properties');
  lines.push('');
  for (const property of section.properties) {
    lines.push(renderProperty(section.id, property, usage));
  }
  return lines.join('\n');
}
