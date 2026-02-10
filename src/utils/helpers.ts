import { unref, type MaybeRefOrGetter } from 'vue'
import type { Rule } from '../forms/types'

/**
 * Получает значение по вложенному пути объекта типа 'contacts.0.email'
 */
export function getNestedValue(obj: any, path: string): any {
  if (!path || !obj) return undefined
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

/**
 * Устанавливает значение по вложенному пути объекта типа 'contacts.0.email'
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  if (!path || !obj) return

  const keys = path.split('.')
  const lastKey = keys.pop()!

  const target = keys.reduce((current, key, index) => {
    if (!(key in current)) {
      const nextKey = keys[index + 1]
      current[key] = nextKey && /^\d+$/.test(nextKey) ? [] : {}
    }
    return current[key]
  }, obj)

  target[lastKey] = value
}

/**
 * Раскрывает пути с подстановочными знаками типа 'contacts.*.email' для валидации массивов
 */
export function expandWildcardPaths(
  rules: Record<string, Rule<any>[]>,
  values: any
): Record<string, Rule<any>[]> {
  const expanded: Record<string, Rule<any>[]> = {}

  for (const [path, ruleArray] of Object.entries(rules)) {
    if (path.includes('*')) {
      const parts = path.split('.')
      const wildcardIndex = parts.indexOf('*')
      const arrayPath = parts.slice(0, wildcardIndex).join('.')
      const array = getNestedValue(values, arrayPath)

      if (Array.isArray(array)) {
        array.forEach((_, index) => {
          const expandedPath = parts
            .map(part => (part === '*' ? index.toString() : part))
            .join('.')
          expanded[expandedPath] = ruleArray
        })
      }
    } else {
      expanded[path] = ruleArray
    }
  }

  return expanded
}

/**
 * Создает дебаунсированную версию асинхронной функции
 * @template T - Тип функции
 * @param fn - Асинхронная функция для дебаунса
 * @param delay - Задержка дебаунса в миллисекундах
 * @returns Дебаунсированная функция, возвращающая промис
 */
export function debounce<T extends (..._args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): (..._args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let pendingReject: ((_reason: any) => void) | null = null

  return (..._args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    // Reject предыдущий висящий Promise, чтобы он не оставался pending навсегда
    if (pendingReject) {
      pendingReject(new DOMException('Debounce superseded', 'AbortError'))
      pendingReject = null
    }
    if (timeoutId) clearTimeout(timeoutId)

    return new Promise((resolve, reject) => {
      pendingReject = reject

      timeoutId = setTimeout(async () => {
        pendingReject = null
        try {
          const result = await fn(..._args)
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          timeoutId = null
        }
      }, delay)
    })
  }
}

/**
 * Глубокое сравнение двух значений с поддержкой File, Date и других типов
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (a === null || a === undefined || b === null || b === undefined) {
    return false
  }

  if (
    typeof File !== 'undefined' &&
    a instanceof File &&
    b instanceof File
  ) {
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

/**
 * Функция-помощник для типобезопасного определения правил
 * @template T - Тип значений формы
 * @returns Функция для определения типизированных правил валидации
 */
export function defineRules<T extends Record<string, any>>() {
  return <R extends Partial<{ [K in keyof T]: any }>>(rules: R) => rules
}

/**
 * Разрешает реактивное сообщение в строку
 * Поддерживает статические строки, refs, computed значения и геттеры
 */
export function resolveMessage(
  message: MaybeRefOrGetter<string> | undefined
): string | null {
  if (!message) return null
  const resolved = unref(message)
  return typeof resolved === 'function' ? resolved() : resolved
}

/**
 * Конвертирует FileList, File или File[] в массив File[]
 */
export function toFileArray(input: FileList | File[] | File | null): File[] {
  if (!input) return []

  if (typeof FileList !== 'undefined' && input instanceof FileList) {
    return Array.from(input)
  }

  if (Array.isArray(input)) {
    return input
  }

  if (typeof File !== 'undefined' && input instanceof File) {
    return [input]
  }

  return []
}

/**
 * Форматирует размер файла в читаемом для человека формате
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exp = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / Math.pow(1024, exp)

  return `${value.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`
}

/**
 * Создает обработчик события файлового input с автовалидацией
 */
export function createFileHandler<T extends Record<string, any>>(
  form: {
    values: T
    touch: (_field: string | number | symbol) => void
    validateField: (_field: string | number | symbol) => Promise<any> | void
  },
  field: keyof T
) {
  return (event: Event) => {
    const target = event.target as HTMLInputElement | null
    if (!target) return

    const currentValue = (form.values as any)[field]
    const isMultiple = target.multiple || Array.isArray(currentValue)

    if (isMultiple) {
      ;(form.values as any)[field] =
        target.files && target.files.length > 0
          ? Array.from(target.files)
          : null
    } else {
      ;(form.values as any)[field] = target.files?.[0] ?? null
    }

    form.touch(field as string)
    const result = form.validateField(field as string)
    if (result && typeof (result as Promise<any>).then === 'function') {
      void result
    }
  }
}
