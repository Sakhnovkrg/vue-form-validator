import { watch, nextTick } from 'vue'
import type {
  Rule,
  RuleChain,
  FormOptions,
  NestedPaths,
  FormInstance,
} from './types'
import { FormStateManager } from '../validation/state'
import { ValidationManager } from '../validation/manager'
import { createFileHelpers } from '../utils/fileHelpers'

type RuleInput =
  | Rule<any>
  | RuleChain<any>
  | Array<Rule<any> | RuleChain<any>>
  | undefined

type ArrayElementType<V> =
  V extends ReadonlyArray<infer U> ? U : V extends Array<infer U> ? U : never

function isRuleChain(value: unknown): value is RuleChain<any> {
  return typeof value === 'function' && Array.isArray((value as any).__rules)
}

function collectRuleInput(
  input: RuleInput,
  bucket: Rule<any>[],
  seen: Set<Rule<any>>
): void {
  if (!input) return
  if (Array.isArray(input)) {
    input.forEach(item => collectRuleInput(item, bucket, seen))
    return
  }
  if (typeof input === 'function') {
    if (isRuleChain(input)) {
      input.__rules.forEach(rule => {
        if (!seen.has(rule)) {
          seen.add(rule)
          bucket.push(rule)
        }
      })
    } else if (!seen.has(input)) {
      seen.add(input)
      bucket.push(input)
    }
  }
}

export function normalizeFormRules<T extends Record<string, any>, R>(
  rules: R
): Partial<{ [K in keyof T]: Rule<T[K]>[] }> {
  const normalized: Partial<{ [K in keyof T]: Rule<T[K]>[] }> = {}

  if (!rules) {
    return normalized
  }

  Object.keys(rules).forEach(key => {
    const field = key as keyof T
    const bucket: Rule<any>[] = []
    collectRuleInput((rules as any)[field] as RuleInput, bucket, new Set())
    normalized[field] = bucket
  })

  return normalized
}

/**
 * Создает универсальную форму с поддержкой как простых, так и вложенных полей
 */
