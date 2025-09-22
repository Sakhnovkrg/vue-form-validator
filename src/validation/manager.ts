import { reactive, ref, nextTick } from 'vue'
import type { Rule, ValidationCache, FieldDependency } from '../forms/types'
import { expandWildcardPaths, getNestedValue } from '../utils/helpers'

/**
 * Управляет логикой валидации формы, включая кэширование и кросс-полевые зависимости
 * @template T - Тип значений формы
 */
export class ValidationManager<T extends Record<string, any>> {
  private validationCache = reactive<Record<string, ValidationCache>>({})
  private fieldDependencies = ref<FieldDependency[]>([])
  private rules = ref<Partial<{ [K in keyof T]: Rule<T[K]>[] }>>({})
  private values: T
  private errors: Record<string, string[]>
  private isValidating: Record<string, boolean>
  private abortControllers = new Map<string, AbortController>()

  /**
   * Создает новый экземпляр ValidationManager
   * @param values - Реактивные значения формы
   * @param errors - Реактивный объект ошибок
   * @param isValidating - Реактивный объект состояния валидации
   */
  constructor(
    values: T,
    errors: Record<string, string[]>,
    isValidating: Record<string, boolean>
  ) {
    this.values = values
    this.errors = errors
    this.isValidating = isValidating
  }

  /**
   * Преобразует результат валидации (string или null) в строку
   * @param result - Результат валидации
   * @returns Преобразованное сообщение об ошибке или null
   */
  private resolveValidationResult(
    result: string | null | undefined
  ): string | null {
    if (!result) return null

    if (typeof result === 'string') {
      return result
    }

    return null
  }

  /**
   * Устанавливает правила валидации и строит зависимости полей
   * @param r - Правила валидации формы
   */
  setRules(r: Partial<{ [K in keyof T]: Rule<T[K]>[] }>) {
    this.rules.value = { ...r }
    this.buildDependencies()
  }

  /**
   * Строит зависимости полей из кросс-полевых правил валидации
   * @private
   */
  private buildDependencies() {
    const dependencies: FieldDependency[] = []
    const rulesEntries = Object.entries(this.rules.value)

    for (const [fieldName, fieldRules] of rulesEntries) {
      if (!fieldRules || !Array.isArray(fieldRules)) continue

      const dependsOn: string[] = []

      for (const rule of fieldRules) {
        const meta = (rule as any).__crossField
        if (meta?.dependsOn && Array.isArray(meta.dependsOn)) {
          dependsOn.push(...meta.dependsOn)
        }
      }

      if (dependsOn.length > 0) {
        dependencies.push({
          field: fieldName,
          dependsOn: [...new Set(dependsOn)],
        })
      }
    }

    this.fieldDependencies.value = dependencies
  }

  /**
   * Получает поля, которые зависят от измененного поля
   * @param changedField - Поле, которое изменилось
   * @returns Массив имен зависимых полей
   */
  getDependentFields(changedField: string): string[] {
    return this.fieldDependencies.value
      .filter(dep => dep.dependsOn.includes(changedField))
      .map(dep => dep.field)
  }

