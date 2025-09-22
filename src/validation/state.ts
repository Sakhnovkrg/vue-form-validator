import { reactive, ref, computed, toRefs } from 'vue'
import type {
  FormOptions,
  FieldStatus,
  NestedPaths,
  Rule,
} from '../forms/types'

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
  private dirtyTrigger = ref(0)

  /**
   * Создает новый экземпляр FormStateManager
   * @param options - Опции конфигурации формы
   */
  constructor(options: FormOptions<T>) {
    this.options = options
    this.initialValues = reactive({ ...options.initialValues }) as T
    this.values = reactive({ ...options.initialValues }) as T
    this.errors = reactive<Record<string, string[]>>({})
    this.touched = reactive<Record<string, boolean>>({})

    // Инициализируем dirty со всеми полями
    const initialDirtyState: Record<string, boolean> = {}
    Object.keys(options.initialValues).forEach(key => {
      initialDirtyState[key] = false
    })
    this.dirty = reactive(initialDirtyState)

    this.isValidating = reactive<Record<string, boolean>>({})
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
   * @returns Глубоко клонированные значения формы
   */
  getValues(): T {
    // Безопасное клонирование через JSON для избежания проблем с Vue reactivity
    try {
      return JSON.parse(JSON.stringify(this.values)) as T
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        'Failed to clone form values, returning original object:',
        error
      )
      return this.values
    }
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
   * @param useInitial - Если true, сбрасывает к начальным значениям; иначе к пустым строкам
   */
  clear(useInitial = false) {
    Object.keys(this.values).forEach(key => {
      const k = key as keyof T
      this.values[k] = useInitial ? this.initialValues[k] : ('' as T[keyof T])
      this.errors[key] = []
      this.touched[key] = false
      this.dirty[key] = false
      this.isValidating[key] = false
    })
    this.options.onClear?.()
  }

  /**
   * Сбрасывает форму к начальным или новым значениям
   * @param newValues - Опциональные новые начальные значения
   */
  reset(newValues?: Partial<T>) {
    if (newValues) {
      Object.keys(newValues).forEach(key => {
        ;(this.initialValues as any)[key] = newValues[key as keyof T]
      })
    }

    Object.keys(this.initialValues).forEach(key => {
      const k = key as keyof T
      this.values[k] = this.initialValues[k]
      this.errors[key] = []
      this.touched[key] = false
      this.dirty[key] = false
      this.isValidating[key] = false
    })
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
   * Проверяет, является ли поле условно неактивным
   * @param fieldKey - Ключ поля для проверки
   * @returns true если поле неактивно из-за невыполненного условия requiredIf
   */
  private isConditionallyInactive(fieldKey: string): boolean {
    try {
      const fieldRules = this.rules[fieldKey]
      if (!fieldRules) {
        return false
      }

      // Проверяем, есть ли правила requiredIf
      for (const rule of fieldRules) {
        const crossField = (rule as any).__crossField
        if (crossField?.dependsOn) {
          // Это правило requiredIf - проверим условие
          try {
            // Создаем тестовые значения для проверки
            const testValues = { ...this.values }

            // Вызываем правило с пустым значением
            const result = (rule as any)('', testValues)

            // Если правило возвращает null для пустого значения,
            // значит условие не выполнено и поле неактивно
            if (result === null) {
              return true
            }

            // Обрабатываем Promise отдельно (хотя requiredIf не должно быть асинхронным)
            if (result instanceof Promise) {
              return false
            }
          } catch {
            // В случае ошибки считаем поле активным
            return false
          }
        }
      }

      return false
    } catch {
      return false
    }
  }

  /**
   * Обновляет состояние dirty для поля
   * @param fieldKey - Ключ поля
   * @param value - Текущее значение поля
   */
  markDirty(fieldKey: string, value: any) {
    this.dirty[fieldKey] = value !== this.initialValues[fieldKey as keyof T]

    // Принудительно обновляем trigger для пересчета computed
    this.dirtyTrigger.value++
  }

  /**
   * Вычисляемое свойство с флагами ошибок для оптимизации производительности
   * Автоматически обновляется при изменении errors
   */
  private get errorFlags() {
    return computed(() => {
      const flags: Record<string, boolean> = {}
      Object.keys(this.errors).forEach(key => {
        flags[key] = (this.errors[key]?.length ?? 0) > 0
      })
      return flags
    })
  }

  // Field status getters - support both direct field keys and nested paths
  hasError<K extends keyof T>(field: K): boolean
  hasError<P extends NestedPaths<T>>(path: P): boolean
  hasError(key: keyof T | NestedPaths<T>): boolean {
    return this.errorFlags.value[key as string] ?? false
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
   * Вычисляемое свойство, показывающее, валидна ли форма (нет ошибок и нет валидации в процессе)
   * @returns Вычисляемый boolean для валидности формы
   */
  get isValid() {
    return computed(() => {
      // Если хотя бы одно поле валидируется в данный момент - форма не валидна
      const hasValidating = Object.values(this.isValidating).some(
        validating => validating
      )
      if (hasValidating) {
        return false
      }

      // Проверяем ошибки только в активных полях
      return Object.keys(this.errors).every(fieldKey => {
        // Если поле условно неактивно, игнорируем его ошибки
        if (this.isConditionallyInactive(fieldKey)) {
          return true
        }

        // Для активных полей проверяем отсутствие ошибок
        const fieldErrors = this.errors[fieldKey] || []
        return fieldErrors.length === 0
      })
    })
  }

  /**
   * Вычисляемое свойство, показывающее, есть ли в форме измененные поля
   * @returns Вычисляемый boolean для состояния dirty формы
   */
  get isDirty() {
    return computed(() => {
      // Используем trigger для принудительного пересчета
      this.dirtyTrigger.value

      // Проверяем только активные поля (не условно неактивные)
      const dirtyFields = Object.keys(this.dirty).filter(key => this.dirty[key])

      // Фильтруем поля с учетом условной валидации
      const activeDirtyFields = dirtyFields.filter(fieldKey => {
        return !this.isConditionallyInactive(fieldKey)
      })

      return activeDirtyFields.length > 0
    })
  }

  /**
   * Вычисляемое свойство, показывающее, есть ли в форме ошибки
   * @returns Вычисляемый boolean для наличия ошибок
   */
  get hasAnyErrors() {
    return computed(() =>
      Object.values(this.errors).some(fieldErrors => fieldErrors.length > 0)
    )
  }

  /**
   * Вычисляемое свойство, перечисляющее все имена затронутых полей
   * @returns Вычисляемый массив имен затронутых полей
   */
  get touchedFields() {
    return computed(() =>
      Object.keys(this.touched).filter(key => this.touched[key])
    )
  }

  /**
   * Вычисляемое свойство, перечисляющее все имена измененных полей
   * @returns Вычисляемый массив имен измененных полей
   */
  get dirtyFields() {
    return computed(() =>
      Object.keys(this.dirty).filter(key => this.dirty[key])
    )
  }

  /**
   * Создает реактивный объект состояния со всеми свойствами формы
   * @returns Реактивный объект состояния формы
   * @internal
   */
  getReactiveState() {
    return reactive({
      values: this.values,
      errors: this.errors,
      touched: this.touched,
      dirty: this.dirty,
      isValidating: this.isValidating,
      isSubmitting: this.isSubmitting,
      isValid: this.isValid,
      isDirty: this.isDirty,
      hasAnyErrors: this.hasAnyErrors,
      touchedFields: this.touchedFields,
      dirtyFields: this.dirtyFields,
    })
  }

  /**
   * Создает refs из реактивного состояния для Composition API
   * @returns Объект с реактивными refs ко всем свойствам формы
   * @internal
   */
  getRefsState() {
    return toRefs(this.getReactiveState())
  }
}
