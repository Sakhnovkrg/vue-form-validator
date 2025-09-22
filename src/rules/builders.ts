import { BasicRules } from './basic'
import { FileRules } from './file'
import { ArrayRules } from './array'
import { AdvancedRules } from './advanced'
import type { Rule, RuleChain } from '../forms/types'

/**
 * Карта всех доступных фабрик правил валидации
 */
type FactoryMap = {
  required: BasicRules['required']
  minLength: BasicRules['minLength']
  maxLength: BasicRules['maxLength']
  email: BasicRules['email']
  regex: BasicRules['regex']
  numeric: BasicRules['numeric']
  between: BasicRules['between']
  oneOf: BasicRules['oneOf']
  minValue: BasicRules['minValue']
  maxValue: BasicRules['maxValue']
  fileRequired: FileRules['fileRequired']
  fileSize: FileRules['fileSize']
  fileType: FileRules['fileType']
  fileCount: FileRules['fileCount']
  remote: AdvancedRules['remote']
  custom: AdvancedRules['custom']
  sameAs: AdvancedRules['sameAs']
  dateAfter: AdvancedRules['dateAfter']
  requiredIf: AdvancedRules['requiredIf']
  arrayMinLength: ArrayRules['arrayMinLength']
  arrayRequired: ArrayRules['arrayRequired']
  arrayMaxLength: ArrayRules['arrayMaxLength']
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
  const basic = new BasicRules()
  const file = new FileRules()
  const array = new ArrayRules()
  const advanced = new AdvancedRules()

  const factories: FactoryMap = {
    required: basic.required.bind(basic),
    minLength: basic.minLength.bind(basic),
    maxLength: basic.maxLength.bind(basic),
    email: basic.email.bind(basic),
    regex: basic.regex.bind(basic),
    numeric: basic.numeric.bind(basic),
    between: basic.between.bind(basic),
    oneOf: basic.oneOf.bind(basic),
    minValue: basic.minValue.bind(basic),
    maxValue: basic.maxValue.bind(basic),
    fileRequired: file.fileRequired.bind(file),
    fileSize: file.fileSize.bind(file),
    fileType: file.fileType.bind(file),
    fileCount: file.fileCount.bind(file),
    arrayMinLength: array.arrayMinLength.bind(array),
    arrayRequired: array.arrayRequired.bind(array),
    arrayMaxLength: array.arrayMaxLength.bind(array),
    remote: advanced.remote.bind(advanced),
    custom: advanced.custom.bind(advanced),
    sameAs: advanced.sameAs.bind(advanced),
    dateAfter: advanced.dateAfter.bind(advanced),
    requiredIf: advanced.requiredIf.bind(advanced),
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
