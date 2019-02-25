import { isClass, isArrayEqual, isFunction, isArray } from './utils'
import { patch } from './vnode'
import { ReactElement, FunctionComponent, MemoCursor, Effect } from './model'

let __ReactCurrentInstance = null

let __ReactLatestStateCursor = 0
const __ReactMemoizedStates: any[] = []
const __ReactStateSetters = []

let __ReactLatestEffectCursor = 0
const __ReactMemoizedEffects: Effect[] = []

export class Component {
  // record how many states and which states this component used
  private memoStatesCursors: MemoCursor[] = []
  private stateWalkerPointer = -1

  // record how many effects and which effects this component used
  private memoEffectsCursors: MemoCursor[] = []
  private effectWalkerPointer = -1
  // cursors of active effect, will be invoked after mount
  public activeEffectCallbacks: number[] = []

  private renderFunc = null

  public base = null
  public isReactComponent = {}

  constructor(public props = {}) {}

  public _render(func) {
    this.renderFunc = func
    // reset activeEffectCallbacks array before every time renderFunc invoking
    // cuz they maybe different, depend on states' change
    this.activeEffectCallbacks.length = 0

    /**
     * Hooks like useState and useEffect would be invoked in renderFunc's execution.
     * States will take effect immediately.
     * But effectCallbacks run after rendered or pathed,
     * and only run active effectCallbacks if renderFunc called for patch
     */
    const vnode = this.renderFunc(this.props)

    // every time after finishing _render
    // reset walkers to -1 for next render
    this.stateWalkerPointer = -1
    this.effectWalkerPointer = -1
    return vnode
  }

  public runActiveEffects() {
    // walk effectCallbacks and
    this.activeEffectCallbacks.forEach(cursor => {
      const effectHook = __ReactMemoizedEffects[cursor]
      if (!isFunction(effectHook.callback)) return

      const cleanup = effectHook.callback()
      if (cleanup) {
        effectHook.cleanup = cleanup
      }
    })
  }

  public cleanupEffects() {
    this.memoEffectsCursors.forEach(({ value }) => {
      const effectHook = __ReactMemoizedEffects[value]

      const cleanup = effectHook.cleanup

      isFunction(cleanup) && cleanup()
    })
  }

  public useState(initialValue) {
    this.stateWalkerPointer++

    if (!this.memoStatesCursors[this.stateWalkerPointer]) {
      const memoState = initialValue

      __ReactMemoizedStates.push(memoState)
      __ReactStateSetters.push(
        createStateSetter(__ReactLatestStateCursor, this)
      )

      let currentCursor: MemoCursor = {
        value: __ReactLatestStateCursor,
        __inited: true
      }

      this.memoStatesCursors.push(currentCursor)
      __ReactLatestStateCursor++
    }

    const memoCursor = this.memoStatesCursors[this.stateWalkerPointer]

    const getter = __ReactMemoizedStates[memoCursor.value]
    const setter = __ReactStateSetters[memoCursor.value]

    return [getter, setter]
  }

  /**
   * Effect hook: https://reactjs.org/docs/hooks-effect.html
   * @param effectCallback method be invoked when component did mount, can return a cleanup function
   * @param dependiencies effect will only activate if the values in the list change.
   */
  public useEffect(
    effectCallback: () => any,
    dependiencies: any[] | null = null
  ) {
    this.effectWalkerPointer++

    if (!this.memoEffectsCursors[this.effectWalkerPointer]) {
      // first time render
      __ReactMemoizedEffects.push({
        callback: effectCallback,
        cleanup: null,
        lastTimeDeps: isArray(dependiencies)
          ? dependiencies.map(dep => dep)
          : dependiencies
      })

      let currentCursor: MemoCursor = {
        value: __ReactLatestEffectCursor,
        __inited: true
      }

      this.memoEffectsCursors.push(currentCursor)

      this.activeEffectCallbacks.push(__ReactLatestEffectCursor)

      __ReactLatestEffectCursor++
    } else {
      // time trigger state setter
      const cursor = this.memoEffectsCursors[this.effectWalkerPointer].value

      const memoEffect = __ReactMemoizedEffects[cursor]
      // reassign callback for refreshing closure
      memoEffect.callback = effectCallback

      const shouldActive =
        memoEffect.lastTimeDeps === null ||
        !isArrayEqual(memoEffect.lastTimeDeps, dependiencies)

      if (shouldActive) {
        this.activeEffectCallbacks.push(cursor)
        // update dependiencies
        memoEffect.lastTimeDeps = dependiencies
      }
    }
  }
}

export function setCurrentDispatcher(instance) {
  __ReactCurrentInstance = instance
}

function createStateSetter(__ReactLatestStateCursor, instance) {
  return function(newValue) {
    Promise.resolve().then(() => {
      // update new value into __ReactMemoizedStates
      __ReactMemoizedStates[__ReactLatestStateCursor] = newValue
      const { base, renderFunc } = instance
      setCurrentDispatcher(instance)
      const newVnode = instance._render(renderFunc)
      // patch current DOM node with newVnode
      patch(base, newVnode)

      instance.runActiveEffects()
    })
  }
}

// Actually, it should be called 'create ReactElement'
export function createElement(
  type: string | FunctionComponent,
  props: { [key: string]: any } | null,
  ...children: []
): ReactElement {
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
  return __ReactCurrentInstance.useState(initialValue)
}

export function useEffect(effectCallback: any, dependiencies?: any[]) {
  return __ReactCurrentInstance.useEffect(effectCallback, dependiencies)
}

export default {
  createElement,
  Component,
  useState,
  useEffect
}
