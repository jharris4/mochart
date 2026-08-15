import { El } from './el';
import type { ErasedRenderer, RendererClass } from './renderer';

export type ListKey = string | number;

/** A block managed by ElList: a handle object exposing its root El. */
export interface ElBlock {
  root: El;
}

export interface ElListAdapter<T, H extends ElBlock> {
  key(item: T, index: number): ListKey;
  create(item: T, index: number): H;
  update(handle: H, item: T, index: number): void;
}

interface ElListEntry<H> {
  key: ListKey;
  handle: H;
}

/**
 * A keyed list of retained element subtrees (no component lifecycle) — the
 * old keyed vdom reconciler's enter/update/exit. Blocks are matched by key,
 * updated in place, created/removed as needed, then reordered with minimal
 * moves. All nodes live before the comment anchor.
 */
export class ElList<T, H extends ElBlock = ElBlock> {
  readonly hostNode: Node;
  readonly anchor: Comment;
  private entries: ElListEntry<H>[] = [];

  constructor(hostNode: Node, before: Node | null) {
    this.hostNode = hostNode;
    this.anchor = document.createComment('');
    hostNode.insertBefore(this.anchor, before);
  }

  sync(items: readonly T[], adapter: ElListAdapter<T, H>): void {
    const oldByKey = new Map<ListKey, ElListEntry<H>>();
    for (const entry of this.entries) {
      const clash = oldByKey.get(entry.key);
      if (clash !== undefined) {
        // duplicate keys break matching (the map keeps only the last entry);
        // drop the older block here so its DOM node cannot leak
        console.warn('mochart list has duplicate key: ' + String(entry.key));
        const node = clash.handle.root.node;
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
      oldByKey.set(entry.key, entry);
    }

    const next: ElListEntry<H>[] = [];
    for (let i = 0; i < items.length; i++) {
      const key = adapter.key(items[i], i);
      const old = oldByKey.get(key);
      if (old !== undefined) {
        oldByKey.delete(key);
        adapter.update(old.handle, items[i], i);
        next.push(old);
      }
      else {
        const handle = adapter.create(items[i], i);
        adapter.update(handle, items[i], i);
        this.hostNode.insertBefore(handle.root.node, this.anchor);
        next.push({ key, handle });
      }
    }

    for (const leftover of oldByKey.values()) {
      const node = leftover.handle.root.node;
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }

    // minimal-move reordering, walking the desired order back to front
    let ref: Node = this.anchor;
    for (let i = next.length - 1; i >= 0; i--) {
      const node = next[i].handle.root.node;
      if (node.nextSibling !== ref) {
        this.hostNode.insertBefore(node, ref);
      }
      ref = node;
    }

    this.entries = next;
  }

  destroy(removeDom: boolean): void {
    if (removeDom) {
      for (const entry of this.entries) {
        const node = entry.handle.root.node;
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
      if (this.anchor.parentNode) {
        this.anchor.parentNode.removeChild(this.anchor);
      }
    }
    this.entries = [];
  }
}

export interface RendererItem<P extends object = any> {
  key: ListKey;
  ctor: RendererClass<P>;
  props: P;
}

interface RendererEntry {
  key: ListKey;
  ctor: RendererClass;
  renderer: ErasedRenderer;
}

/**
 * A keyed list of child renderers (components with lifecycle). Matched by
 * key + class like the old keyed vdom reconciler; renderers must have a root
 * element (pass-through renderers are not reorderable).
 */
export class RendererList {
  readonly hostNode: Node;
  readonly anchor: Comment;
  private entries: RendererEntry[] = [];

  constructor(hostNode: Node, before: Node | null) {
    this.hostNode = hostNode;
    this.anchor = document.createComment('');
    hostNode.insertBefore(this.anchor, before);
  }

  sync(items: readonly RendererItem[]): void {
    const oldByKey = new Map<ListKey, RendererEntry>();
    for (const entry of this.entries) {
      const clash = oldByKey.get(entry.key);
      if (clash !== undefined) {
        // duplicate keys break matching (the map keeps only the last entry);
        // destroy the older renderer here so its DOM cannot leak
        console.warn('mochart renderer list has duplicate key: ' + String(entry.key));
        clash.renderer.destroy(true);
      }
      oldByKey.set(entry.key, entry);
    }

    const next: RendererEntry[] = [];
    for (const item of items) {
      const old = oldByKey.get(item.key);
      if (old !== undefined && old.ctor === item.ctor) {
        oldByKey.delete(item.key);
        old.renderer.update(item.props);
        next.push(old);
      }
      else {
        if (old !== undefined) {
          oldByKey.delete(item.key);
          old.renderer.destroy(true);
        }
        const renderer = new item.ctor();
        renderer.mount(this.hostNode, this.anchor, item.props);
        next.push({ key: item.key, ctor: item.ctor, renderer });
      }
    }

    for (const leftover of oldByKey.values()) {
      leftover.renderer.destroy(true);
    }

    // minimal-move reordering, walking the desired order back to front;
    // each renderer occupies [element?, anchor] in the host
    let ref: Node = this.anchor;
    for (let i = next.length - 1; i >= 0; i--) {
      const renderer = next[i].renderer;
      if (renderer.anchor.nextSibling !== ref) {
        renderer.moveBefore(ref);
      }
      ref = renderer.firstNode;
    }

    this.entries = next;
  }

  destroy(removeDom: boolean): void {
    for (const entry of this.entries) {
      entry.renderer.destroy(removeDom);
    }
    this.entries = [];
    if (removeDom && this.anchor.parentNode) {
      this.anchor.parentNode.removeChild(this.anchor);
    }
  }
}
