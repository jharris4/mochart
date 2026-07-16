import { shallowEqual, enqueue, beginWork, endWork } from './shared';
import { El } from './el';
import { Slot } from './slot';
import { ElSlot } from './elslot';
import { ElList, RendererList } from './list';

export type StateUpdate<P, S> = Partial<S> | ((state: S, props: P) => Partial<S> | null) | null;

export interface RendererClass<P extends object = any> {
  new (): Renderer<P, any>;
  defaultProps?: Partial<P>;
}

interface ChildRegion {
  hostNode: Node;
  destroy(removeDom: boolean): void;
}

interface ConstructorWithDefaults<P extends object> {
  defaultProps?: Partial<P>;
}

function withDefaults<P extends object>(ctor: ConstructorWithDefaults<P>, props: P): P {
  const defaults = ctor.defaultProps;
  if (!defaults) {
    return props;
  }
  let out = props;
  let outValues = props as unknown as Record<string, unknown>;
  const defaultValues = defaults as unknown as Record<string, unknown>;
  for (const name in defaults) {
    if (outValues[name] === undefined) {
      if (out === props) {
        out = { ...props };
        outValues = out as unknown as Record<string, unknown>;
      }
      outValues[name] = defaultValues[name];
    }
  }
  return out;
}

/**
 * Base class for retained-mode chart components.
 *
 * Keeps the lifecycle contract of the old vdom PureComponent — willMount,
 * willReceiveProps (setState merges without re-render), shallow-equal
 * skipping of unchanged subtrees, didMount/didUpdate deferred until the DOM
 * is fully written — but rendering is imperative: `create()` builds the
 * static DOM once, `sync()` writes the dynamic parts directly. No vnode
 * allocation, no tree diffing.
 *
 * Every renderer owns a comment anchor in its parent so it can detach and
 * re-attach its root element (the old `render() { return false; }` case)
 * without losing its position among siblings.
 */
export abstract class Renderer<P extends object = any, S extends object = any> {
  props!: P;
  state: S;

  parentDom!: Node;
  anchor!: Comment;
  /** root element; null for pass-through renderers that only mount children */
  element: Node | null = null;
  present = false;

  _unmounted = false;
  /** while true (willMount/willReceiveProps), setState merges without re-rendering */
  _mergeState = false;
  _nextState: S | null = null;
  _stateCallbacks: (() => void)[] = [];
  private regions: ChildRegion[] = [];

  constructor() {
    this.state = {} as S;
  }

  // optional lifecycle hooks, mirroring what the vdom components used
  willMount?(): void;
  didMount?(): void;
  willReceiveProps?(nextProps: P): void;
  shouldSync?(nextProps: P, nextState: S): boolean;
  didUpdate?(prevProps: P, prevState: S): void;
  willUnmount?(): void;

  /** Build the renderer's static DOM (once). Return the root node, or null for pass-through renderers. */
  protected abstract create(): Node | null;
  /** Write all dynamic attributes/children from this.props/this.state. */
  protected abstract sync(): void;

  mount(parentDom: Node, before: Node | null, props: P): void {
    beginWork();
    try {
      this.parentDom = parentDom;
      this.anchor = document.createComment('');
      parentDom.insertBefore(this.anchor, before);
      this.props = withDefaults(this.constructor as ConstructorWithDefaults<P>, props);
      if (this.willMount) {
        this._mergeState = true;
        this.willMount();
        this._mergeState = false;
        this.adoptPendingState();
      }
      this.element = this.create();
      if (this.element !== null) {
        parentDom.insertBefore(this.element, this.anchor);
        this.present = true;
      }
      this.sync();
      if (this.didMount) {
        enqueue(() => {
          if (!this._unmounted) {
            this.didMount!();
          }
        });
      }
      this.drainStateCallbacks();
    }
    finally {
      endWork();
    }
  }

  update(props: P): void {
    if (this._unmounted) {
      return;
    }
    beginWork();
    try {
      const nextProps = withDefaults(this.constructor as ConstructorWithDefaults<P>, props);
      if (this.willReceiveProps && nextProps !== this.props) {
        this._mergeState = true;
        this.willReceiveProps(nextProps);
        this._mergeState = false;
      }
      const prevProps = this.props;
      const prevState = this.state;
      const nextState = this._nextState !== null ? this._nextState : this.state;

      let skip: boolean;
      if (this.shouldSync) {
        skip = this.shouldSync(nextProps, nextState) === false;
      }
      else {
        skip = shallowEqual(prevProps, nextProps) && shallowEqual(prevState, nextState);
      }

      this.props = nextProps;
      this.state = nextState;
      this._nextState = null;

      if (!skip) {
        this.sync();
        this.queueDidUpdate(prevProps, prevState);
      }
      this.drainStateCallbacks();
    }
    finally {
      endWork();
    }
  }

