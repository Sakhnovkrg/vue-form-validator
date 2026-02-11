import type { MaybeRefOrGetter } from 'vue'

/**
 * Тип функции правила валидации
 * @template T - Тип валидируемого значения
 * @param value - Значение для валидации
 * @param values - Все значения формы для кросс-валидации полей
 * @returns Строка/массив строк с ошибками, null если валидно, или Promise с ошибками/null
 */
export interface RuleMeta {
  /** Конкретный путь поля, например 'contacts.0.email' */
  fieldPath?: string
}

export type Rule<T = any> = (
  _value: T,
  _values?: Record<string, any>,
  _meta?: RuleMeta
) => string | string[] | null | Promise<string | string[] | null>

/**
 * Базовые помощники для цепочки правил валидации (без правил массивов)
 * Используется в простых формах для лучшей производительности IDE
 */
export interface SimpleRuleChainHelpers {
  required(_msg?: MaybeRefOrGetter<string>): RuleChain<any>
  minLength(_len: number, _msg?: MaybeRefOrGetter<string>): RuleChain<string>
  maxLength(_len: number, _msg?: MaybeRefOrGetter<string>): RuleChain<string>
  email(_msg?: MaybeRefOrGetter<string>): RuleChain<string>
  regex(_pattern: RegExp, _msg?: MaybeRefOrGetter<string>): RuleChain<string>
  numeric(_msg?: MaybeRefOrGetter<string>): RuleChain<string | number>
  between(
    _min: number,
    _max: number,
    _msg?: MaybeRefOrGetter<string>
  ): RuleChain<string | number>
  oneOf(_list: any[], _msg?: MaybeRefOrGetter<string>): RuleChain<any>
  minValue(
    _min: number,
    _msg?: MaybeRefOrGetter<string>
  ): RuleChain<string | number>
  maxValue(
    _max: number,
    _msg?: MaybeRefOrGetter<string>
  ): RuleChain<string | number>
  fileRequired(_msg?: MaybeRefOrGetter<string>): RuleChain<File | File[] | null>
  fileSize(
    _maxBytes: number,
    _msg?: MaybeRefOrGetter<string>
  ): RuleChain<File | File[] | null>
  fileType(
    _accept: string | string[],
    _msg?: MaybeRefOrGetter<string>
  ): RuleChain<File | File[] | null>
  fileCount(
    _min?: number,
    _max?: number,
    _msg?: MaybeRefOrGetter<string>
  ): RuleChain<File[] | null>
  remote(
    _checkFn: (_value: any) => Promise<boolean>,
    _msg?: MaybeRefOrGetter<string>,
    _delay?: number
  ): RuleChain<any>
  custom(
    _validator: (
      _value: any,
      _values: Record<string, any>
    ) => boolean | string | Promise<boolean | string>,
    _msg?: MaybeRefOrGetter<string>
  ): RuleChain<any>
  sameAs(_fieldName: string, _msg?: MaybeRefOrGetter<string>): RuleChain<any>
  dateAfter(
    _fieldName: string,
    _msg?: MaybeRefOrGetter<string>
  ): RuleChain<string>
  requiredIf(
    _conditionField: string,
    _conditionValue: any,
    _msg?: MaybeRefOrGetter<string>
  ): RuleChain<any>
  arrayMinLength(
    _len: number,
    _msg?: MaybeRefOrGetter<string>
  ): RuleChain<any[]>
  arrayRequired(_msg?: MaybeRefOrGetter<string>): RuleChain<any[]>
  arrayMaxLength(
    _len: number,
    _msg?: MaybeRefOrGetter<string>
  ): RuleChain<any[]>
}

/**
 * Цепочка правил валидации
 * Комбинирует функцию правила с помощниками для создания цепочек
 * @template T - Тип валидируемого значения
 */
export type RuleChain<T = any> = Rule<T> &
  SimpleRuleChainHelpers & {
    /** Внутренний массив правил цепочки */
    __rules: Rule<any>[]
    /** Добавляет дополнительные правила в цепочку */
    and(..._rules: Array<Rule<any> | RuleChain<any>>): RuleChain<T>
    /** Возвращает массив всех правил цепочки */
    build(): Rule<any>[]
    /** Преобразует цепочку в массив правил */
    toArray(): Rule<any>[]
    /** Возвращает массив правил для valueOf */
    valueOf(): Rule<any>[]
  }

/**
 * Конфигурация правил валидации для поля
 * Может быть одиночным правилом, цепочкой или массивом правил
 * @template T - Тип валидируемого значения
 */
