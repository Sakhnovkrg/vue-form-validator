/**
 * Глубокое сравнение двух значений с поддержкой File, Date и других типов
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (a === null || a === undefined || b === null || b === undefined) {
    return false
  }

  if (typeof File !== 'undefined' && a instanceof File && b instanceof File) {
    return (
      a.name === b.name &&
      a.size === b.size &&
      a.lastModified === b.lastModified
    )
  }

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  if (typeof a !== typeof b) return false

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }

  if (Array.isArray(a) || Array.isArray(b)) return false

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as object)
    const keysB = Object.keys(b as object)
    if (keysA.length !== keysB.length) return false
    return keysA.every(key =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    )
  }

  return false
}

/**
 * Глубокое клонирование с поддержкой File, Date и других специальных типов
 */
export function deepClone(value: unknown): unknown {
  if (value === null || value === undefined) return value

  if (
    (typeof File !== 'undefined' && value instanceof File) ||
    (typeof Blob !== 'undefined' && value instanceof Blob)
  ) {
    return value
  }

  if (value instanceof Date) return new Date(value.getTime())

  if (Array.isArray(value)) return value.map(item => deepClone(item))

  if (typeof value === 'object') {
    const cloned: Record<string, unknown> = {}
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        cloned[key] = deepClone((value as Record<string, unknown>)[key])
      }
    }
    return cloned
  }

  return value
}