  setState(update: StateUpdate<P, S>, callback?: () => void): void {
    const base = this._nextState !== null ? this._nextState : this.state;
    const partial = typeof update === 'function' ? update(base, this.props) : update;
    if (partial == null && !callback) {
      return;
    }
    this._nextState = partial == null ? base : { ...base, ...partial };
    if (callback) {
      this._stateCallbacks.push(callback);
    }
    if (!this._mergeState && !this._unmounted) {
      this.syncFromState(false);
    }
  }

  forceSync(callback?: () => void): void {
    if (callback) {
      this._stateCallbacks.push(callback);
    }
    if (!this._unmounted) {
      this.syncFromState(true);
    }
  }

  private syncFromState(force: boolean): void {
    beginWork();
    try {
      const prevProps = this.props;
      const prevState = this.state;
      const nextState = this._nextState !== null ? this._nextState : this.state;

      let skip = false;
      if (!force) {
        if (this.shouldSync) {
          skip = this.shouldSync(this.props, nextState) === false;
        }
        else {
          skip = shallowEqual(prevState, nextState);
        }
      }

      this.state = nextState;
      this._nextState = null;

      if (!skip) {
        this.sync();
        this.queueDidUpdate(prevProps, prevState);
      }
      this.drainStateCallbacks();
    }
    finally {
      endWork();
    }
  }

  private queueDidUpdate(prevProps: P, prevState: S): void {
    if (this.didUpdate) {
      enqueue(() => {
        if (!this._unmounted) {
          this.didUpdate!(prevProps, prevState);
        }
      });
    }
  }

  private adoptPendingState(): void {
    if (this._nextState !== null) {
      this.state = this._nextState;
      this._nextState = null;
    }
  }

  private drainStateCallbacks(): void {
    if (this._stateCallbacks.length > 0) {
      const callbacks = this._stateCallbacks;
      this._stateCallbacks = [];
      for (const callback of callbacks) {
        enqueue(callback);
      }
    }
  }

  /** Attach/detach the root element while keeping its sibling position (the `render() -> false` case). */
  protected setPresent(present: boolean): void {
    if (this.element === null || present === this.present) {
      return;
    }
    if (present) {
      this.parentDom.insertBefore(this.element, this.anchor);
    }
    else {
      this.parentDom.removeChild(this.element);
    }
    this.present = present;
  }

  /** Reposition this renderer (element + anchor) before a reference node. Used by RendererList reordering. */
  moveBefore(ref: Node | null): void {
    if (this.element !== null && this.present) {
      this.parentDom.insertBefore(this.element, ref);
    }
    this.parentDom.insertBefore(this.anchor, ref);
  }

  /** First DOM node owned by this renderer (for list reordering cursors). */
  get firstNode(): Node {
    return this.element !== null && this.present ? this.element : this.anchor;
  }

  // ---------------------------------------------------------------------
  // child region factories — registered so destroy() cascades automatically
  // ---------------------------------------------------------------------

  /** A single dynamic child renderer, anchored inside `host` (or in this renderer's own region when omitted). */
  protected slot(host?: El | Node): Slot {
    const created = host !== undefined
      ? new Slot(host instanceof El ? host.node : host, null)
      : new Slot(this.parentDom, this.anchor);
    this.regions.push(created);
    return created;
  }

  /** A single conditional/polymorphic element position, anchored inside `host` (or in this renderer's own region when omitted). */
  protected elSlot(host?: El | Node): ElSlot {
    const created = host !== undefined
      ? new ElSlot(host instanceof El ? host.node : host, null)
      : new ElSlot(this.parentDom, this.anchor);
    this.regions.push(created);
    return created;
  }

  /** A keyed list of element subtrees, anchored inside `host` (or in this renderer's own region when omitted). */
  protected elList<T>(host?: El | Node): ElList<T> {
    const created = host !== undefined
      ? new ElList<T>(host instanceof El ? host.node : host, null)
      : new ElList<T>(this.parentDom, this.anchor);
    this.regions.push(created);
    return created;
  }

  /** A keyed list of child renderers, anchored inside `host` (or in this renderer's own region when omitted). */
  protected rendererList(host?: El | Node): RendererList {
    const created = host !== undefined
      ? new RendererList(host instanceof El ? host.node : host, null)
      : new RendererList(this.parentDom, this.anchor);
    this.regions.push(created);
    return created;
  }

  destroy(removeDom = true): void {
    if (this._unmounted) {
      return;
    }
    beginWork();
    try {
      this._unmounted = true;
      if (this.willUnmount) {
        this.willUnmount();
      }
      for (const region of this.regions) {
        // regions hosted inside our own element are discarded wholesale with it
        const insideElement = this.element !== null && this.element.contains(region.hostNode);
        region.destroy(removeDom && !insideElement);
      }
      this.regions = [];
      if (removeDom) {
        if (this.element !== null && this.present) {
          this.parentDom.removeChild(this.element);
        }
        if (this.anchor.parentNode) {
          this.anchor.parentNode.removeChild(this.anchor);
        }
      }
    }
    finally {
      endWork();
    }
  }
}
