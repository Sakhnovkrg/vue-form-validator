import type { MaybeRefOrGetter } from 'vue'
import type { Rule } from '../forms/types'
import { resolveMessage } from '../utils/helpers'

/**
 * Класс правил валидации массивов
 * Содержит правила для проверки длины массивов
 */
export class ArrayRules {
  /**
   * Правило минимальной длины массива
   * @param min - Минимальное количество элементов
   * @param msg - Сообщение об ошибке
   * @returns Правило валидации
   */
  arrayMinLength(min: number, msg?: MaybeRefOrGetter<string>): Rule<any[]> {
    return arr => {
      if (!Array.isArray(arr)) return null
      const message = resolveMessage(msg) || `Minimum ${min} items required`
      return arr.length >= min ? null : message
    }
  }

  /**
   * Ensures value is an array with at least one item
   * @param msg - Optional custom error message
   */
  arrayRequired(msg?: MaybeRefOrGetter<string>): Rule<any[]> {
    return arr => {
      if (!Array.isArray(arr) || arr.length === 0) {
        const errorMsg = resolveMessage(msg) || 'At least one item required'
        return errorMsg
      }
      return null
    }
  }

  /**
   * Правило максимальной длины массива
   * @param max - Максимальное количество элементов
   * @param msg - Сообщение об ошибке
   * @returns Правило валидации
   */
  arrayMaxLength(max: number, msg?: MaybeRefOrGetter<string>): Rule<any[]> {
    return arr => {
      if (!Array.isArray(arr)) return null
      const message = resolveMessage(msg) || `Maximum ${max} items allowed`
      return arr.length <= max ? null : message
    }
  }
}