  /**
   * Валидирует одно поле с кэшированием (поддерживает вложенные пути)
   * @param name - Имя поля или путь для валидации
   * @returns Promise, разрешающийся в массив сообщений об ошибках
   */
  async validateField<K extends keyof T>(name: K): Promise<string[]> {
    const fieldKey = name as string

    // Отменить предыдущую валидацию для этого поля
    const existingController = this.abortControllers.get(fieldKey)
    if (existingController) {
      existingController.abort()
    }

    // Создать новый контроллер отмены для этой валидации
    const abortController = new AbortController()
    this.abortControllers.set(fieldKey, abortController)

    // Обработка вложенных путей типа 'contacts.0.email'
    const expandedRules = expandWildcardPaths(
      this.rules.value as any,
      this.values
    )
    const fieldRules = (expandedRules[fieldKey] ??
      this.rules.value[name] ??
      []) as Rule<any>[]

    const currentValue = fieldKey.includes('.')
      ? getNestedValue(this.values, fieldKey)
      : this.values[name]

    if (!fieldRules.length) {
      this.errors[fieldKey] = []
      this.abortControllers.delete(fieldKey)
      return []
    }

    const cached = this.validationCache[fieldKey]
    if (cached && cached?.value === currentValue) {
      this.errors[fieldKey] = [...cached.errors]
      this.abortControllers.delete(fieldKey)
      return cached.errors
    }

    let validatingAsync = false
    const fieldErrors: string[] = []

    try {
      // Проверить, была ли отменена валидация
      if (abortController.signal.aborted) {
        return []
      }
      for (const rule of fieldRules) {
        const maybePromise = (rule as any)(currentValue, this.values)

        if (maybePromise && typeof maybePromise.then === 'function') {
          if (!validatingAsync) {
            this.errors[fieldKey] = []
            this.isValidating[fieldKey] = true
            validatingAsync = true
          }
          const result = await maybePromise
          // Проверить, была ли отменена валидация во время асинхронной операции
          if (abortController.signal.aborted) {
            return []
          }
          const resolvedResult = this.resolveValidationResult(result)
          if (resolvedResult) {
            fieldErrors.push(resolvedResult)
            break
          }
        } else {
          const result = maybePromise as string | null | undefined
          const resolvedResult = this.resolveValidationResult(result)
          if (resolvedResult) {
            fieldErrors.push(resolvedResult)
            break
          }
        }
      }

      this.validationCache[fieldKey] = {
        value: currentValue,
        errors: fieldErrors,
      }
      this.errors[fieldKey] = fieldErrors
      return fieldErrors
    } finally {
      if (validatingAsync) this.isValidating[fieldKey] = false
      this.abortControllers.delete(fieldKey)
    }
  }

  /**
   * Валидирует все поля формы параллельно (включая расширенные поля массивов)
   * @returns Promise, разрешающийся в true, если форма валидна
   */
  async validateForm(): Promise<boolean> {
    // Получить расширенные правила, включающие поля массивов типа 'contacts.0.email'
    const expandedRules = expandWildcardPaths(
      this.rules.value as any,
      this.values
    )
    const allFields = Object.keys(expandedRules)

    await Promise.all(allFields.map(field => this.validateField(field as any)))
    return Object.values(this.errors).every(
      fieldErrors => fieldErrors.length === 0
    )
  }

  /**
   * Валидирует поля, которые зависят от измененного поля
   * @param changedField - Поле, которое изменилось
   * @param touched - Объект, отслеживающий состояние затронутости полей
   */
  async validateDependentFields(
    changedField: string,
    touched: Record<string, boolean>
  ) {
    const dependentFields = this.getDependentFields(changedField)

    for (const dependentField of dependentFields) {
      if (touched[dependentField]) {
        delete this.validationCache[dependentField]
        await nextTick()
        await this.validateField(dependentField as keyof T)
      }
    }
  }

  /**
   * Очищает кэш валидации для поля или всех полей
   * @param fieldKey - Опциональный ключ поля, очищает все, если не указан
   */
  clearCache(fieldKey?: string) {
    if (fieldKey) {
      delete this.validationCache[fieldKey]
    } else {
      Object.keys(this.validationCache).forEach(key => {
        delete this.validationCache[key]
      })
    }
  }

  /**
   * Очищает кэш валидации для всех вложенных полей в массиве
   * @param arrayPath - Путь к полю-массиву, например 'contacts'
   */
  clearArrayCache(arrayPath: string) {
    // Очистить кэш для всех полей, начинающихся с arrayPath
    const keysToDelete = Object.keys(this.validationCache).filter(key =>
      key.startsWith(arrayPath + '.')
    )
    keysToDelete.forEach(key => {
      delete this.validationCache[key]
      delete this.errors[key]
    })

    // Также отменить любые выполняющиеся валидации для этих полей
    keysToDelete.forEach(key => {
      const controller = this.abortControllers.get(key)
      if (controller) {
        controller.abort()
        this.abortControllers.delete(key)
      }
    })
  }
}
