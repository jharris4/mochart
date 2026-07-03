import { VNode, TEXT, EMPTY, normalize, normalizeChildren, shallowEqual } from './vnode';
import { SVG_NAMESPACE, setProperty } from './dom';
import { Component, _setRerender } from './component';

// callbacks (refs, didMount, didUpdate, setState callbacks) run after the DOM is attached
let commitQueue: (() => void)[] = [];
let renderDepth = 0;

function flushCommitQueue(): void {
  while (commitQueue.length > 0) {
    const callbacks = commitQueue;
    commitQueue = [];
    for (const callback of callbacks) {
      callback();
    }
  }
}

function drainStateCallbacks(component: Component): void {
  if (component._stateCallbacks.length > 0) {
    const callbacks = component._stateCallbacks;
    component._stateCallbacks = [];
    for (const callback of callbacks) {
      commitQueue.push(callback);
    }
  }
}

/** Resolve the single DOM node a vnode owns (following component render chains). */
export function domOf(vnode: VNode): Node {
  let current = vnode;
  while (current._rendered !== null) {
    current = current._rendered;
  }
  return current._dom as Node;
}

function isClassComponent(type: any): boolean {
  return typeof type === 'function' && type.prototype && type.prototype._isComponent === true;
}

function adoptPendingState(component: Component): void {
  if (component._nextState !== null) {
    component.state = component._nextState;
    component._nextState = null;
  }
}

/** Create the DOM tree for a vnode. The returned node is NOT inserted; the caller does that. */
function mountVNode(vnode: VNode, parentDom: Node, isSvg: boolean): Node {
  const { type, props } = vnode;

  if (type === TEXT) {
    const dom = document.createTextNode(vnode.text as string);
    vnode._dom = dom;
    return dom;
  }

  if (type === EMPTY) {
    const dom = document.createComment('');
    vnode._dom = dom;
    return dom;
  }

  if (typeof type === 'function') {
    let rendered: VNode;
    if (isClassComponent(type)) {
      const component: Component = new type(props);
      component.props = props;
      component._vnode = vnode;
      component._parentDom = parentDom;
      component._svg = isSvg;
      vnode._component = component;
      if (component.componentWillMount) {
        component._mergeState = true;
        component.componentWillMount();
        component._mergeState = false;
        adoptPendingState(component);
      }
      rendered = normalize(component.render());
      vnode._rendered = rendered;
      const dom = mountVNode(rendered, parentDom, isSvg);
      if (component.componentDidMount) {
        commitQueue.push(() => {
          if (!component._unmounted) {
            component.componentDidMount!();
          }
        });
      }
      drainStateCallbacks(component);
      return dom;
    }
    rendered = normalize(type(props));
    vnode._rendered = rendered;
    return mountVNode(rendered, parentDom, isSvg);
  }

  const elementIsSvg = isSvg || type === 'svg';
  const dom = elementIsSvg
    ? document.createElementNS(SVG_NAMESPACE, type as string)
    : document.createElement(type as string);
  vnode._dom = dom;

  for (const name in props) {
    setProperty(dom, name, null, props[name], elementIsSvg);
  }

  const childIsSvg = elementIsSvg && type !== 'foreignObject';
  const children = normalizeChildren(props.children);
  vnode._children = children;
  for (const child of children) {
    dom.appendChild(mountVNode(child, dom, childIsSvg));
  }

  if (vnode.ref) {
    const ref = vnode.ref;
    commitQueue.push(() => ref(dom));
  }

  return dom;
}

function unmount(vnode: VNode, skipRemove: boolean): void {
  const component: Component | null = vnode._component;
  if (component !== null) {
    component._unmounted = true;
    if (component.componentWillUnmount) {
      component.componentWillUnmount();
    }
  }
  if (vnode.ref) {
    vnode.ref(null);
  }
  if (vnode._rendered !== null) {
    unmount(vnode._rendered, skipRemove);
    return;
  }
  if (vnode._children !== null) {
    for (const child of vnode._children) {
      unmount(child, true);
    }
  }
  if (!skipRemove && vnode._dom && vnode._dom.parentNode) {
    vnode._dom.parentNode.removeChild(vnode._dom);
  }
}

function keyFor(vnode: VNode, index: number): string {
  return vnode.key != null ? 'k:' + vnode.key : 'i:' + index;
}

function reconcileChildren(parentDom: Node, oldChildren: VNode[], newChildren: VNode[], isSvg: boolean): void {
  const oldByKey = new Map<string, VNode>();
  for (let i = 0; i < oldChildren.length; i++) {
    oldByKey.set(keyFor(oldChildren[i], i), oldChildren[i]);
  }

  for (let i = 0; i < newChildren.length; i++) {
    const child = newChildren[i];
    const key = keyFor(child, i);
    const old = oldByKey.get(key);
    if (old !== undefined && old.type === child.type) {
      oldByKey.delete(key);
      patchVNode(parentDom, old, child, isSvg);
    }
    else {
      mountVNode(child, parentDom, isSvg);
    }
  }

  for (const leftover of oldByKey.values()) {
    unmount(leftover, false);
  }

  // minimal-move reordering: walk the desired order against the actual sibling order
  let cursor = parentDom.firstChild;
  for (const child of newChildren) {
    const dom = domOf(child);
    if (dom === cursor) {
      cursor = cursor.nextSibling;
    }
    else {
      parentDom.insertBefore(dom, cursor);
    }
  }
}

/**
 * Update the DOM owned by oldVNode to match newVNode.
 * Returns newVNode with its internals (dom, children, component) attached.
 */
