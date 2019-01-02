export function isFunction(anything: any): boolean {
  return !isClass(anything) && typeof anything === 'function'
}

export function isClass(anything: any): boolean {
  return (
    typeof anything === 'function' &&
    Function.prototype.toString.call(anything).startsWith('class')
  )
}

export function isEventBinding(prop: string): boolean {
  return prop.startsWith('on')
}

export function isStrOrNumber(anything: any): boolean {
  return typeof anything === 'string' || typeof anything === 'number'
}

export function isNegitiveValue(anything: any): boolean {
  return anything === false || anything === null || anything === undefined
}

export function isObject(anything: any): boolean {
  return Object.prototype.toString.call(anything) === '[object Object]'
}

export function flatten<T>(array: T[]): T[] {
  return array.reduce((a, b) => {
    if (Array.isArray(b)) {
      return [...a, ...flatten(b)]
    } else {
      return [...a, b]
    }
  }, [])
}

export function isEqual(object, other):Boolean {
  return object === other
}