export type RuleConfig<T = any> =
  | Rule<T>
  | RuleChain<T>
  | Array<Rule<T> | RuleChain<T>>

/**
 * Метаданные кросс-валидации полей
 * Используется для отслеживания зависимостей между полями
 */
export interface CrossFieldMeta {
  /** Поля, от которых зависит данное правило */
  dependsOn: string[]
}

/**
 * Правило с метаданными кросс-валидации полей
 */
export interface CrossFieldRule<T = any> extends Rule<T> {
  __crossField: CrossFieldMeta
}

/**
 * Опции конфигурации формы
 * @template T - Тип значений формы
 */
export interface FormOptions<T extends Record<string, any>> {
  /** Начальные значения для полей формы */
  initialValues: T
  /** Колбэк при успешной отправке формы */
  onSubmit?: (_values: T) => void | Promise<void>
  /** Колбэк при очистке формы */
  onClear?: () => void
}

/**
 * Внутренняя структура кэша валидации
 * @internal
 */
export interface ValidationCache {
  /** Кэшированное значение */
  value: any
  /** Кэшированные ошибки валидации */
  errors: string[]
  /** Кэшированные значения cross-field зависимостей */
  depsValues?: Record<string, any>
}

/**
 * Конфигурация зависимостей полей для кросс-валидации
 * @internal
 */
export interface FieldDependency {
  /** Имя поля, которое имеет зависимости */
  field: string
  /** Список полей, от которых зависит данное поле */
  dependsOn: string[]
}

/**
 * Полный интерфейс состояния формы
 * @template T - Тип значений формы
 * @internal
 */
export interface FormState<T extends Record<string, any>> {
  /** Значения полей формы */
  values: T
  /** Ошибки валидации по полям */
  errors: Record<string, string[]>
  /** Состояние "тронутости" по полям */
  touched: Record<string, boolean>
  /** Состояние "изменённости" по полям */
  dirty: Record<string, boolean>
  /** Состояние валидации в процессе по полям */
  isValidating: Record<string, boolean>
  /** Глобальное состояние отправки формы */
  isSubmitting: boolean
  /** Зависимости полей для кросс-валидации */
  fieldDependencies: FieldDependency[]
}

/**
 * Информация о статусе поля
 */
export interface FieldStatus {
  /** Было ли поле затронуто пользователем */
  touched: boolean
  /** Отличается ли значение поля от изначального */
  dirty: boolean
  /** Валидируется ли поле в данный момент */
  validating: boolean
  /** Первое сообщение об ошибке или null */
  error: string | null
  /** Все сообщения об ошибках */
  errors: string[]
  /** Есть ли у поля ошибки */
  hasError: boolean
  /** Текущее значение поля */
  value: any
}

// ========== NESTED TYPES ==========

// Array indices 0-99 + catch-all ${number} для runtime-путей из arrayPath()
type ArrayIndex =
  | `${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`
  | `${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`
  | `${number}`

/**
 * Простые пути для объектов (1 уровень вложенности)
 * Примеры: 'address.street', 'profile.name'
 */
type ObjectPaths<T> = {
  [K in keyof T]: K extends string
    ? T[K] extends object
      ? T[K] extends ReadonlyArray<any>
        ? never // Массивы обрабатываются отдельно
        : T[K] extends Record<string, any>
          ? {
              [P in keyof T[K]]: P extends string ? `${K}.${P}` : never
            }[keyof T[K]]
          : never
      : never
    : never
}[keyof T]

/**
 * Пути для массивов (1-2 уровня)
 * Примеры: 'tags.0', 'contacts.0.name', 'contacts.0.email'
 */
type ArrayPaths<T> = {
  [K in keyof T]: K extends string
    ? T[K] extends ReadonlyArray<infer U>
      ? U extends object
        ? // Массив объектов: contacts.0, contacts.0.name
          | `${K}.${ArrayIndex}`
            | (U extends Record<string, any>
                ? {
                    [P in keyof U]: P extends string
                      ? `${K}.${ArrayIndex}.${P}`
                      : never
                  }[keyof U]
                : never)
        : // Массив примитивов: tags.0, tags.1
          `${K}.${ArrayIndex}`
      : never
    : never
}[keyof T]

/**
 * Все возможные пути к полям для nested форм
 *
 * Поддерживаемые паттерны (ограничены практичными случаями):
 * - Простые поля: 'name', 'email'
 * - Вложенные объекты (1 уровень): 'address.street', 'profile.name'
 * - Массивы примитивов: 'tags.0', 'tags.1'
 * - Массивы объектов: 'contacts.0', 'contacts.0.name', 'contacts.0.email'
 *
 * @template T - Тип значений формы
 */
