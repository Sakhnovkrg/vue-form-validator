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

  /**
   * Очищает stale touched/dirty/isValidating записи для вложенных путей массива
   */
  function clearArrayNestedState(field: string) {
    const prefix = field + '.'
    for (const key of Object.keys(stateManager.touched)) {
      if (key.startsWith(prefix)) delete stateManager.touched[key]
    }
    for (const key of Object.keys(stateManager.dirty)) {
      if (key.startsWith(prefix)) delete stateManager.dirty[key]
    }
    for (const key of Object.keys(stateManager.isValidating)) {
      if (key.startsWith(prefix)) delete stateManager.isValidating[key]
    }
  }

  function addArrayItem<K extends keyof T>(arrayPath: K, item: any) {
    const currentArray = stateManager.values[arrayPath]
    if (Array.isArray(currentArray)) {
      currentArray.push(item)
    } else {
      ;(stateManager.values[arrayPath] as any) = [item]
    }
    validationManager.clearArrayCache(arrayPath as string)
    clearArrayNestedState(arrayPath as string)
    // Ревалидируем массивное поле (e.g. arrayMinLength) если оно touched
    if (stateManager.touched[arrayPath as string]) {
      void validateField(arrayPath as any)
    }
  }

  function removeArrayItem<K extends keyof T>(arrayPath: K, index: number) {
    const currentArray = stateManager.values[arrayPath]
    if (Array.isArray(currentArray)) {
      currentArray.splice(index, 1)
    }
    validationManager.clearArrayCache(arrayPath as string)
    clearArrayNestedState(arrayPath as string)
    // Ревалидируем массивное поле (e.g. arrayMinLength) если оно touched
    if (stateManager.touched[arrayPath as string]) {
      void validateField(arrayPath as any)
    }
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

    // Мутируем массив напрямую, без вызова add/removeArrayItem,
    // чтобы избежать тройной валидации (add/remove + watcher + явный вызов ниже)
    if (index >= 0) {
      currentArray.splice(index, 1)
    } else {
      currentArray.push(item)
    }
    validationManager.clearArrayCache(field as string)
    clearArrayNestedState(field as string)

    stateManager.touched[field as string] = true
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
