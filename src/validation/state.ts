import { reactive, ref, computed, toRef, type ComputedRef, type Ref } from 'vue'
import type {
  FormOptions,
  FieldStatus,
  NestedPaths,
  Rule,
} from '../forms/types'
import { deepClone, deepEqual } from '../utils/deep'
import { getNestedValue } from '../utils/nested'

/**
 * Управляет состоянием формы, включая значения, ошибки, состояния touched и dirty
 * @template T - Тип значений формы
 */
export class FormStateManager<T extends Record<string, any>> {
  private initialValues: T
  public values: T
  public errors: Record<string, string[]>
  public touched: Record<string, boolean>
  public dirty: Record<string, boolean>
  public isValidating: Record<string, boolean>
  public isSubmitting = ref(false)
  private options: FormOptions<T>
  private rules: Record<string, Rule<any>[]> = {}

  // Computed-свойства создаются один раз в конструкторе
  private readonly _errorFlags: ComputedRef<Record<string, boolean>>
  readonly isValid: ComputedRef<boolean>
  readonly isDirty: ComputedRef<boolean>
  readonly hasAnyErrors: ComputedRef<boolean>
  readonly touchedFields: ComputedRef<string[]>
  readonly dirtyFields: ComputedRef<string[]>

  /**
   * Создает новый экземпляр FormStateManager
   * @param options - Опции конфигурации формы
   */
  constructor(options: FormOptions<T>) {
    this.options = options
    this.initialValues = deepClone(options.initialValues) as T
    this.values = reactive(deepClone(options.initialValues) as T) as T
    this.errors = reactive<Record<string, string[]>>({})
    this.touched = reactive<Record<string, boolean>>({})

    // Инициализируем dirty со всеми полями
    const initialDirtyState: Record<string, boolean> = {}
    Object.keys(options.initialValues).forEach(key => {
      initialDirtyState[key] = false
    })
    this.dirty = reactive(initialDirtyState)

    this.isValidating = reactive<Record<string, boolean>>({})

    // Инициализируем computed-свойства один раз
    this._errorFlags = computed(() => {
      const flags: Record<string, boolean> = {}
      Object.keys(this.errors).forEach(key => {
        flags[key] = (this.errors[key]?.length ?? 0) > 0
      })
      return flags
    })

    this.isValid = computed(() => {
      const hasValidating = Object.values(this.isValidating).some(v => v)
      if (hasValidating) return false

      return Object.keys(this.errors).every(fieldKey => {
        if (this.isConditionallyInactive(fieldKey)) return true
        const fieldErrors = this.errors[fieldKey] || []
        return fieldErrors.length === 0
      })
    })

    this.isDirty = computed(() => {
      const dirtyKeys = Object.keys(this.dirty).filter(key => this.dirty[key])
      return dirtyKeys.some(key => !this.isConditionallyInactive(key))
    })

    this.hasAnyErrors = computed(() =>
      Object.keys(this.errors).some(fieldKey => {
        if (this.isConditionallyInactive(fieldKey)) return false
        return (this.errors[fieldKey]?.length ?? 0) > 0
      })
    )

    this.touchedFields = computed(() =>
      Object.keys(this.touched).filter(key => this.touched[key])
    )

    this.dirtyFields = computed(() =>
      Object.keys(this.dirty).filter(key => this.dirty[key])
    )
  }

  /**
   * Обновляет значения формы
   * @param newValues - Частичные значения формы для обновления
   */
  setValues(newValues: Partial<T>) {
    Object.assign(this.values, newValues)
  }

  /**
   * Получает глубокую копию текущих значений формы
   * Корректно обрабатывает File, Date и другие специальные объекты
   * @returns Глубоко клонированные значения формы
   */
  getValues(): T {
    return deepClone(this.values) as T
  }

