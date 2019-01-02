import { isClass } from './utils'
import { patch } from './vnode'
import { ReactVNODE, FunctionComponent } from './model'

// TODO: comment for every variable
// TODO: make codes human-readable
let __currentDispatcher = null

const memoizedStates = []
const stateSetters = []
let cursor = 0

interface memoCursor {
  value: number
  __inited: boolean
}

export class Component {
  private memoStatesCursors: memoCursor[] = []
  private pointer = -1
  private renderFunc = null

  public base = null
  public isReactComponent = {}

  public componentDidMount = null

  constructor(public props = {}) {}

  public _render(func) {
    this.renderFunc = func
    const vnode = this.renderFunc(this.props)

    // every time after finishing render, reset cursor to -1
    this.pointer = -1
    return vnode
  }

  public useState(initialValue) {
    this.pointer++

    if (!this.memoStatesCursors[this.pointer]) {
      const memoState = initialValue

      memoizedStates.push(memoState)
      stateSetters.push(createStateSetter(cursor, this))

      let currentCursor = { value: cursor, __inited: true }

      this.memoStatesCursors.push(currentCursor)
      cursor++
    }

    const memoCursor = this.memoStatesCursors[this.pointer]

    const getter = memoizedStates[memoCursor.value]
    const setter = stateSetters[memoCursor.value]

    return [getter, setter]
  }

  public useEffect(callback) {
    this.componentDidMount = callback
  }
}

export function setCurrentDispatcher(instance) {
  __currentDispatcher = instance
}

function createStateSetter(cursor, instance) {
  return function(newValue) {
    memoizedStates[cursor] = newValue
    const { base, renderFunc } = instance
    setCurrentDispatcher(instance)
    const newVnode = instance._render(renderFunc)
    patch(base, newVnode)
  }
}

export function createElement(
  type: string | FunctionComponent,
  props: { [key: string]: any } | null,
  ...children: []
): ReactVNODE {
  if (isClass(type)) {
    console.warn(`Doesn\'t support class Component: ${type.toString()}`)
    return
  } else {
    const VDOM = {
      type: type,
      props: props || {},
      children
    }

    return VDOM
  }
}

export function useState(initialValue) {
  return __currentDispatcher.useState(initialValue)
}

export function useEffect(callback) {
  return __currentDispatcher.useEffect(callback)
}

export default {
  createElement,
  Component,
  useState,
  useEffect
}
