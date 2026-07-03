import type { VNode } from './vnode';

type Rerender = (component: Component, force: boolean) => void;

let rerender: Rerender = () => {
  throw new Error('vdom renderer not initialized');
};

export function _setRerender(fn: Rerender): void {
  rerender = fn;
}

export type StateUpdate<P, S> = Partial<S> | ((state: S, props: P) => Partial<S> | null) | null;

export class Component<P = any, S = any> {
  props: P;
  state: S;

  _vnode: VNode | null = null;
  _parentDom: Node | null = null;
  _svg = false;
  _nextState: S | null = null;
  /** while true (willMount/willReceiveProps), setState merges without re-rendering */
  _mergeState = false;
  _unmounted = false;
  _stateCallbacks: (() => void)[] = [];

  // optional lifecycle methods, matching what the mochart codebase uses
  componentWillMount?(): void;
  componentDidMount?(): void;
  componentWillReceiveProps?(nextProps: P): void;
  shouldComponentUpdate?(nextProps: P, nextState: S): boolean;
  componentDidUpdate?(prevProps: P, prevState: S): void;
  componentWillUnmount?(): void;

  constructor(props: P) {
    this.props = props;
    this.state = {} as S;
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
      rerender(this, false);
    }
  }

  forceUpdate(callback?: () => void): void {
    if (callback) {
      this._stateCallbacks.push(callback);
    }
    if (!this._unmounted) {
      rerender(this, true);
    }
  }

  render(): any {
    return null;
  }
}

(Component.prototype as any)._isComponent = true;

export class PureComponent<P = any, S = any> extends Component<P, S> {}

(PureComponent.prototype as any)._isPure = true;
