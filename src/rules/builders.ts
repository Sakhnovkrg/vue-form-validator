import {
  required,
  minLength,
  maxLength,
  email,
  regex,
  numeric,
  between,
  oneOf,
  minValue,
  maxValue,
} from './basic'
import { fileRequired, fileSize, fileType, fileCount } from './file'
import { arrayMinLength, arrayRequired, arrayMaxLength } from './array'
import { remote, custom, sameAs, dateAfter, requiredIf } from './advanced'
import type { Rule, RuleChain } from '../forms/types'

/**
 * Карта всех доступных фабрик правил валидации
 */
type FactoryMap = {
  required: typeof required
  minLength: typeof minLength
  maxLength: typeof maxLength
  email: typeof email
  regex: typeof regex
  numeric: typeof numeric
  between: typeof between
  oneOf: typeof oneOf
  minValue: typeof minValue
  maxValue: typeof maxValue
  fileRequired: typeof fileRequired
  fileSize: typeof fileSize
  fileType: typeof fileType
  fileCount: typeof fileCount
  remote: typeof remote
  custom: typeof custom
  sameAs: typeof sameAs
  dateAfter: typeof dateAfter
  requiredIf: typeof requiredIf
  arrayMinLength: typeof arrayMinLength
  arrayRequired: typeof arrayRequired
  arrayMaxLength: typeof arrayMaxLength
}

/**
 * Тип результата цепочки правил
 * Преобразует фабрику правил в цепочку правил
 */
type ChainResult<F> = F extends (..._args: any[]) => Rule<infer T>
  ? RuleChain<T>
  : never

/**
 * Тип цепочечных правил
 * Преобразует каждую фабрику в цепочку правил
 */
type ChainableRules = {
  [K in keyof FactoryMap]: (
    ..._args: Parameters<FactoryMap[K]>
  ) => ChainResult<FactoryMap[K]>
}

/**
 * Оборачивает правило в цепочку правил
 * Создает Proxy для реализации цепочек методов
 * @param factories - Карта фабрик правил
 * @param initialRule - Начальное правило
 * @returns Цепочка правил
 */
function wrapRule<T>(
  factories: FactoryMap,
  initialRule: Rule<T>
): RuleChain<T> {
  const rules: Rule<any>[] = [initialRule]
  const seen = new Set<Rule<any>>(rules)

  const append = (
    input:
      | Rule<any>
      | RuleChain<any>
      | Array<Rule<any> | RuleChain<any>>
      | undefined
  ): void => {
    if (!input) return
    if (Array.isArray(input)) {
      input.forEach(item => append(item))
      return
    }
    if (typeof input === 'function') {
      const maybeChain = input as RuleChain<any>
      const chainRules = (maybeChain as any).__rules
      if (Array.isArray(chainRules)) {
        chainRules.forEach(rule => append(rule))
      } else if (!seen.has(input)) {
        seen.add(input)
        rules.push(input)
      }
    }
  }

  const chained = ((value: T, values?: Record<string, any>) =>
    initialRule(value, values)) as RuleChain<T>

  const handler: ProxyHandler<RuleChain<T>> = {
    apply(target, thisArg, argArray) {
      return Reflect.apply(target, thisArg, argArray)
    },
    get(_target, prop, receiver) {
      if (prop === '__rules') {
        return rules
      }
      if (prop === 'build' || prop === 'toArray' || prop === 'valueOf') {
        return () => [...rules]
      }
      if (prop === Symbol.iterator) {
        return rules[Symbol.iterator].bind(rules)
      }
      if (prop === 'and') {
        return (
          ...extras: Array<
            | Rule<any>
            | RuleChain<any>
            | Array<Rule<any> | RuleChain<any>>
            | undefined
          >
        ) => {
          extras.forEach(extra => append(extra))
          return receiver as RuleChain<any>
        }
      }
      if (typeof prop === 'string') {
        const key = prop as keyof FactoryMap
        const factory = factories[key]
        if (factory) {
          return ((..._args: any[]) => {
            const nextRule = (factory as (..._args: any[]) => Rule<any>)(
              ..._args
            )
            append(nextRule)
            return receiver as RuleChain<any>
          }) as ChainableRules[typeof key]
        }
      }
      const value = Reflect.get(chained, prop, receiver)
      return typeof value === 'function' ? value.bind(chained) : value
    },
  }

  return new Proxy(chained, handler)
}

/**
 * Тип строителя правил
 * Предоставляет все доступные методы создания цепочек правил
 */
export type RulesBuilder = ChainableRules

/**
 * Создает строителя правил валидации
 * Фабрика для создания всех типов правил валидации
 * @returns Объект с методами создания цепочек правил
 */
export function createRules(): RulesBuilder {
  const factories: FactoryMap = {
    required,
    minLength,
    maxLength,
    email,
    regex,
    numeric,
    between,
    oneOf,
    minValue,
    maxValue,
    fileRequired,
    fileSize,
    fileType,
    fileCount,
    arrayMinLength,
    arrayRequired,
    arrayMaxLength,
    remote,
    custom,
    sameAs,
    dateAfter,
    requiredIf,
  }

  return new Proxy({} as ChainableRules, {
    get(_target, prop) {
      if (typeof prop !== 'string') {
        return undefined
      }
      const key = prop as keyof FactoryMap
      const factory = factories[key]
      if (!factory) {
        return undefined
      }
      return ((..._args: any[]) => {
        const rule = (factory as (..._args: any[]) => Rule<any>)(..._args)
        return wrapRule(factories, rule)
      }) as ChainableRules[typeof key]
    },
  })
}
