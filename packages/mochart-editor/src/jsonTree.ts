import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';
import type { JsonPath } from './types.js';

const valueNames = new Set(['Object', 'Array', 'String', 'Number', 'True', 'False', 'Null']);

function children(node: SyntaxNode): SyntaxNode[] {
  const result: SyntaxNode[] = [];
  for (let child = node.firstChild; child; child = child.nextSibling) result.push(child);
  return result;
}

function propertyKey(state: EditorState, property: SyntaxNode): string | null {
  const name = children(property).find(child => child.name === 'PropertyName');
  if (!name) return null;
  try {
    return JSON.parse(state.sliceDoc(name.from, name.to)) as string;
  }
  catch {
    return state.sliceDoc(name.from, name.to).replace(/^"|"$/g, '');
  }
}

function propertyValue(property: SyntaxNode): SyntaxNode | null {
  return children(property).find(child => valueNames.has(child.name)) ?? null;
}

function arrayValues(array: SyntaxNode): SyntaxNode[] {
  return children(array).filter(child => valueNames.has(child.name));
}

export function pathAt(state: EditorState, position: number): JsonPath {
  const path: JsonPath = [];
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(position, -1);
  while (node?.parent) {
    const parent: SyntaxNode = node.parent;
    if (parent.name === 'Property') {
      const key = propertyKey(state, parent);
      if (key !== null) path.unshift(key);
    }
    else if (parent.name === 'Array') {
      const values = arrayValues(parent);
      const index = values.findIndex(value => value.from <= node!.from && value.to >= node!.to);
      if (index >= 0) path.unshift(index);
    }
    node = parent;
  }
  return path;
}

export function containingObject(state: EditorState, position: number): SyntaxNode | null {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(position, -1);
  while (node && node.name !== 'Object') node = node.parent;
  return node;
}

export function objectPath(state: EditorState, object: SyntaxNode): JsonPath {
  return pathAt(state, Math.min(object.to - 1, object.from + 1));
}

export function existingObjectKeys(state: EditorState, object: SyntaxNode): string[] {
  return children(object)
    .filter(child => child.name === 'Property')
    .map(child => propertyKey(state, child))
    .filter((key): key is string => key !== null);
}

export function isPropertyPosition(state: EditorState, position: number, object: SyntaxNode): boolean {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(position, -1);
  if (node.name === 'PropertyName') return true;
  while (node && node !== object) {
    if (node.name === 'Property') {
      const value = propertyValue(node);
      return value === null || position < value.from;
    }
    node = node.parent;
  }
  const prefix = state.sliceDoc(object.from + 1, position);
  const comma = prefix.lastIndexOf(',');
  const colon = prefix.lastIndexOf(':');
  return colon < comma || colon === -1;
}

export function rangeForPath(state: EditorState, path: JsonPath): { from: number; to: number } {
  let node: SyntaxNode | null = syntaxTree(state).topNode.firstChild;
  for (const segment of path) {
    if (!node) break;
    if (typeof segment === 'number' && node.name === 'Array') {
      node = arrayValues(node)[segment] ?? node;
    }
    else if (typeof segment === 'string' && node.name === 'Object') {
      const property = children(node).find(child => child.name === 'Property' && propertyKey(state, child) === segment);
      node = property ? propertyValue(property) ?? property : node;
    }
  }
  return node ? { from: node.from, to: Math.max(node.from + 1, node.to) } : { from: 0, to: Math.min(1, state.doc.length) };
}
