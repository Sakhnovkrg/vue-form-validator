import type { FormStateManager } from '../validation/state'
import type { ValidationManager } from '../validation/manager'

type ArrayElementType<V> =
  V extends ReadonlyArray<infer U> ? U : V extends Array<infer U> ? U : never

export function useArrayHelpers<T extends Record<string, any>>(
  stateManager: FormStateManager<T>,
  validationManager: ValidationManager<T>,
  validateField: (_key: any) => Promise<string[]>
) {
  function arrayIncludes<K extends keyof T>(
    field: K,
    item: ArrayElementType<T[K]>
  ): boolean {
    const arr = stateManager.values[field]
    if (!Array.isArray(arr)) return false
    return (arr as Array<ArrayElementType<T[K]>>).some(element =>
      Object.is(element, item)
    )
  }

  function addArrayItem<K extends keyof T>(arrayPath: K, item: any) {
    const currentArray = stateManager.values[arrayPath]
    if (Array.isArray(currentArray)) {
      currentArray.push(item)
    } else {
      ;(stateManager.values[arrayPath] as any) = [item]
    }
    validationManager.clearArrayCache(arrayPath as string)
  }

  function removeArrayItem<K extends keyof T>(arrayPath: K, index: number) {
    const currentArray = stateManager.values[arrayPath]
    if (Array.isArray(currentArray)) {
      currentArray.splice(index, 1)
    }
    validationManager.clearArrayCache(arrayPath as string)
  }

  async function toggleArrayItem<K extends keyof T>(
    field: K,
    item: ArrayElementType<T[K]>
  ) {
    const currentArray = stateManager.values[field]
    if (!Array.isArray(currentArray)) return

    const index = (currentArray as Array<ArrayElementType<T[K]>>).findIndex(
      element => Object.is(element, item)
    )

    if (index >= 0) {
      removeArrayItem(field, index)
    } else {
      addArrayItem(field, item)
    }

    stateManager.touched[field as string] = true
    validationManager.clearCache(field as string)
    await validateField(field as any)
  }

  function arrayPath<
    K extends keyof T,
    P extends keyof (T[K] extends Array<infer ArrayItem> ? ArrayItem : never),
  >(
    arrayField: K,
    index: number,
    property: P
  ): `${string & K}.${number}.${string & P}` {
    return `${String(arrayField)}.${index}.${String(property)}` as any
  }

  function objectPath<
    K extends keyof T,
    P extends keyof (T[K] extends object
      ? T[K] extends any[]
        ? never
        : T[K]
      : never),
  >(objectField: K, property: P): `${string & K}.${string & P}` {
    return `${String(objectField)}.${String(property)}` as any
  }

  return {
    arrayIncludes,
    addArrayItem,
    removeArrayItem,
    toggleArrayItem,
    arrayPath,
    objectPath,
  }
}
