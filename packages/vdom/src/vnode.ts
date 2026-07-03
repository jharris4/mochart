export const TEXT = Symbol('vdom.text');
export const EMPTY = Symbol('vdom.empty');

export type Key = string | number;
export type Ref<T = any> = (value: T | null) => void;

export type ComponentChild = VNode | string | number | boolean | null | undefined;
export type ComponentChildren = ComponentChild | ComponentChildren[];

export interface VNode<P = any> {
  type: any; // string | typeof TEXT | typeof EMPTY | function (component)
  props: P & { children?: ComponentChildren };
  key: Key | null;
  ref: Ref | null;
  text: string | null;
  /** dom node for element/text/empty vnodes; null for component vnodes */
  _dom: Node | null;
  /** normalized element children */
  _children: VNode[] | null;
  /** what a component vnode rendered */
  _rendered: VNode | null;
  /** class component instance */
  _component: any;
}

function createVNode(type: any, props: any, key: Key | null, ref: Ref | null, text: string | null): VNode {
  return { type, props, key, ref, text, _dom: null, _children: null, _rendered: null, _component: null };
}

export function h(type: any, props?: any, ...children: ComponentChildren[]): VNode {
  props = props ? { ...props } : {};
  const key = props.key !== undefined ? props.key : null;
  const ref = props.ref !== undefined ? props.ref : null;
  delete props.key;
  delete props.ref;
  // dev-only metadata injected by some JSX transforms; would defeat shallow-equality memoization
  delete props.__self;
  delete props.__source;
  if (children.length === 1) {
    props.children = children[0];
  }
  else if (children.length > 1) {
    props.children = children;
  }
  if (typeof type === 'function' && type.defaultProps) {
    for (const name in type.defaultProps) {
      if (props[name] === undefined) {
        props[name] = type.defaultProps[name];
      }
    }
  }
  return createVNode(type, props, key, ref, null);
}

/** Convert any renderable child into a vnode. Mounted vnodes are cloned so a vnode is never in two trees. */
export function normalize(child: ComponentChild): VNode {
  if (child == null || typeof child === 'boolean') {
    return createVNode(EMPTY, {}, null, null, null);
  }
  if (typeof child === 'string' || typeof child === 'number') {
    return createVNode(TEXT, {}, null, null, String(child));
  }
  const vnode = child as VNode;
  if (vnode._dom !== null || vnode._component !== null || vnode._rendered !== null) {
    return createVNode(vnode.type, vnode.props, vnode.key, vnode.ref, vnode.text);
  }
  return vnode;
}

/** Flatten nested child arrays into a flat vnode array, preserving holes as EMPTY vnodes. */
export function normalizeChildren(children: ComponentChildren, out: VNode[] = []): VNode[] {
  if (Array.isArray(children)) {
    for (const child of children) {
      if (Array.isArray(child)) {
        normalizeChildren(child, out);
      }
      else {
        out.push(normalize(child));
      }
    }
  }
  else if (children !== undefined || out.length > 0) {
    out.push(normalize(children));
  }
  return out;
}

export function shallowEqual(a: any, b: any): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  for (const key in a) {
    if (!(key in b)) {
      return false;
    }
  }
  for (const key in b) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}
