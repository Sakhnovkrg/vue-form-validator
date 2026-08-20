import { unref, type MaybeRefOrGetter } from 'vue'

// Re-export from split modules for backwards compatibility
export { getNestedValue, setNestedValue, expandWildcardPaths } from './nested'
export { deepEqual, deepClone } from './deep'
export { debounce } from './debounce'

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
  // unref() only unwraps Ref, not getter functions — use typeof check for getters
  const resolved = unref(message)
  return typeof resolved === 'function' ? resolved() : resolved
}

/**
 * Разрешает реактивный параметр правила в значение
 *
 * `toValue()` из Vue сделал бы то же самое, но появился только в 3.3, а пакет
 * заявляет peer `vue ^3.0.0`. Поэтому тот же приём, что и в `resolveMessage`:
 * `unref()` разворачивает ref, геттер вызываем сами
 */
export function resolveParam<T>(value: MaybeRefOrGetter<T>): T {
  const resolved = unref(value as any)
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
  if (bytes <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exp = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )
  const value = bytes / Math.pow(1024, exp)

  return `${value.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`
}