export function createForm<const T extends Record<string, any>>(
  options: FormOptions<T>
): FormInstance<T> {
  const stateManager = new FormStateManager<T>(options)
  const validationManager = new ValidationManager<T>(
    stateManager.values,
    stateManager.errors,
    stateManager.isValidating
  )

  /**
   * Устанавливает правила валидации для формы
   */
  function setRules<R>(rules: R) {
    const normalized = normalizeFormRules<T, R>(rules)
    validationManager.setRules(normalized)
    stateManager.setRules(normalized as any)
  }

  /**
   * Валидирует поле
   */
  async function validateField<K extends keyof T>(name: K): Promise<string[]>
  async function validateField<P extends NestedPaths<T>>(
    path: P
  ): Promise<string[]>
  async function validateField(
    key: keyof T | NestedPaths<T>
  ): Promise<string[]> {
    return validationManager.validateField(key as any)
  }

  /**
   * Валидирует все поля формы
   */
  async function validateForm(): Promise<boolean> {
    Object.keys(stateManager.values).forEach(key => {
      stateManager.touched[key] = true
    })

    return validationManager.validateForm()
  }

  /**
   * Отправляет форму после валидации
   */
  async function submit(): Promise<void> {
    if (stateManager.isSubmitting.value) return

    stateManager.isSubmitting.value = true

    try {
      const isValid = await validateForm()

      if (isValid && options.onSubmit) {
        await nextTick()
        const currentValues = stateManager.getValues()
        await options.onSubmit(currentValues)
      }
    } finally {
      stateManager.isSubmitting.value = false
    }
  }

  /**
   * Отмечает поле как затронутое и запускает валидацию
   */
  function touch<K extends keyof T>(name: K): void
  function touch<P extends NestedPaths<T>>(path: P): void
  function touch(key: keyof T | NestedPaths<T>): void {
    stateManager.touched[key as string] = true
    validateField(key as any)
  }

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
   * Добавляет элемент в поле-массив
   */
  function addArrayItem<K extends keyof T>(arrayPath: K, item: any) {
    const currentArray = stateManager.values[arrayPath]
    if (Array.isArray(currentArray)) {
      currentArray.push(item)
    } else {
      ;(stateManager.values[arrayPath] as any) = [item]
    }
    validationManager.clearArrayCache(arrayPath as string)
  }

  /**
   * Удаляет элемент из поля-массива
   */
  function removeArrayItem<K extends keyof T>(arrayPath: K, index: number) {
    const currentArray = stateManager.values[arrayPath]
    if (Array.isArray(currentArray)) {
      currentArray.splice(index, 1)
    }
    validationManager.clearArrayCache(arrayPath as string)
  }

  /**
   * Создает путь к полю массива
   */
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

  /**
   * Создает путь к полю объекта
   */
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

  const watchStopHandles: Array<() => void> = []

  Object.keys(stateManager.values).forEach(key => {
    const k = key as keyof T

    const stop = watch(
      () => stateManager.values[k],
      async (newValue, oldValue) => {
        if (typeof newValue !== 'object' && newValue === oldValue) return

        stateManager.markDirty(key, newValue)
        validationManager.clearCache(key)

        if (stateManager.touched[key]) {
          await nextTick()
          await validateField(k)
        }

        await validationManager.validateDependentFields(
          key,
          stateManager.touched
        )
      },
      { flush: 'post', deep: true }
    )
    watchStopHandles.push(stop)
  })

  const stateRefs = stateManager.getStateRefs()

  // File helpers
  const fileHelpers = createFileHelpers({
    values: stateRefs.values,
    touch: (field: any) => touch(field),
    validateField: (field: any) => validateField(field),
  })

  return {
    // Реактивные свойства состояния формы (исключаем touchedFields и dirtyFields)
    values: stateRefs.values as import('vue').Ref<T>,
    errors: stateRefs.errors,
    touched: stateRefs.touched,
    dirty: stateRefs.dirty,
    isValidating: stateRefs.isValidating,

    // Основные реактивные свойства
    isValid: stateManager.isValid,
    isDirty: stateManager.isDirty,
    hasAnyErrors: stateManager.hasAnyErrors,
    touchedFields: stateManager.touchedFields,
    dirtyFields: stateManager.dirtyFields,
    isSubmitting: stateManager.isSubmitting,

    // Методы валидации
    setRules,
    validateField,
    validateForm,
    submit,
    touch,

    // Методы управления состоянием формы
    clear: stateManager.clear.bind(stateManager),
    reset: stateManager.reset.bind(stateManager),
    resetState: stateManager.resetState.bind(stateManager),
    setValues: (newValues: Partial<T>) => {
      Object.keys(newValues).forEach(key => {
        validationManager.clearCache(key)
      })
      stateManager.setValues(newValues)
    },
    getValues: stateManager.getValues.bind(stateManager),
    setErrors: stateManager.setErrors.bind(stateManager),
    resetErrors: stateManager.resetErrors.bind(stateManager),

    // Методы запроса статуса полей
    hasError: stateManager.hasError.bind(stateManager),
    error: stateManager.error.bind(stateManager),
    allErrors: stateManager.allErrors.bind(stateManager),
    isTouched: stateManager.isTouched.bind(stateManager),
    validating: stateManager.validating.bind(stateManager),
    isFieldDirty: stateManager.isFieldDirty.bind(stateManager),
    getFieldStatus: stateManager.getFieldStatus.bind(stateManager),

    // Утилиты для файлов
    file: fileHelpers as import('../utils/fileHelpers').FileHelpers<T>,

    // Direct access to form values without .value.value
    get val(): T {
      return stateManager.values as T
    },

    // Утилиты для массивов
    arrayIncludes,
    addArrayItem,
    removeArrayItem,
    toggleArrayItem: async <K extends keyof T>(
      field: K,
      item: ArrayElementType<T[K]>
    ) => {
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
    },

    // Методы для работы с nested путями
    arrayPath,
    objectPath,

    // Внутренние методы для продвинутого использования
    clearCache: validationManager.clearCache.bind(validationManager),

    // Очистка ресурсов (watchers, abort controllers)
    dispose: () => {
      watchStopHandles.forEach(stop => stop())
      watchStopHandles.length = 0
      validationManager.dispose()
    },
  }
}