  /**
   * Устанавливает ошибки для конкретных полей и отмечает их как затронутые
   * @param newErrors - Ошибки для установки по имени поля
   */
  setErrors(newErrors: Partial<Record<keyof T, string[]>>) {
    Object.entries(newErrors).forEach(([key, errorList]) => {
      if (errorList && errorList.length > 0) {
        this.errors[key] = [...errorList]
        this.touched[key] = true
      }
    })
  }

  /**
   * Сбрасывает все ошибки и состояния touched
   */
  resetErrors() {
    Object.keys(this.errors).forEach(key => {
      this.errors[key] = []
      this.touched[key] = false
    })
  }

  /**
   * Очищает значения формы и сбрасывает все состояния
   * @param useInitial - Если true, сбрасывает к начальным значениям; иначе к пустым значениям по типу
   */
  clear(useInitial = false) {
    Object.keys(this.values).forEach(key => {
      const k = key as keyof T
      this.values[k] = useInitial
        ? (deepClone(this.initialValues[k]) as T[keyof T])
        : this.getEmptyValue(this.initialValues[k])
      this.errors[key] = []
      this.touched[key] = false
      this.dirty[key] = false
      this.isValidating[key] = false
    })
    this.clearNestedState()
    this.options.onClear?.()
  }

  /**
   * Возвращает пустое значение соответствующее типу исходного значения
   * @param initialValue - Начальное значение для определения типа
   * @returns Пустое значение соответствующего типа
   */
  private getEmptyValue(initialValue: unknown): any {
    if (initialValue === null || initialValue === undefined) {
      return null
    }

    if (typeof initialValue === 'string') {
      return ''
    }

    if (typeof initialValue === 'number') {
      return 0
    }

    if (typeof initialValue === 'boolean') {
      return false
    }

    if (Array.isArray(initialValue)) {
      return []
    }

    // File, Date, и другие объекты — null
    return null
  }

  /**
   * Сбрасывает форму к начальным или новым значениям
   * @param newValues - Опциональные новые начальные значения
   */
  reset(newValues?: Partial<T>) {
    if (newValues) {
      Object.keys(newValues).forEach(key => {
        ;(this.initialValues as any)[key] = deepClone(newValues[key as keyof T])
      })
    }

    Object.keys(this.initialValues).forEach(key => {
      const k = key as keyof T
      this.values[k] = deepClone(this.initialValues[k]) as T[keyof T]
      this.errors[key] = []
      this.touched[key] = false
      this.dirty[key] = false
      this.isValidating[key] = false
    })
    this.clearNestedState()
  }

  /**
   * Сбрасывает состояния валидации формы без изменения значений
   */
  resetState() {
    Object.keys(this.values).forEach(key => {
      this.errors[key] = []
      this.touched[key] = false
      this.dirty[key] = false
      this.isValidating[key] = false
    })
    this.clearNestedState()
  }

  /**
   * Отмечает поле как затронутое
   * @param name - Имя поля для отметки как затронутое
   */
  touch<K extends keyof T>(name: K) {
    this.touched[name as string] = true
  }

  /**
   * Устанавливает правила валидации для state manager
   * @param rules - Правила валидации
   */
  setRules(rules: Record<string, Rule<any>[]>) {
    this.rules = rules
  }

  /**
   * Удаляет записи для вложенных путей (e.g. 'contacts.0.email') из errors/touched/dirty/isValidating
   */
  private clearNestedState() {
    for (const key of Object.keys(this.errors)) {
      if (key.includes('.')) delete this.errors[key]
    }
    for (const key of Object.keys(this.touched)) {
      if (key.includes('.')) delete this.touched[key]
    }
    for (const key of Object.keys(this.dirty)) {
      if (key.includes('.')) delete this.dirty[key]
    }
    for (const key of Object.keys(this.isValidating)) {
      if (key.includes('.')) delete this.isValidating[key]
    }
  }