export type NestedPaths<T> = keyof T | ObjectPaths<T> | ArrayPaths<T>

/**
 * Конфигурация правил валидации для формы
 * @template T - Тип значений формы
 */
export type FormRules<T extends Record<string, any>> = Partial<{
  [K in keyof T]:
    | Rule<NonNullable<T[K]>>
    | RuleChain<NonNullable<T[K]>>
    | Array<Rule<NonNullable<T[K]>> | RuleChain<NonNullable<T[K]>>>
}>

/**
 * Интерфейс формы с поддержкой как простых, так и вложенных полей
 */
export interface FormInstance<T extends Record<string, any>> {
  // Реактивное состояние формы
  values: import('vue').Ref<T>
  errors: import('vue').Ref<Record<string, string[]>>
  touched: import('vue').Ref<Record<string, boolean>>
  dirty: import('vue').Ref<Record<string, boolean>>
  isValidating: import('vue').Ref<Record<string, boolean>>
  isSubmitting: import('vue').Ref<boolean>
  isValid: import('vue').ComputedRef<boolean>
  isDirty: import('vue').ComputedRef<boolean>
  hasAnyErrors: import('vue').ComputedRef<boolean>
  touchedFields: import('vue').ComputedRef<string[]>
  dirtyFields: import('vue').ComputedRef<string[]>

  // Методы управления состоянием
  validateForm: () => Promise<boolean>
  submit: () => Promise<void>
  clear: (_useInitial?: boolean) => void
  reset: (_newValues?: Partial<T>) => void
  resetState: () => void
  setValues: (_values: Partial<T>) => void
  getValues: () => T
  setErrors: (_errors: Partial<Record<keyof T, string[]>>) => void
  resetErrors: () => void
  clearCache: (fieldKey?: string) => void
  dispose: () => void

  // Утилиты для массивов
  addArrayItem: <K extends keyof T>(
    _field: K,
    _item: T[K] extends ReadonlyArray<infer U> ? U : any
  ) => void
  removeArrayItem: <K extends keyof T>(_field: K, _index: number) => void
  arrayIncludes: <K extends keyof T>(
    _field: K,
    _item: T[K] extends ReadonlyArray<infer U> ? U : any
  ) => boolean
  toggleArrayItem: <K extends keyof T>(
    _field: K,
    _item: T[K] extends ReadonlyArray<infer U> ? U : any
  ) => Promise<void>

  // Файловые помощники и удобный доступ
  file: import('../utils/fileHelpers').FileHelpers<T>
  val: T

  // Методы с поддержкой как простых, так и nested путей (перегрузки)
  setRules: (_rules: FormRules<T>) => void
  validateField: {
    <K extends keyof T>(_name: K): Promise<string[]>
    <P extends NestedPaths<T>>(_path: P): Promise<string[]>
  }
  touch: {
    <K extends keyof T>(_name: K): void
    <P extends NestedPaths<T>>(_path: P): void
  }
  hasError: {
    <K extends keyof T>(_field: K): boolean
    <P extends NestedPaths<T>>(_path: P): boolean
  }
  error: {
    <K extends keyof T>(_field: K): string | null
    <P extends NestedPaths<T>>(_path: P): string | null
  }
  allErrors: {
    <K extends keyof T>(_field: K): string[]
    <P extends NestedPaths<T>>(_path: P): string[]
  }
  isTouched: {
    <K extends keyof T>(_field: K): boolean
    <P extends NestedPaths<T>>(_path: P): boolean
  }
  validating: {
    <K extends keyof T>(_field: K): boolean
    <P extends NestedPaths<T>>(_path: P): boolean
  }
  isFieldDirty: {
    <K extends keyof T>(_field: K): boolean
    <P extends NestedPaths<T>>(_path: P): boolean
  }
  getFieldStatus: <K extends keyof T>(_field: K) => FieldStatus

  // Дополнительные методы для nested форм
  arrayPath: <
    K extends keyof T,
    P extends keyof (T[K] extends Array<infer ArrayItem> ? ArrayItem : never),
  >(
    _arrayField: K,
    _index: number,
    _property: P
  ) => `${string & K}.${number}.${string & P}`
  objectPath: <
    K extends keyof T,
    P extends keyof (T[K] extends object
      ? T[K] extends any[]
        ? never
        : T[K]
      : never),
  >(
    _objectField: K,
    _property: P
  ) => `${string & K}.${string & P}`
}
