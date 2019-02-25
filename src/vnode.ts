import {
  isStrOrNumber,
  isNegitiveValue,
  flatten,
  isFunction,
  isEventBinding,
  isObject,
  isEqual
} from './utils'
import { ReactElement, Primitive, ReactRealDomNode } from './model'
import { Component, setCurrentDispatcher } from '.'

function domWillUnmount(dom: ReactRealDomNode) {
  const instance = dom.__react__
  if (instance) {
    instance.cleanupEffects()
  }
}

/**
 * Turn a vnode tree into real DOM and mount it
 * @param vnode
 * @param parent
 */
export function render(
  vnode: ReactElement | Primitive,
  parent: ReactRealDomNode | null = null
) {
  const mount = parent ? el => parent.appendChild(el) : el => el

  if (isStrOrNumber(vnode)) {
    // primitive dom render
    return mount(document.createTextNode(vnode as string))
  } else if (isNegitiveValue(vnode)) {
    // primitive dom render
    return mount(document.createTextNode(''))
  } else if (typeof vnode === 'object' && typeof vnode.type === 'string') {
    // vnode tree render
    const dom = mount(document.createElement(vnode.type as string))

    // vnode.children would be a 2 dimension array if children come from a component's children slot,
    flatten(vnode.children).forEach(child => {
      render(child, dom)
    })

    Object.entries(vnode.props).forEach(([attr, value]) => {
      setAttribute(dom, attr, value)
    })

    return dom
  } else if (typeof vnode === 'object' && isFunction(vnode.type)) {
    // Render react component
    const func = vnode.type
    const props = { ...vnode.props, children: vnode.children }

    const instance = new Component(props)

    setCurrentDispatcher(instance)

    const base = render(instance._render(func), parent)

    base.__react__ = instance
    base.__key__ = vnode.props.key

    instance.base = base

    instance.runActiveEffects()

    return base
  } else {
    console.warn(`ERROR ReactElement:`)
    console.log(vnode)
  }
}

const __ReactKeyedElmsPool: Map<string, ReactRealDomNode> = new Map()

/**
 * Diff old dom and fresh vnode, then patch
 * @param dom old DOM node
 * @param vnode fresh virtual DOM node
 * @param parent parentElement
 */
