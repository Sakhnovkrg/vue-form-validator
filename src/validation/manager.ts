import { nextTick } from 'vue'
import type { Rule, ValidationCache, FieldDependency } from '../forms/types'
import {
  expandWildcardPaths,
  getNestedValue,
  resolveWildcard,
} from '../utils/nested'
import { deepEqual, deepClone } from '../utils/deep'

/**
 * Управляет логикой валидации формы, включая кэширование и кросс-полевые зависимости
 * @template T - Тип значений формы
 */
export class ValidationManager<T extends Record<string, any>> {
  private validationCache: Record<string, ValidationCache> = {}
  private fieldDependencies: FieldDependency[] = []
  private rules: Partial<{ [K in keyof T]: Rule<T[K]>[] }> = {}
  private values: T
  private errors: Record<string, string[]>
  private isValidating: Record<string, boolean>
  private abortControllers = new Map<string, AbortController>()
  private expandedRulesCache: Record<string, Rule<any>[]> | null = null
  private hasWildcardRules = false

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
    result: string | string[] | null | undefined
  ): string[] {
    if (!result) return []

    if (typeof result === 'string') {
      return [result]
    }

    if (Array.isArray(result)) {
      return result.filter(r => typeof r === 'string' && r.length > 0)
    }

    return []
  }

  /**
   * Получает расширенные правила с кэшированием
   */
  private getExpandedRules(): Record<string, Rule<any>[]> {
    if (!this.expandedRulesCache) {
      this.expandedRulesCache = expandWildcardPaths(
        this.rules as any,
        this.values
      )
    }
    return this.expandedRulesCache
  }

  /**
   * Инвалидирует кэш расширенных правил
   */
  private invalidateExpandedRulesCache() {
    this.expandedRulesCache = null
  }

  /**
   * Проверяет, матчится ли wildcard-паттерн ('contacts.*.email') к конкретному пути ('contacts.0.email')
   */
  private matchesWildcard(pattern: string, concrete: string): boolean {
    const re = new RegExp(
      '^' +
        pattern
          .split('.')
          .map(p => (p === '*' ? '\\d+' : p))
          .join('\\.') +
        '$'
    )
    return re.test(concrete)
  }

  /**
   * Устанавливает правила валидации и строит зависимости полей
   * @param r - Правила валидации формы
   */
  setRules(r: Partial<{ [K in keyof T]: Rule<T[K]>[] }>) {
    this.rules = { ...r }
    this.hasWildcardRules = Object.keys(this.rules).some(k => k.includes('*'))
    this.invalidateExpandedRulesCache()
    this.buildDependencies()
    this.clearStaleErrors()
  }

  /**
   * Удаляет ошибки для полей, у которых больше нет правил валидации
   */
  private clearStaleErrors() {
    const expandedRules = this.getExpandedRules()
    const activeFields = new Set([
      ...Object.keys(this.rules),
      ...Object.keys(expandedRules),
    ])

    for (const key of Object.keys(this.errors)) {
      if (!activeFields.has(key)) {
        delete this.errors[key]
      }
    }
  }

  /**
   * Строит зависимости полей из кросс-полевых правил валидации
   * @private
   */
  private buildDependencies() {
    const dependencies: FieldDependency[] = []
    const rulesEntries = Object.entries(this.rules)

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

    this.fieldDependencies = dependencies
  }

  /**
   * Получает поля, которые зависят от измененного поля
   * @param changedField - Поле, которое изменилось
   * @returns Массив имен зависимых полей
   */
  getDependentFields(changedField: string): string[] {
    const fields: string[] = []
    for (const dep of this.fieldDependencies) {
      const matches = dep.dependsOn.some(d => {
        if (d === changedField) return true
        if (d.includes('*')) return this.matchesWildcard(d, changedField)
        return false
      })
      if (!matches) continue

      if (dep.field.includes('*')) {
        const expanded = this.getExpandedRules()
        for (const key of Object.keys(expanded)) {
          if (this.matchesWildcard(dep.field, key)) {
            fields.push(key)
          }
        }
      } else {
        fields.push(dep.field)
      }
    }
    return fields
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
    // Пропускаем expansion если нет wildcard-правил (оптимизация для простых форм)
    let fieldRules: Rule<any>[]
    if (this.hasWildcardRules) {
      const expandedRules = this.getExpandedRules()
      fieldRules = (expandedRules[fieldKey] ??
        this.rules[name] ??
        []) as Rule<any>[]
    } else {
      fieldRules = (this.rules[name] ?? []) as Rule<any>[]
    }

    const currentValue = fieldKey.includes('.')
      ? getNestedValue(this.values, fieldKey)
      : this.values[name]

    if (!fieldRules.length) {
      this.errors[fieldKey] = []
      if (this.abortControllers.get(fieldKey) === abortController) {
        this.abortControllers.delete(fieldKey)
      }
      return []
    }

    // Собираем текущие значения cross-field зависимостей для кэша
    // Ищем по точному совпадению, затем по wildcard-паттерну
    let dep = this.fieldDependencies.find(d => d.field === fieldKey)
    if (!dep && fieldKey.includes('.')) {
      dep = this.fieldDependencies.find(
        d => d.field.includes('*') && this.matchesWildcard(d.field, fieldKey)
      )
    }
    const depsValues: Record<string, any> = {}
    if (dep) {
      for (const depField of dep.dependsOn) {
        const resolved = depField.includes('*')
          ? resolveWildcard(depField, fieldKey)
          : depField
        depsValues[resolved] = resolved.includes('.')
          ? getNestedValue(this.values, resolved)
          : this.values[resolved as keyof T]
      }
    }

    const cached = this.validationCache[fieldKey]
    if (
      cached &&
      deepEqual(cached.value, currentValue) &&
      deepEqual(cached.depsValues ?? {}, depsValues)
    ) {
      this.errors[fieldKey] = [...cached.errors]
      if (this.abortControllers.get(fieldKey) === abortController) {
        this.abortControllers.delete(fieldKey)
      }
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
        try {
          const maybePromise = (rule as any)(currentValue, this.values, {
            fieldPath: fieldKey,
          })

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
            const resolvedErrors = this.resolveValidationResult(result)
            if (resolvedErrors.length > 0) {
              fieldErrors.push(...resolvedErrors)
              break
            }
          } else {
            const resolvedErrors = this.resolveValidationResult(maybePromise)
            if (resolvedErrors.length > 0) {
              fieldErrors.push(...resolvedErrors)
              break
            }
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Validation error'
          fieldErrors.push(message)
          break
        }
      }

      this.validationCache[fieldKey] = {
        value: deepClone(currentValue),
        errors: fieldErrors,
        depsValues: dep
          ? (deepClone(depsValues) as Record<string, any>)
          : undefined,
      }
      this.errors[fieldKey] = fieldErrors
      return fieldErrors
    } finally {
      // Только если в Map всё ещё наш controller — значит нас не заменила новая валидация
      if (this.abortControllers.get(fieldKey) === abortController) {
        // Всегда сбрасываем isValidating: даже если текущая валидация была синхронной,
        // предыдущая (aborted) могла оставить isValidating = true
        this.isValidating[fieldKey] = false
        this.abortControllers.delete(fieldKey)
      }
    }
  }

  /**
   * Валидирует все поля формы параллельно (включая расширенные поля массивов)
   * @returns Promise, разрешающийся в true, если форма валидна
   */
  async validateForm(touched?: Record<string, boolean>): Promise<boolean> {
    // Получить расширенные правила, включающие поля массивов типа 'contacts.0.email'
    this.invalidateExpandedRulesCache()
    const allFields = Object.keys(this.getExpandedRules())

    // Пометить все поля (включая nested) как touched для авто-ревалидации при изменении
    if (touched) {
      for (const field of allFields) {
        touched[field] = true
      }
    }

    await Promise.all(allFields.map(field => this.validateField(field as any)))

    // Очистить stale nested-ошибки, оставшиеся от удалённых элементов массива
    const activeFields = new Set([...Object.keys(this.rules), ...allFields])
    for (const key of Object.keys(this.errors)) {
      if (key.includes('.') && !activeFields.has(key)) {
        delete this.errors[key]
      }
    }

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

    const touchedDependents = dependentFields.filter(f => touched[f])
    if (touchedDependents.length === 0) return

    for (const f of touchedDependents) {
      delete this.validationCache[f]
    }
    await nextTick()
    await Promise.all(
      touchedDependents.map(f => this.validateField(f as keyof T))
    )
  }

  /**
   * Очищает кэш валидации только для конкретного поля (без вложенных)
   * Используется в watcher-е: вложенные поля проверяются по deepEqual в validateField
   * @param fieldKey - Ключ поля
   */
  clearCacheExact(fieldKey: string) {
    delete this.validationCache[fieldKey]
  }

  /**
   * Очищает кэш валидации для поля или всех полей
   * @param fieldKey - Опциональный ключ поля, очищает все, если не указан
   */
  clearCache(fieldKey?: string) {
    if (fieldKey) {
      delete this.validationCache[fieldKey]
      // Также очищаем кэш для вложенных путей (e.g. 'contacts' → 'contacts.0.email')
      const prefix = fieldKey + '.'
      for (const key of Object.keys(this.validationCache)) {
        if (key.startsWith(prefix)) {
          delete this.validationCache[key]
        }
      }
    } else {
      this.validationCache = {}
    }
  }

  /**
   * Отменяет все выполняющиеся валидации
   */
  abortAll() {
    this.abortControllers.forEach(controller => controller.abort())
    this.abortControllers.clear()
  }

  /**
   * Отменяет все выполняющиеся валидации и очищает ресурсы
   */
  dispose() {
    this.abortAll()
    this.clearCache()
  }

  /**
   * Очищает кэш валидации для всех вложенных полей в массиве
   * @param arrayPath - Путь к полю-массиву, например 'contacts'
   */
  clearArrayCache(arrayPath: string) {
    this.invalidateExpandedRulesCache()
    // Очистить кэш самого поля-массива (e.g. arrayMinLength cache)
    delete this.validationCache[arrayPath]
    // Очистить кэш для всех вложенных полей (e.g. 'contacts.0.email')
    const keysToDelete = Object.keys(this.validationCache).filter(key =>
      key.startsWith(arrayPath + '.')
    )
    keysToDelete.forEach(key => {
      delete this.validationCache[key]
      delete this.errors[key]
      delete this.isValidating[key]
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
