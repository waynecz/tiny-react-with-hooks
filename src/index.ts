import { isClass } from "./utils";
import { patch } from "./vnode";
import { ReactVNODE, FunctionComponent } from "./model";

let __ReactCurrentInstance = null;
let __ReactLatestStateCursor = 0;
const __ReactMemoizedStates = [];
const __ReactStateSetters = [];

interface MemoCursor {
  value: number;
  __inited: boolean;
}

export class Component {
  private memoStatesCursors: MemoCursor[] = [];
  private pointer = -1; // to be added
  private renderFunc = null;

  public base = null;
  public isReactComponent = {};

  public componentDidMount = null;
  public componentWillUnmount = null;

  constructor(public props = {}) {}

  public _render(func) {
    this.renderFunc = func;
    const vnode = this.renderFunc(this.props);

    // every time after finishing render, reset cursor to -1
    this.pointer = -1;
    return vnode;
  }

  public useState(initialValue) {
    this.pointer++;

    if (!this.memoStatesCursors[this.pointer]) {
      const memoState = initialValue;

      __ReactMemoizedStates.push(memoState);
      __ReactStateSetters.push(
        createStateSetter(__ReactLatestStateCursor, this)
      );

      let currentCursor: MemoCursor = {
        value: __ReactLatestStateCursor,
        __inited: true
      };

      this.memoStatesCursors.push(currentCursor);
      __ReactLatestStateCursor++;
    }

    const memoCursor = this.memoStatesCursors[this.pointer];

    const getter = __ReactMemoizedStates[memoCursor.value];
    const setter = __ReactStateSetters[memoCursor.value];

    return [getter, setter];
  }

  public useEffect(
    componentDidMount: Function,
    componentWillUnmount?: Function
  ) {
    this.componentDidMount = componentDidMount;
    this.componentWillUnmount = componentWillUnmount;
  }
}

export function setCurrentDispatcher(instance) {
  __ReactCurrentInstance = instance;
}

function createStateSetter(__ReactLatestStateCursor, instance) {
  return function(newValue) {
    __ReactMemoizedStates[__ReactLatestStateCursor] = newValue;
    const { base, renderFunc } = instance;
    setCurrentDispatcher(instance);
    const newVnode = instance._render(renderFunc);
    patch(base, newVnode);
  };
}

export function createElement(
  type: string | FunctionComponent,
  props: { [key: string]: any } | null,
  ...children: []
): ReactVNODE {
  if (isClass(type)) {
    console.warn(`Doesn\'t support class Component: ${type.toString()}`);
    return;
  } else {
    const VDOM = {
      type: type,
      props: props || {},
      children
    };

    return VDOM;
  }
}

export function useState(initialValue) {
  return __ReactCurrentInstance.useState(initialValue);
}

export function useEffect(componentDidMount, componentWillUnmount?) {
  return __ReactCurrentInstance.useEffect(
    componentDidMount,
    componentWillUnmount
  );
}

export default {
  createElement,
  Component,
  useState,
  useEffect
};
