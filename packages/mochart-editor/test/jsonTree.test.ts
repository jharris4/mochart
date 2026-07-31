import { json } from '@codemirror/lang-json';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { pathAt, rangeForPath } from '../src/jsonTree';

const source = `{
  "seriesConfigs": [
    { "property": "revenue", "axis": "money" }
  ]
}`;

function state() {
  return EditorState.create({ doc: source, extensions: [json()] });
}

describe('JSON tree paths', () => {
  it('finds paths through objects and arrays', () => {
    const position = source.indexOf('"money"') + 2;
    expect(pathAt(state(), position)).toEqual(['seriesConfigs', 0, 'axis']);
  });

  it('maps a path back to its JSON value', () => {
    const range = rangeForPath(state(), ['seriesConfigs', 0, 'axis']);
    expect(source.slice(range.from, range.to)).toBe('"money"');
  });
});
