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
      // Для последнего промежуточного ключа проверяем lastKey, а не следующий в keys
      const nextKey = index < keys.length - 1 ? keys[index + 1] : lastKey
      current[key] = nextKey && /^\d+$/.test(nextKey) ? [] : {}
    }
    return current[key]
  }, obj)

  target[lastKey] = value
}

/**
 * Резолвит wildcard в пути, подставляя индекс из конкретного пути.
 * resolveWildcard('contacts.*.email', 'contacts.0.confirmEmail') → 'contacts.0.email'
 */
export function resolveWildcard(
  wildcardPath: string,
  concretePath: string
): string {
  if (!wildcardPath.includes('*')) return wildcardPath
  const concrete = concretePath.split('.')
  return wildcardPath
    .split('.')
    .map((part, i) => (part === '*' && concrete[i] ? concrete[i] : part))
    .join('.')
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