export function patch(
  dom: ReactRealDomNode,
  vnode: ReactElement,
  parent: HTMLElement = null
) {
  const replace = parent ? el => parent.replaceChild(el, dom) && el : el => el

  if (typeof vnode === 'object' && isFunction(vnode.type)) {
    // Function component patch
    const instance = dom.__react__
    if (instance && instance.renderFunc === vnode.type) {
      const shouldComponentUpdate = !isEqual(instance.props, vnode.children, [
        'children'
      ])

      if (shouldComponentUpdate) {
        instance.props = Object.assign({}, instance.props, vnode.props, {
          children: vnode.children
        })
        setCurrentDispatcher(instance)
        const newVnode = instance._render(instance.renderFunc)

        patch(dom, newVnode)
      }
    }
  } else if (typeof vnode !== 'object' && dom instanceof Text) {
    // only text content change
    // 文本节点对比文本节点
    return dom.textContent === vnode ? dom : replace(render(vnode, parent))
  } else if (typeof vnode !== 'object' && dom instanceof HTMLElement) {
    // only text override element
    // 文本节点替代元素
    const node = document.createTextNode(vnode)

    domWillUnmount(dom)

    return replace(node)
  } else if (typeof vnode === 'object' && dom instanceof Text) {
    // element take place of original text
    // 元素替代文本节点
    return replace(render(vnode, parent))
  } else if (
    typeof vnode === 'object' &&
    dom.nodeName !== (vnode.type as string).toUpperCase()
  ) {
    // different type of dom, full rerender and replace
    // 不一样的节点直接视为全替换
    return replace(render(vnode, parent))
  } else if (
    typeof vnode === 'object' &&
    dom.nodeName === (vnode.type as string).toUpperCase()
  ) {
    // the most common scenario, DOM update partially
    // 最常见的情况，节点部分更新，开始做详细的 diff
    const unkeyedElmsPool: Map<string, ReactRealDomNode> = new Map()

    const oldChildrenNodes = Array.from(dom.childNodes) as ReactRealDomNode[]

    oldChildrenNodes.forEach((child, index) => {
      const key = child.__key__

      if (!key) {
        const tmpMockKey: string = `INDEX__${index}`
        unkeyedElmsPool.set(tmpMockKey, child)
      }
    })

    // add or modify DOM node
    // 新增和更改 DOM
    flatten(vnode.children).forEach((newChildVnode: ReactElement, index) => {
      const key = newChildVnode.props && newChildVnode.props.key
      const tmpMockKey: string = `INDEX__${index}`

      if (key && __ReactKeyedElmsPool.has(key)) {
        const newDom = patch(__ReactKeyedElmsPool.get(key), newChildVnode, dom)
        __ReactKeyedElmsPool.set(key, newDom)
      } else if (!key && unkeyedElmsPool.has(tmpMockKey)) {
        // modify
        // 修改
        patch(unkeyedElmsPool.get(tmpMockKey), newChildVnode, dom)
        unkeyedElmsPool.delete(tmpMockKey)
      } else {
        // add
        // 新增
        render(newChildVnode, dom)
      }
    })

    // unmount the rest of doms not exist in current vnode.children
    // 删除这次更新不存在于新 children 的
    unkeyedElmsPool.forEach(restElm => {
      domWillUnmount(restElm)

      restElm.remove()
    })

    patchAttributes(dom, vnode)
  }
}

function patchAttributes(dom: ReactRealDomNode, { props: newProps }) {
  const oldAttrs = {}

  Array.from(dom.attributes).forEach(attr => {
    oldAttrs[attr.name] = attr.value
  })

  for (let attrName in oldAttrs) {
    if (attrName === 'class') {
      attrName = 'className'
    }
    if (!(attrName in newProps)) {
      setAttribute(dom, attrName, undefined)
    }
  }

  for (let attrName in newProps) {
    if (attrName === 'children') continue

    const value = newProps[attrName]

    if (attrName === 'className') {
      attrName = 'class'
    }

    if (oldAttrs[attrName] !== value) {
      if (attrName.startsWith('on')) {
        // 如果是事件绑定，先移除旧的
        const event = attrName.slice(2).toLocaleLowerCase()
        const oldListener = dom.__listeners__.get(event)
        dom.removeEventListener(event, oldListener)
      }
      setAttribute(dom, attrName, value)
    }
  }
}

/**
 * Make vnode.props into real attributes
 * @param elm target element
 * @param attr attribute name
 * @param value attribute value
 */
function setAttribute(elm: ReactRealDomNode, attr: string, value: any) {
  if (isFunction(value) && isEventBinding(attr)) {
    // event binding
    const event = attr.slice(2).toLocaleLowerCase()
    elm.addEventListener(event, value)
    if (!elm.__listeners__) {
      elm.__listeners__ = new Map()
    }

    elm.__listeners__.set(event, value)
  } else if (['checked', 'value', 'className'].includes(attr)) {
    // normal attributes
    elm[attr] = value
  } else if (attr === 'style' && isObject(value)) {
    // style assign
    Object.assign(elm.style, value)
  } else if (attr === 'ref' && isFunction(value)) {
    // allow user refer element to their custom variable
    // value: `(elm) => { someVar = elm }` alike
    value(elm)
  } else if (attr === 'key') {
    ;(elm as any).__key__ = value
    __ReactKeyedElmsPool.set(value, elm)
  } else {
    // whatever it be, just set it
    elm.setAttribute(attr, value)
  }
}

export default {
  render,
  patch
}
