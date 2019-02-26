import { isClass, isArrayEqual, isFunction, isArray } from './utils'
import { patch } from './vnode'
import { ReactElement, FunctionComponent, MemoCursor, Effect } from './model'

let __ReactCurrentInstance = null

let __ReactLatestStateCursor = 0
const __ReactMemoizedStates: any[] = []
const __ReactStateSetters = []

let __ReactLatestEffectCursor = 0
const __ReactMemoizedEffects: Effect[] = []

/**
 * This is the real Component in React, the Functional Component we write is
 * just an renderFunc of a component, besides Functional Component return a tree consist of ReactElements
 * real Component also store props, memorize those states and effect it used etc.
 * 
 * 这个才是真正的组件，代码里写的 function 其实只是 Component 的 renderFunc(渲染函数)，
 * renderFunc 返回一个由 ReactElement 组成的 tree 。
 * Component 实例会保存 props, 组件的 real DOM node 等必要信息，
 * 实例还记录了 renderFunc 所需的 states, effect 指针等。
 */
export class Component {
  // record how many states and which states this component used.
  // For example the value is [2,3,4,5], it says this Component invoke useState 4 times, generate 4 memorized states in __ReactMemoizedStates
  // and the states' index in __ReactMemoizedStates should be 2nd, 3rd, 4th...
  // 记录当前实例用了多少个、哪几个在 __ReactMemoizedStates 的状态
  // 例如值是 [2,3,4,5], 则说明了该组件内用了四个 useState，
  // 并且每个状态的位置对应在 __ReactMemoizedStates 数组中按顺序就是 第二个，第三个...
  private memoStatesCursors: MemoCursor[] = []
  // ⚠️ every time useState been executed, this pointer will increase by step 1, the pointer is memoStatesCursors' index!
  // ⚠️ 每次组件内执行 useState 时这个指针就会 +1，这个指针的值是 memoStatesCursors 的 index！！
  private stateWalkerPointer = -1

  // record how many effects and which effects this component used
  // 记录当前实例用了多少个、哪几个在 __ReactMemoizedEffects 的 effect 回调
  private memoEffectsCursors: MemoCursor[] = []
  // the same as stateWalkerPointer
  // 同 stateWalkerPointer
  private effectWalkerPointer = -1
  // cursors of active effect, will be invoked after mount
  // 记录首次渲染 或者 本次更新 里需要激活执行的 effect 回调，因为可能 effect 有第二个参数决定是否执行
  public activeEffectCallbacks: number[] = []

  private renderFunc = null

  public base = null
  public isReactComponent = {}

  constructor(public props = {}) {}

  public _render(func) {
    this.renderFunc = func
    // reset activeEffectCallbacks array before every time renderFunc invoking
    // cuz they maybe different, depend on states' change
    // 每次执行渲染、更新渲染前，要重新开始收集需要激活的 effect
    this.activeEffectCallbacks.length = 0

    /**
     * Hooks like useState and useEffect would be invoked in renderFunc's execution.
     * States will take effect immediately.
     * But effectCallbacks run after rendered or pathed,
     * and only run active effectCallbacks if renderFunc called for patch
     * 在 rednderFunc 执行的时候 useState 和 useEffect 才会被真正执行
     * state 会立马返回值
     * 但是 effect 的回调是要等到组件 首次挂载、更新完后 再执行的，并且只跑那些激活的回调
     */
    const vnode = this.renderFunc(this.props)

    // every time after finishing _render
    // reset walkers to -1 for next render
    // 每次执行完组件函数拨回这两个指针，因为下次渲染又是从头开始
    this.stateWalkerPointer = -1
    this.effectWalkerPointer = -1
    return vnode
  }

  public runActiveEffects() {
    // walk effectCallbacks and
    this.activeEffectCallbacks.forEach(cursor => {
      const effectHook = __ReactMemoizedEffects[cursor]
      if (!isFunction(effectHook.callback)) return

      const cleanup = effectHook.callback(this.base)
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
      // 组件第一次执行时
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
      // 组件更新时
      const cursor = this.memoEffectsCursors[this.effectWalkerPointer].value

      const memoEffect = __ReactMemoizedEffects[cursor]
      // reassign callback for refreshing closure
       // 一定要重新将 callback 赋值，因为闭包内的变量可能会更新！！！
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
