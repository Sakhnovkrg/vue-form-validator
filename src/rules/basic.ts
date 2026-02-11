import type { MaybeRefOrGetter } from 'vue'
import type { Rule } from '../forms/types'
import { resolveMessage } from '../utils/helpers'

/**
 * Правило обязательного поля
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function required(
  msg: MaybeRefOrGetter<string> = 'This field is required'
): Rule<any> {
  return v => {
    if (
      v === null ||
      v === undefined ||
      v === '' ||
      (Array.isArray(v) && v.length === 0)
    ) {
      const message = resolveMessage(msg) || 'This field is required'
      return message
    }
    return null
  }
}

/**
 * Правило минимальной длины строки
 * @param len - Минимальная длина
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function minLength(
  len: number,
  msg?: MaybeRefOrGetter<string>
): Rule<string> {
  if (len < 0) throw new Error('Minimum length cannot be negative')

  return v => {
    if (!v || String(v).length >= len) return null

    const message = resolveMessage(msg) || `Minimum ${len} characters`
    return message
  }
}

/**
 * Правило максимальной длины строки
 * @param len - Максимальная длина
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function maxLength(
  len: number,
  msg?: MaybeRefOrGetter<string>
): Rule<string> {
  if (len < 0) throw new Error('Maximum length cannot be negative')

  return v => {
    const message = resolveMessage(msg) || `Maximum ${len} characters`
    return !v || String(v).length <= len ? null : message
  }
}

/**
 * Правило валидации email адреса
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function email(
  msg: MaybeRefOrGetter<string> = 'Invalid email address'
): Rule<string> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return v => {
    const message = resolveMessage(msg)
    return !v || emailRegex.test(v) ? null : message
  }
}

/**
 * Правило проверки по регулярному выражению
 * @param pattern - Регулярное выражение
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function regex(
  pattern: RegExp,
  msg: MaybeRefOrGetter<string> = 'Invalid format'
): Rule<string> {
  // Убираем флаг g для предотвращения stateful lastIndex поведения
  const safePattern = pattern.global
    ? new RegExp(pattern.source, pattern.flags.replace('g', ''))
    : pattern

  return v => {
    const message = resolveMessage(msg)
    return !v || safePattern.test(v) ? null : message
  }
}

/**
 * Правило проверки числового значения
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function numeric(
  msg: MaybeRefOrGetter<string> = 'Only numbers are allowed'
): Rule<string | number> {
  return v => {
    if (v === null || v === undefined || v === '') return null
    const message = resolveMessage(msg)
    return /^-?\d*\.?\d+$/.test(String(v)) ? null : message
  }
}

/**
 * Правило проверки значения в диапазоне
 * @param min - Минимальное значение
 * @param max - Максимальное значение
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function between(
  min: number,
  max: number,
  msg?: MaybeRefOrGetter<string>
): Rule<string | number> {
  if (min > max)
    throw new Error('Minimum value cannot be greater than maximum value')

  return v => {
    if (v === null || v === undefined || v === '') return null
    const num = Number(v)
    const message =
      resolveMessage(msg) || `Value must be between ${min} and ${max}`
    return !isNaN(num) && num >= min && num <= max ? null : message
  }
}

/**
 * Правило проверки значения из списка
 * @param list - Допустимые значения
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function oneOf(
  list: any[],
  msg: MaybeRefOrGetter<string> = 'Invalid value'
): Rule<any> {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('oneOf requires a non-empty array')
  }

  return v => {
    if (v === null || v === undefined || v === '') return null
    const message = resolveMessage(msg)
    return list.includes(v) ? null : message
  }
}

/**
 * Правило минимального числового значения
 * @param min - Минимальное значение
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function minValue(
  min: number,
  msg?: MaybeRefOrGetter<string>
): Rule<string | number> {
  return v => {
    if (v === null || v === undefined || v === '') return null
    const num = Number(v)
    const message = resolveMessage(msg) || `Minimum value: ${min}`
    return !isNaN(num) && num >= min ? null : message
  }
}

/**
 * Правило максимального числового значения
 * @param max - Максимальное значение
 * @param msg - Сообщение об ошибке
 * @returns Правило валидации
 */
export function maxValue(
  max: number,
  msg?: MaybeRefOrGetter<string>
): Rule<string | number> {
  return v => {
    if (v === null || v === undefined || v === '') return null
    const num = Number(v)
    const message = resolveMessage(msg) || `Maximum value: ${max}`
    return !isNaN(num) && num <= max ? null : message
  }
}
