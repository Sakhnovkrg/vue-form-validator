import type { MaybeRefOrGetter } from 'vue'
import type { Rule, RuleMeta, CrossFieldRule } from '../forms/types'
import { debounce } from '../utils/debounce'
import { resolveMessage } from '../utils/helpers'
import { getNestedValue, resolveWildcard } from '../utils/nested'

/**
 * Правило условной обязательности
 * Поле становится обязательным, если другое поле имеет определенное значение
 * @param conditionField - Имя поля-условия
 * @param conditionValue - Значение, при котором поле становится обязательным
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function requiredIf(
  conditionField: string,
  conditionValue: any,
  msg: MaybeRefOrGetter<string> = 'This field is required'
): Rule<any> {
  const rule: Rule<any> = (
    v: any,
    formValues?: Record<string, any>,
    meta?: RuleMeta
  ) => {
    if (!formValues) return null
    const resolved = meta?.fieldPath
      ? resolveWildcard(conditionField, meta.fieldPath)
      : conditionField
    const shouldBeRequired =
      getNestedValue(formValues, resolved) === conditionValue

    if (!shouldBeRequired) return null

    const message = resolveMessage(msg)
    if (v === null || v === undefined || v === '') return message
    if (Array.isArray(v) && v.length === 0) return message

    return null
  }

  ;(rule as any).__crossField = {
    dependsOn: [conditionField],
  }
  ;(rule as any).__requiredIf = {
    conditionField,
    conditionValue,
  }

  return rule
}

/**
 * Правило удаленной асинхронной валидации
 * Позволяет проверять значения на сервере с дебаунсом
 * @param checkFn - Асинхронная функция проверки, возвращает true если значение валидно
 * @param msg - Сообщение об ошибке
 * @param delay - Задержка дебаунса в миллисекундах (по умолчанию 400)
 * @returns Правило валидации
 */
export function remote(
  checkFn: (_value: any) => Promise<boolean>,
  msg: MaybeRefOrGetter<string> = 'Value is not allowed',
  delay = 400
): Rule<any> {
  const debounced = debounce(checkFn, delay)
  return async v => {
    if (v === null || v === undefined || v === '') return null
    const message = resolveMessage(msg)
    try {
      const isOk = await debounced(v)
      return isOk ? null : message
    } catch {
      // При ошибке сети/сервера пропускаем валидацию (не блокируем пользователя)
      return null
    }
  }
}

/**
 * Правило пользовательской валидации
 * Позволяет создавать произвольные правила с доступом к всем значениям формы
 * @param validator - Функция валидации, получает значение и все значения формы
 * @param msg - Сообщение об ошибке (используется только если validator возвращает false)
 * @returns Правило валидации
 */
export function custom(
  validator: (
    _value: any,
    _values: Record<string, any>
  ) => boolean | string | Promise<boolean | string>,
  msg?: MaybeRefOrGetter<string>
): Rule<any> {
  const resolve = (result: boolean | string): string | null => {
    if (typeof result === 'string') return result
    if (result === true) return null
    return resolveMessage(msg) || 'Validation failed'
  }

  return (v, formValues) => {
    const result = validator(v, formValues || {})

    // Если результат - промис, обрабатываем асинхронно
    if (result && typeof (result as any).then === 'function') {
      return (result as Promise<boolean | string>).then(resolve)
    }

    // Синхронный результат
    return resolve(result as boolean | string)
  }
}

/**
 * Правило совпадения с другим полем
 * Полезно для подтверждения пароля или email
 * @param fieldName - Имя поля, с которым должно совпадать значение
 * @param msg - Сообщение об ошибке
 * @returns Правило кросс-валидации
 */
export function sameAs(
  fieldName: string,
  msg?: MaybeRefOrGetter<string>
): CrossFieldRule<any> {
  const rule = (v: any, formValues?: Record<string, any>, meta?: RuleMeta) => {
    if (!formValues) return null
    const resolved = meta?.fieldPath
      ? resolveWildcard(fieldName, meta.fieldPath)
      : fieldName
    const otherValue = getNestedValue(formValues, resolved)
    const isEmpty = (val: any) =>
      val === null || val === undefined || val === ''
    if (isEmpty(v) && isEmpty(otherValue)) return null
    const message = resolveMessage(msg) || `Must match ${fieldName} field`
    return v === otherValue ? null : message
  }

  const crossFieldRule = rule as unknown as CrossFieldRule<any>
  crossFieldRule.__crossField = {
    dependsOn: [fieldName],
  }

  return crossFieldRule
}

/**
 * Правило проверки что дата позже даты в другом поле
 * Полезно для проверки диапазонов дат (начало - конец)
 * @param startDateField - Имя поля с начальной датой
 * @param msg - Сообщение об ошибке
 * @returns Правило кросс-валидации
 */
export function dateAfter(
  startDateField: string,
  msg?: MaybeRefOrGetter<string>
): CrossFieldRule<string> {
  const rule = (
    v: string,
    formValues?: Record<string, any>,
    meta?: RuleMeta
  ) => {
    if (!formValues) return null
    const resolved = meta?.fieldPath
      ? resolveWildcard(startDateField, meta.fieldPath)
      : startDateField
    const startDateValue = getNestedValue(formValues, resolved)
    if (!v || !startDateValue) return null

    const startDate = new Date(startDateValue)
    const endDate = new Date(v)
    const message =
      resolveMessage(msg) || `Date must be after ${startDateField}`

    return endDate > startDate ? null : message
  }

  const crossFieldRule = rule as unknown as CrossFieldRule<string>
  crossFieldRule.__crossField = {
    dependsOn: [startDateField],
  }

  return crossFieldRule
}