function patchVNode(parentDom: Node, oldVNode: VNode, newVNode: VNode, isSvg: boolean): VNode {
  if (oldVNode === newVNode) {
    return newVNode;
  }

  if (oldVNode.type !== newVNode.type) {
    const newDom = mountVNode(newVNode, parentDom, isSvg);
    parentDom.insertBefore(newDom, domOf(oldVNode));
    unmount(oldVNode, false);
    return newVNode;
  }

  const { type } = newVNode;

  if (type === TEXT) {
    newVNode._dom = oldVNode._dom;
    if (oldVNode.text !== newVNode.text) {
      (newVNode._dom as Text).nodeValue = newVNode.text;
    }
    return newVNode;
  }

  if (type === EMPTY) {
    newVNode._dom = oldVNode._dom;
    return newVNode;
  }

  if (typeof type === 'function') {
    if (isClassComponent(type)) {
      const component: Component = oldVNode._component;
      newVNode._component = component;
      component._vnode = newVNode;
      component._parentDom = parentDom;
      component._svg = isSvg;

      if (component.componentWillReceiveProps && newVNode.props !== oldVNode.props) {
        component._mergeState = true;
        component.componentWillReceiveProps(newVNode.props);
        component._mergeState = false;
      }

      const prevProps = component.props;
      const prevState = component.state;
      const nextState = component._nextState !== null ? component._nextState : component.state;

      let skip = false;
      if (component.shouldComponentUpdate) {
        skip = component.shouldComponentUpdate(newVNode.props, nextState) === false;
      }
      else if ((component as any)._isPure) {
        skip = shallowEqual(prevProps, newVNode.props) && shallowEqual(prevState, nextState);
      }

      component.props = newVNode.props;
      component.state = nextState;
      component._nextState = null;

      if (skip) {
        newVNode._rendered = oldVNode._rendered;
      }
      else {
        const rendered = normalize(component.render());
        newVNode._rendered = patchVNode(parentDom, oldVNode._rendered as VNode, rendered, isSvg);
        if (component.componentDidUpdate) {
          commitQueue.push(() => {
            if (!component._unmounted) {
              component.componentDidUpdate!(prevProps, prevState);
            }
          });
        }
      }
      drainStateCallbacks(component);
      return newVNode;
    }

    // function components are pure: skip re-render when props are shallow-equal
    if (shallowEqual(oldVNode.props, newVNode.props)) {
      newVNode._rendered = oldVNode._rendered;
    }
    else {
      const rendered = normalize(type(newVNode.props));
      newVNode._rendered = patchVNode(parentDom, oldVNode._rendered as VNode, rendered, isSvg);
    }
    return newVNode;
  }

  // element
  const dom = oldVNode._dom as Element;
  newVNode._dom = dom;
  const elementIsSvg = isSvg || type === 'svg';
  const oldProps = oldVNode.props;
  const newProps = newVNode.props;

  for (const name in oldProps) {
    if (name !== 'children' && !(name in newProps)) {
      setProperty(dom, name, oldProps[name], null, elementIsSvg);
    }
  }
  for (const name in newProps) {
    if (name !== 'children' && oldProps[name] !== newProps[name]) {
      setProperty(dom, name, oldProps[name], newProps[name], elementIsSvg);
    }
  }

  const childIsSvg = elementIsSvg && type !== 'foreignObject';
  const newChildren = normalizeChildren(newProps.children);
  newVNode._children = newChildren;
  reconcileChildren(dom, oldVNode._children || [], newChildren, childIsSvg);

  if (oldVNode.ref !== newVNode.ref) {
    if (oldVNode.ref) {
      const oldRef = oldVNode.ref;
      commitQueue.push(() => oldRef(null));
    }
    if (newVNode.ref) {
      const newRef = newVNode.ref;
      commitQueue.push(() => newRef(dom));
    }
  }

  return newVNode;
}

function rerenderComponent(component: Component, force: boolean): void {
  if (component._unmounted || component._vnode === null) {
    return;
  }
  const vnode = component._vnode;
  const prevProps = component.props;
  const prevState = component.state;
  const nextState = component._nextState !== null ? component._nextState : component.state;

  let skip = false;
  if (!force) {
    if (component.shouldComponentUpdate) {
      skip = component.shouldComponentUpdate(component.props, nextState) === false;
    }
    else if ((component as any)._isPure) {
      skip = shallowEqual(prevState, nextState);
    }
  }

  component.state = nextState;
  component._nextState = null;

  if (!skip) {
    renderDepth++;
    try {
      const rendered = normalize(component.render());
      vnode._rendered = patchVNode(component._parentDom as Node, vnode._rendered as VNode, rendered, component._svg);
      if (component.componentDidUpdate) {
        commitQueue.push(() => {
          if (!component._unmounted) {
            component.componentDidUpdate!(prevProps, prevState);
          }
        });
      }
    }
    finally {
      renderDepth--;
    }
  }

  drainStateCallbacks(component);
  if (renderDepth === 0) {
    flushCommitQueue();
  }
}

_setRerender(rerenderComponent);

interface RootContainer extends Node {
  _vroot?: VNode | null;
}

/** Render a vnode into a container element, patching any previous render. */
export function render(vnode: any, container: RootContainer): void {
  renderDepth++;
  try {
    const newRoot = normalize(vnode);
    const oldRoot = container._vroot;
    if (oldRoot != null) {
      patchVNode(container, oldRoot, newRoot, false);
    }
    else {
      container.appendChild(mountVNode(newRoot, container, false));
    }
    container._vroot = newRoot;
  }
  finally {
    renderDepth--;
  }
  if (renderDepth === 0) {
    flushCommitQueue();
  }
}

/** Unmount whatever render() mounted into the container. */
export function unmountAtNode(container: RootContainer): void {
  if (container._vroot != null) {
    unmount(container._vroot, false);
    container._vroot = null;
    flushCommitQueue();
  }
}
