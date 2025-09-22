import type { MaybeRefOrGetter } from 'vue'
import type { Rule, CrossFieldRule } from '../forms/types'
import { debounce, resolveMessage } from '../utils/helpers'

/**
 * Класс продвинутых правил валидации
 * Содержит сложные правила: асинхронная валидация, кросс-поля, пользовательские правила
 */
export class AdvancedRules {
  /**
   * Правило условной обязательности
   * Поле становится обязательным, если другое поле имеет определенное значение
   * @param conditionField - Имя поля-условия
   * @param conditionValue - Значение, при котором поле становится обязательным
   * @param msg - Сообщение об ошибке
   * @returns Правило валидации
   */
  requiredIf(
    conditionField: string,
    conditionValue: any,
    msg: MaybeRefOrGetter<string> = 'This field is required'
  ): Rule<any> {
    const rule: Rule<any> = async (
      v: any,
      formValues?: Record<string, any>
    ) => {
      if (!formValues) return null

      const shouldBeRequired = formValues[conditionField] === conditionValue

      if (!shouldBeRequired) return null

      const message = resolveMessage(msg)
      if (v === null || v === undefined || v === '') return message
      if (Array.isArray(v) && v.length === 0) return message

      return null
    }

    ;(rule as any).__crossField = {
      dependsOn: [conditionField],
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
  remote(
    checkFn: (_value: any) => Promise<boolean>,
    msg: MaybeRefOrGetter<string> = 'Value is not allowed',
    delay = 400
  ): Rule<any> {
    const debounced = debounce(checkFn, delay)
    return async v => {
      if (!v) return null
      const message = resolveMessage(msg)
      const isOk = await debounced(v)
      return isOk ? null : message
    }
  }

  /**
   * Правило пользовательской валидации
   * Позволяет создавать произвольные правила с доступом к всем значениям формы
   * @param validator - Функция валидации, получает значение и все значения формы
   * @param msg - Сообщение об ошибке (используется только если validator возвращает false)
   * @returns Правило валидации
   */
  custom(
    validator: (
      _value: any,
      _values: Record<string, any>
    ) => boolean | string | Promise<boolean | string>,
    msg?: MaybeRefOrGetter<string>
  ): Rule<any> {
    return async (v, formValues) => {
      const result = await Promise.resolve(validator(v, formValues || {}))

      // Если результат - строка, используем её как сообщение об ошибке
      if (typeof result === 'string') {
        return result
      }

      // Если результат true - валидация прошла
      if (result === true) {
        return null
      }

      // Если результат false - используем переданное сообщение или дефолтное
      const message = resolveMessage(msg) || 'Validation failed'
      return message
    }
  }

  /**
   * Правило совпадения с другим полем
   * Полезно для подтверждения пароля или email
   * @param fieldName - Имя поля, с которым должно совпадать значение
   * @param msg - Сообщение об ошибке
   * @returns Правило кросс-валидации
   */
  sameAs(
    fieldName: string,
    msg?: MaybeRefOrGetter<string>
  ): CrossFieldRule<any> {
    const rule = async (v: any, formValues?: Record<string, any>) => {
      if (!formValues) return null
      if (!v && !formValues[fieldName]) return null
      const message = resolveMessage(msg) || `Must match ${fieldName} field`
      return v === formValues[fieldName] ? null : message
    }

    const crossFieldRule = rule as CrossFieldRule<any>
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
  dateAfter(
    startDateField: string,
    msg?: MaybeRefOrGetter<string>
  ): CrossFieldRule<string> {
    const rule = async (v: string, formValues?: Record<string, any>) => {
      if (!formValues) return null
      if (!v || !formValues[startDateField]) return null

      const startDate = new Date(formValues[startDateField])
      const endDate = new Date(v)
      const message =
        resolveMessage(msg) || `Date must be after ${startDateField}`

      return endDate > startDate ? null : message
    }

    const crossFieldRule = rule as CrossFieldRule<string>
    crossFieldRule.__crossField = {
      dependsOn: [startDateField],
    }

    return crossFieldRule
  }
}
