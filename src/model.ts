// An ReactElement is an immutable, plain object which represents a DOM node or component
export interface ReactElement {
  type: string | ((...args: any[]) => ReactElement)
  props: {
    [key: string]: any
  }
  children: ReactElement[]
  key?: string | number
}

export type MemoCursor = {
  value: number
  __inited: boolean
}

export type Effect = {
  callback: (elm: HTMLElement) => any
  cleanup: Function | null
  lastTimeDeps: any[]
}

export interface ReactRealDomNode extends HTMLElement {
  __react__?: any
  __key__?: any
  __listeners__?: Map<string, any>
}

export interface FunctionComponent {
  (props: object, children: ReactElement[]): ReactElement
}

export type Primitive = string | number | boolean | undefined | null
