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

export function isArray(anything: any): boolean {
  return Array.isArray(anything)
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

export function isArrayEqual(arr: any[], other: any[]): boolean {
  if (arr.length !== other.length) return false

  if (arr.length === 0 && other.length === 0) return true

  const allEqual = arr.every((value, index) => {
    return _compareTwoValueToSeeIfTheyAreEquall(value, other[index])
  })

  return allEqual
}

export function isNaNX(anything: any) {
  return typeof anything === 'number' && isNaN(anything)
}

export function isEqual(
  object: Object,
  other: Object,
  ignoreKeys?: any[]
): boolean {
  const objKeys = _omitKeysIgnored(Object.keys(object), ignoreKeys)
  const otherKeys = _omitKeysIgnored(Object.keys(other), ignoreKeys)

  if (objKeys.length !== otherKeys.length) return false

  const allEqual = objKeys.every((key: string) => {
    return _compareTwoValueToSeeIfTheyAreEquall(object[key], other[key])
  })

  return allEqual
}

function _omitKeysIgnored(originKeys, ignoreKeys) {
  return originKeys.reduce((a, b) => {
    return a.concat(ignoreKeys.includes(b) ? [] : [b])
  }, [])
}

function _compareTwoValueToSeeIfTheyAreEquall(v1: any, v2: any): boolean {
  if (isObject(v1)) {
    if (!isObject(v2)) return false
    // if not equal, return true
    return isEqual(v1, v2)
  }

  if (isArray(v1)) {
    if (!isArray(v2)) return false
    // if not equal, return true
    return isArrayEqual(v1, v2)
  }

  if (isNaNX(v1)) {
    return isNaNX(v2)
  }

  if (v1 !== v2) return false

  return true
}