  /**
   * Проверяет, является ли поле условно неактивным
   * Использует метаданные __requiredIf вместо вызова правил
   * @param fieldKey - Ключ поля для проверки
   * @returns true если поле неактивно из-за невыполненного условия requiredIf
   */
  private isConditionallyInactive(fieldKey: string): boolean {
    const fieldRules = this.rules[fieldKey]
    if (!fieldRules) return false

    // Собираем все requiredIf правила
    const requiredIfMetas: Array<{
      conditionField: string
      conditionValue: any
    }> = []
    for (const rule of fieldRules) {
      const meta = (rule as any).__requiredIf
      if (meta) {
        requiredIfMetas.push(meta)
      }
    }

    // Поле неактивно только если есть requiredIf правила И ни одно условие не выполнено
    if (requiredIfMetas.length === 0) return false
    return requiredIfMetas.every(meta => {
      const conditionValue = getNestedValue(this.values, meta.conditionField)
      return conditionValue !== meta.conditionValue
    })
  }

  /**
   * Обновляет состояние dirty для поля
   * @param fieldKey - Ключ поля
   * @param value - Текущее значение поля
   */
  markDirty(fieldKey: string, value: any) {
    const initialValue = this.initialValues[fieldKey as keyof T]
    this.dirty[fieldKey] = !deepEqual(value, initialValue)
  }

  // Field status getters - support both direct field keys and nested paths
  hasError<K extends keyof T>(field: K): boolean
  hasError<P extends NestedPaths<T>>(path: P): boolean
  hasError(key: keyof T | NestedPaths<T>): boolean {
    return this._errorFlags.value[key as string] ?? false
  }

  error<K extends keyof T>(field: K): string | null
  error<P extends NestedPaths<T>>(path: P): string | null
  error(key: keyof T | NestedPaths<T>): string | null {
    return this.errors[key as string]?.[0] ?? null
  }

  allErrors<K extends keyof T>(field: K): string[]
  allErrors<P extends NestedPaths<T>>(path: P): string[]
  allErrors(key: keyof T | NestedPaths<T>): string[] {
    return this.errors[key as string] ?? []
  }

  validating<K extends keyof T>(field: K): boolean
  validating<P extends NestedPaths<T>>(path: P): boolean
  validating(key: keyof T | NestedPaths<T>): boolean {
    return this.isValidating[key as string] ?? false
  }

  isTouched<K extends keyof T>(field: K): boolean
  isTouched<P extends NestedPaths<T>>(path: P): boolean
  isTouched(key: keyof T | NestedPaths<T>): boolean {
    return this.touched[key as string] ?? false
  }

  isFieldDirty<K extends keyof T>(field: K): boolean
  isFieldDirty<P extends NestedPaths<T>>(path: P): boolean
  isFieldDirty(key: keyof T | NestedPaths<T>): boolean {
    return this.dirty[key as string] ?? false
  }

  /**
   * Получает полную информацию о статусе поля
   * @param name - Имя поля
   * @returns Объект статуса поля
   */
  getFieldStatus<K extends keyof T>(name: K): FieldStatus {
    return {
      touched: this.isTouched(name),
      dirty: this.isFieldDirty(name),
      validating: this.validating(name),
      error: this.error(name),
      errors: this.allErrors(name),
      hasError: this.hasError(name),
      value: this.values[name],
    } as const
  }

  /**
   * Создает refs к реактивному состоянию для Composition API
   * @returns Объект с реактивными refs ко всем свойствам формы
   * @internal
   */
  getStateRefs() {
    return {
      values: toRef(() => this.values) as Ref<T>,
      errors: toRef(() => this.errors) as Ref<Record<string, string[]>>,
      touched: toRef(() => this.touched) as Ref<Record<string, boolean>>,
      dirty: toRef(() => this.dirty) as Ref<Record<string, boolean>>,
      isValidating: toRef(() => this.isValidating) as Ref<
        Record<string, boolean>
      >,
    }
  }
}
