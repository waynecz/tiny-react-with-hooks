export interface ReactVNODE {
  type: string | ((...args: any[]) => ReactVNODE)
  props: {
    [key: string]: any
  }
  children: ReactVNODE[]
  key?: string | number

  __isComponent?: boolean
  updater?: any
}

export interface ReactElement extends HTMLElement {
  __react__?: any
  __key__?: any
  __listeners__?: Map<string, any>
}

export interface FunctionComponent {
  (props: object, children: ReactVNODE[]): ReactVNODE
}

export type Primitive = string | number | boolean | undefined | null
