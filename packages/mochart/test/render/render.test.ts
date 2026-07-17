import { describe, it, expect, vi } from 'vitest';
import { svgEl, htmlEl, textEl, Renderer, ElList, El } from '../../src/render';

function host(): HTMLElement {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return div;
}

/** innerHTML with comment anchors stripped, matching the golden normalization. */
function markup(node: Element): string {
  return node.innerHTML.replace(/<!--[^>]*-->/g, '');
}

describe('El', () => {
  it('sets, updates and removes attributes by diffing', () => {
    const el = htmlEl('div');
    el.set({ id: 'a', title: 'x' });
    expect(el.node.getAttribute('id')).toBe('a');
    el.set({ id: 'b' });
    expect(el.node.getAttribute('id')).toBe('b');
    expect(el.node.hasAttribute('title')).toBe(false);
  });

  it('maps className to class and kebab-cases SVG attributes', () => {
    const el = svgEl('path');
    el.set({ className: 'foo', strokeWidth: 2, fillOpacity: 0.5 });
    expect(el.node.getAttribute('class')).toBe('foo');
    expect(el.node.getAttribute('stroke-width')).toBe('2');
    expect(el.node.getAttribute('fill-opacity')).toBe('0.5');
  });

  it('writes style objects with px suffixes and unitless exceptions', () => {
    const el = htmlEl('div');
    el.set({ style: { width: 10, opacity: 0.5, textAlign: 'center' } });
    const style = (el.node as HTMLElement).style;
    expect(style.width).toBe('10px');
    expect(style.opacity).toBe('0.5');
    expect(style.textAlign).toBe('center');
    el.set({ style: { width: 20 } });
    expect(style.width).toBe('20px');
    expect(style.textAlign).toBe('');
  });

  it('attaches one proxy listener and swaps handlers without re-adding', () => {
    const el = htmlEl('button');
    const first = vi.fn();
    const second = vi.fn();
    el.set({ onClick: first });
    el.node.dispatchEvent(new MouseEvent('click'));
    el.set({ onClick: second });
    el.node.dispatchEvent(new MouseEvent('click'));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    el.set({});
    el.node.dispatchEvent(new MouseEvent('click'));
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('removes attributes for null/false and writes empty string for true', () => {
    const el = htmlEl('div');
    el.set({ hidden: true, title: 'x' });
    expect(el.node.getAttribute('hidden')).toBe('');
    el.set({ hidden: false, title: null });
    expect(el.node.hasAttribute('hidden')).toBe(false);
    expect(el.node.hasAttribute('title')).toBe(false);
  });
});

describe('TextEl', () => {
  it('updates text content with change detection', () => {
    const t = textEl('a');
    expect(t.node.nodeValue).toBe('a');
    t.set(5);
    expect(t.node.nodeValue).toBe('5');
    t.set(null);
    expect(t.node.nodeValue).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Renderer lifecycle
// ---------------------------------------------------------------------------

interface LeafProps { label: string; calls?: string[] }

class Leaf extends Renderer<LeafProps> {
  static defaultProps = { label: 'default' };
  root = svgEl('text');
  text = textEl();
  syncCount = 0;

  create() {
    this.root.append(this.text);
    return this.root.node;
  }

  sync() {
    this.syncCount++;
    this.root.set({ className: 'leaf' });
    this.text.set(this.props.label);
  }

  didMount() {
    this.props.calls?.push('leaf didMount, attached: ' + this.root.node.isConnected);
  }
}

class Wrapper extends Renderer<{ label: string; calls: string[] }> {
  child!: ReturnType<Renderer<object>['slot']>;

  create() {
    // pass-through renderer: no element of its own
    this.child = this.slot();
    return null;
  }

  sync() {
    this.child.set(Leaf, { label: this.props.label, calls: this.props.calls });
  }

  didMount() {
    this.props.calls.push('wrapper didMount');
  }
}

describe('Renderer', () => {
  it('mounts, applies defaultProps, and skips sync on shallow-equal props', () => {
    const parent = host();
    const leaf = new Leaf();
    leaf.mount(parent, null, {} as LeafProps);
    expect(markup(parent)).toBe('<text class="leaf">default</text>');
    expect(leaf.syncCount).toBe(1);

    leaf.update({ label: 'default' } as LeafProps);
    expect(leaf.syncCount).toBe(1); // shallow-equal after defaults -> skipped

    leaf.update({ label: 'hi' });
    expect(leaf.syncCount).toBe(2);
    expect(markup(parent)).toBe('<text class="leaf">hi</text>');
  });

  it('runs child didMount before parent didMount, after DOM attach', () => {
    const parent = host();
    const calls: string[] = [];
    const wrapper = new Wrapper();
    wrapper.mount(parent, null, { label: 'x', calls });
    expect(calls).toEqual(['leaf didMount, attached: true', 'wrapper didMount']);
    expect(markup(parent)).toBe('<text class="leaf">x</text>');
  });

  it('merges setState without re-render during willReceiveProps', () => {
    class Stateful extends Renderer<{ v: number }, { doubled: number }> {
      root = htmlEl('span');
      text = textEl();
      syncCount = 0;
      willMount() {
        this.setState({ doubled: this.props.v * 2 });
      }
      willReceiveProps(next: { v: number }) {
        this.setState({ doubled: next.v * 2 });
      }
      create() {
        this.root.append(this.text);
        return this.root.node;
      }
      sync() {
        this.syncCount++;
        this.text.set(this.state.doubled);
      }
    }
    const parent = host();
    const r = new Stateful();
    r.mount(parent, null, { v: 2 });
    expect(markup(parent)).toBe('<span>4</span>');
    expect(r.syncCount).toBe(1);
    r.update({ v: 5 });
    expect(markup(parent)).toBe('<span>10</span>');
    expect(r.syncCount).toBe(2); // willReceiveProps merge + update produced a single sync
  });

  it('setState outside lifecycle syncs immediately and defers callbacks until after the DOM is written', () => {
    class Counter extends Renderer<object, { n: number }> {
      root = htmlEl('i');
      text = textEl();
      state = { n: 0 };
      create() {
        this.root.append(this.text);
        return this.root.node;
      }
      sync() {
        this.text.set(this.state.n);
      }
    }
    const parent = host();
    const r = new Counter();
    r.mount(parent, null, {});
    let seen = '';
    r.setState({ n: 7 }, () => {
      seen = markup(parent);
    });
    expect(seen).toBe('<i>7</i>');
  });

  it('setPresent detaches and re-attaches the root element at the same position', () => {
    class Toggle extends Renderer<{ on: boolean }> {
      root = htmlEl('b');
      create() {
        return this.root.node;
      }
      sync() {
        this.setPresent(this.props.on);
      }
    }
    const parent = host();
    parent.appendChild(document.createElement('u'));
    const r = new Toggle();
    r.mount(parent, parent.firstChild, { on: true });
    expect(markup(parent)).toBe('<b></b><u></u>');
    r.update({ on: false });
    expect(markup(parent)).toBe('<u></u>');
    r.update({ on: true });
    expect(markup(parent)).toBe('<b></b><u></u>');
  });

  it('destroy runs willUnmount depth-first and removes all DOM including pass-through children', () => {
    const parent = host();
    const calls: string[] = [];
    class Inner extends Renderer<{ calls: string[] }> {
      root = htmlEl('em');
      create() {
        return this.root.node;
      }
      sync() {}
      willUnmount() {
        this.props.calls.push('inner willUnmount');
      }
    }
    class Outer extends Renderer<{ calls: string[] }> {
      child!: ReturnType<Renderer<object>['slot']>;
      create() {
        this.child = this.slot();
        return null;
      }
      sync() {
        this.child.set(Inner, { calls: this.props.calls });
      }
      willUnmount() {
        this.props.calls.push('outer willUnmount');
      }
    }
    const r = new Outer();
    r.mount(parent, null, { calls });
    expect(markup(parent)).toBe('<em></em>');
    r.destroy();
    expect(calls).toEqual(['outer willUnmount', 'inner willUnmount']);
    expect(parent.innerHTML).toBe('');
  });
});

// ---------------------------------------------------------------------------
// keyed lists
// ---------------------------------------------------------------------------

interface Row { id: string; label: string }

// create() builds bare structure only — all content comes from update(), so a
// block created and never updated would show up as an empty <li>
const rowAdapter = {
  key: (row: Row) => row.id,
  create: () => {
    const root = htmlEl('li');
    const text = textEl();
    root.append(text);
    return { root, text };
  },
  update: (handle: { root: El; text: ReturnType<typeof textEl> }, row: Row) => {
    handle.root.set({ 'data-id': row.id });
    handle.text.set(row.label);
  }
};

describe('ElList', () => {
  it('handles enter, update, exit and reorder by key', () => {
    const parent = host();
    const list = new ElList<Row>(parent, null);

    list.sync([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }], rowAdapter);
    expect(markup(parent)).toBe('<li data-id="a">A</li><li data-id="b">B</li><li data-id="c">C</li>');
    const [nodeA, nodeB] = Array.from(parent.querySelectorAll('li'));

    // reorder + update + remove + add
    list.sync([{ id: 'b', label: 'B2' }, { id: 'a', label: 'A' }, { id: 'd', label: 'D' }], rowAdapter);
    expect(markup(parent)).toBe('<li data-id="b">B2</li><li data-id="a">A</li><li data-id="d">D</li>');
    // nodes were moved, not recreated
    expect(Array.from(parent.querySelectorAll('li'))[0]).toBe(nodeB);
    expect(Array.from(parent.querySelectorAll('li'))[1]).toBe(nodeA);

    list.sync([], rowAdapter);
    expect(markup(parent)).toBe('');
  });

  it('does not leak DOM nodes when items have duplicate keys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const parent = host();
      const list = new ElList<Row>(parent, null);

      const rows = [{ id: 'a', label: 'A1' }, { id: 'a', label: 'A2' }, { id: 'b', label: 'B' }];
      list.sync(rows, rowAdapter);
      expect(parent.querySelectorAll('li').length).toBe(3);

      // re-syncing with persistent duplicates must warn and keep the node
      // count stable instead of orphaning one extra node per sync
      list.sync(rows, rowAdapter);
      list.sync(rows, rowAdapter);
      expect(parent.querySelectorAll('li').length).toBe(3);
      expect(warn).toHaveBeenCalledWith('mochart list has duplicate key: a');

      list.sync([], rowAdapter);
      expect(markup(parent)).toBe('');
    }
    finally {
      warn.mockRestore();
    }
  });
});

describe('RendererList (via Renderer.rendererList)', () => {
  it('keys child renderers, reuses by key+class, destroys leavers', () => {
    const destroyed: string[] = [];
    class Item extends Renderer<{ id: string; label: string }> {
      root = htmlEl('p');
      text = textEl();
      create() {
        this.root.append(this.text);
        return this.root.node;
      }
      sync() {
        this.text.set(this.props.label);
      }
      willUnmount() {
        destroyed.push(this.props.id);
      }
    }
    class ListHost extends Renderer<{ rows: Row[] }> {
      root = htmlEl('div');
      list!: ReturnType<Renderer<object>['rendererList']>;
      create() {
        this.list = this.rendererList(this.root);
        return this.root.node;
      }
      sync() {
        this.list.sync(this.props.rows.map((row) => ({ key: row.id, ctor: Item, props: { id: row.id, label: row.label } })));
      }
    }

    const parent = host();
    const r = new ListHost();
    r.mount(parent, null, { rows: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] });
    expect(markup(parent)).toBe('<div><p>A</p><p>B</p></div>');

    r.update({ rows: [{ id: 'b', label: 'B' }, { id: 'a', label: 'A2' }] });
    expect(markup(parent)).toBe('<div><p>B</p><p>A2</p></div>');
    expect(destroyed).toEqual([]);

    r.update({ rows: [{ id: 'b', label: 'B' }] });
    expect(markup(parent)).toBe('<div><p>B</p></div>');
    expect(destroyed).toEqual(['a']);

    r.destroy();
    expect(parent.innerHTML).toBe('');
    expect(destroyed).toEqual(['a', 'b']);
  });

  it('does not leak renderers when items have duplicate keys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      class Item extends Renderer<{ label: string }> {
        root = htmlEl('p');
        text = textEl();
        create() {
          this.root.append(this.text);
          return this.root.node;
        }
        sync() {
          this.text.set(this.props.label);
        }
      }
      class ListHost extends Renderer<{ rows: Row[] }> {
        root = htmlEl('div');
        list!: ReturnType<Renderer<object>['rendererList']>;
        create() {
          this.list = this.rendererList(this.root);
          return this.root.node;
        }
        sync() {
          this.list.sync(this.props.rows.map((row) => ({ key: row.id, ctor: Item, props: { label: row.label } })));
        }
      }

      const parent = host();
      const r = new ListHost();
      const rows = [{ id: 'a', label: 'A1' }, { id: 'a', label: 'A2' }, { id: 'b', label: 'B' }];
      r.mount(parent, null, { rows });
      expect(parent.querySelectorAll('p').length).toBe(3);

      r.update({ rows: [...rows] });
      r.update({ rows: [...rows] });
      expect(parent.querySelectorAll('p').length).toBe(3);
      expect(warn).toHaveBeenCalledWith('mochart renderer list has duplicate key: a');

      r.destroy();
      expect(parent.innerHTML).toBe('');
    }
    finally {
      warn.mockRestore();
    }
  });
});
