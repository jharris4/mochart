export { h, shallowEqual, TEXT, EMPTY } from './vnode';
export type { VNode, Key, Ref, ComponentChild, ComponentChildren } from './vnode';
export { Component, PureComponent } from './component';
export { render, unmountAtNode, domOf } from './diff';

import type { VNode as VNodeType } from './vnode';

declare global {
  namespace JSX {
    type Element = VNodeType;
    interface ElementClass {
      render(): any;
    }
    interface ElementAttributesProperty {
      props: {};
    }
    interface ElementChildrenAttribute {
      children: {};
    }
    interface IntrinsicAttributes {
      key?: string | number;
      ref?: (value: any) => void;
    }
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
